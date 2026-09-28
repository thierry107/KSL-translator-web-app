import type { ITranslationProvider } from './ITranslationProvider';
import type { FrameLandmarks, PredictionResult, ConnectionStatus } from '../../types';
import type { ClientWebSocketMessage, ServerWebSocketMessage } from '../../websocket/protocol';

export class WebSocketTranslationProvider implements ITranslationProvider {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private sessionId: string;
  private targetLanguage: string;

  private predictionCallback: ((pred: PredictionResult) => void) | null = null;
  private errorCallback: ((err: string) => void) | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;

  // Reconnection & Heartbeat Management
  private isIntentionallyClosed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private lastPingTime = 0;
  private lastPongTime = 0;

  // Session State
  //
  // isSessionActive: true only after startSession() is called and the config
  //   message for the current sessionId has been flushed to the socket.
  //   sendFrame() is a no-op while this is false.
  //
  // frameCounter: monotonic per-session counter. Resets to 0 on every
  //   startSession() call.  Never derived from wall-clock time.
  //
  // configSent: prevents a second config message being sent if startSession()
  //   is called while the socket is already open and a session is in progress.
  private isSessionActive = false;
  private frameCounter = 0;
  private configSent = false;

  constructor(
    serverUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/api/v1/translate/ws',
    targetLanguage = 'en-US'
  ) {
    this.serverUrl = serverUrl;
    this.targetLanguage = targetLanguage;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  public setServerUrl(url: string) {
    this.serverUrl = url;
  }

  // ─── Session Lifecycle ────────────────────────────────────────────────────

  /**
   * Marks the start of a new translation session.
   *
   * Behaviour:
   * - Generates a brand-new sessionId so the backend can unambiguously
   *   distinguish this session from any previous one.
   * - Resets the monotonic frameCounter to 0.
   * - Sends a `config` message to the backend BEFORE any landmark frames
   *   are allowed through.  If the socket is not yet open the config will
   *   be sent inside handleOpen() once the connection is established.
   * - Sets isSessionActive = true only after the config is sent (or queued).
   */
  startSession(): void {
    // Fresh session identity – backend will see a new sessionId.
    this.sessionId = this.generateSessionId();
    this.frameCounter = 0;
    this.configSent = false;

    console.log(`[WebSocketProvider] Starting new session: ${this.sessionId}`);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendConfigMessage();
    }
    // If socket is not yet open, handleOpen() will call sendConfigMessage()
    // and then set isSessionActive = true there.

    this.isSessionActive = true;
  }

  /**
   * Halts landmark transmission for the current session.
   * The WebSocket connection itself is kept alive (keepalive reconnects, etc.).
   * A subsequent startSession() call will open a new session with a fresh ID.
   */
  stopSession(): void {
    console.log(`[WebSocketProvider] Stopping session: ${this.sessionId}`);
    this.isSessionActive = false;
    this.configSent = false;
  }

  // ─── ITranslationProvider ─────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.statusCallback?.(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      console.log(`[WebSocketProvider] Connecting to FastAPI backend: ${this.serverUrl}`);
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (err: any) {
      console.error('[WebSocketProvider] WebSocket instantiation error:', err);
      this.handleError(err);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.isSessionActive = false;
    this.configSent = false;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client session ended');
      this.ws = null;
    }

    this.statusCallback?.('DISCONNECTED');
    console.log('[WebSocketProvider] Connection closed cleanly.');
  }

  onPrediction(callback: (pred: PredictionResult) => void): void {
    this.predictionCallback = callback;
  }

  onError(callback: (err: string) => void): void {
    this.errorCallback = callback;
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Transmits normalized 3D hand keypoints payload over WebSocket.
   *
   * STRICT PRIVACY GUARANTEE: Raw video frames are NEVER transmitted.
   *
   * Guards:
   * 1. Socket must be OPEN.
   * 2. A translation session must be active (startSession() was called).
   * 3. The config message for the current sessionId must have been sent first
   *    (configSent === true), ensuring the backend always receives the
   *    session/config handshake before any landmark frames for that session.
   * 4. Each frame is transmitted AT MOST ONCE (no duplicate delivery).
   */
  sendFrame(landmarks: FrameLandmarks): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.isSessionActive) return;
    if (!this.configSent) return; // Config must precede any landmark frame

    const payload: ClientWebSocketMessage = {
      type: 'landmarks',
      sessionId: this.sessionId,
      // Monotonic per-session counter – never derived from wall-clock time.
      frameId: this.frameCounter++,
      timestamp: landmarks.timestamp,
      data: {
        leftHand: landmarks.leftHand,
        rightHand: landmarks.rightHand,
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      console.warn('[WebSocketProvider] Failed to send landmark frame:', err);
    }
  }

  // ─── Socket Lifecycle Handlers ────────────────────────────────────────────

  private handleOpen() {
    console.log('[WebSocketProvider] WebSocket Connection Established.');
    this.reconnectAttempts = 0;
    this.statusCallback?.('CONNECTED');

    // If a session was started before the socket finished opening, send the
    // queued config now so the backend gets session context before any frames.
    if (this.isSessionActive && !this.configSent) {
      this.sendConfigMessage();
    }

    // Start 10-second Ping-Pong Keepalive & Heartbeat monitor
    this.startHeartbeat();
  }

  /**
   * Sends the session config handshake and marks configSent = true.
   * Called exactly once per session, before the first landmark frame.
   */
  private sendConfigMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const configMsg: ClientWebSocketMessage = {
      type: 'config',
      sessionId: this.sessionId,
      targetLanguage: this.targetLanguage,
      fps: 25,
    };

    this.ws.send(JSON.stringify(configMsg));
    this.configSent = true;
    console.log(`[WebSocketProvider] Config sent for session ${this.sessionId}`);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const msg: ServerWebSocketMessage = JSON.parse(event.data);

      if (msg.type === 'prediction') {
        const result: PredictionResult = {
          id: `ws_pred_${msg.timestamp}_${Math.random().toString(36).substr(2, 4)}`,
          gloss: msg.payload.gloss,
          translatedText: msg.payload.translatedText,
          confidence: msg.payload.confidence,
          timestamp: msg.timestamp,
        };

        this.predictionCallback?.(result);
      } else if (msg.type === 'pong') {
        // Record active pong timestamp for unresponsiveness verification
        this.lastPongTime = Date.now();
      } else if (msg.type === 'error') {
        console.error('[WebSocketProvider] Server reported error:', msg.message);
        this.errorCallback?.(msg.message);
      }
    } catch (err) {
      console.warn('[WebSocketProvider] Malformed message received:', event.data);
    }
  }

  private handleError(event: Event) {
    console.warn('[WebSocketProvider] WebSocket error detected:', event);
    this.errorCallback?.('WebSocket connection error');
  }

  private handleClose(event: CloseEvent) {
    this.stopHeartbeat();
    this.configSent = false; // Config must be re-sent on the next connection

    if (!this.isIntentionallyClosed) {
      console.warn(`[WebSocketProvider] Socket closed unexpectedly (code ${event.code}).`);
      this.scheduleReconnect();
    } else {
      this.statusCallback?.('DISCONNECTED');
    }
  }

  // ─── Heartbeat & Unresponsive Socket Detection ───────────────────────────

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPingTime = Date.now();
    this.lastPongTime = Date.now();

    this.pingIntervalTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const now = Date.now();

      // Check if previous ping went un-responded for over 6 seconds (Dead connection)
      if (this.lastPingTime > 0 && this.lastPongTime < this.lastPingTime && now - this.lastPingTime > 6000) {
        console.warn('[WebSocketProvider] Heartbeat timeout: No pong received from server within 6s. Closing dead socket...');
        this.ws.close(); // Triggers handleClose -> scheduleReconnect
        return;
      }

      this.lastPingTime = now;
      const pingMsg: ClientWebSocketMessage = {
        type: 'ping',
        timestamp: now,
      };
      this.ws.send(JSON.stringify(pingMsg));
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.isIntentionallyClosed) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketProvider] Max reconnect retries reached.');
      this.statusCallback?.('DISCONNECTED');
      this.errorCallback?.('Unable to connect to FastAPI WebSocket backend.');
      return;
    }

    this.reconnectAttempts += 1;
    const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
    console.log(`[WebSocketProvider] Reconnecting in ${backoffDelay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.statusCallback?.('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, backoffDelay);
  }
}
