import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../state/useAppStore';
import { MockTranslationProvider } from '../services/translation/MockTranslationProvider';
import { WebSocketTranslationProvider } from '../services/translation/WebSocketTranslationProvider';
import type { ITranslationProvider } from '../services/translation/ITranslationProvider';
import type { ExtractedFrameData } from './useMediaPipe';
import type { FrameLandmarks } from '../types';

export function useTranslationEngine() {
  const providerRef = useRef<ITranslationProvider | null>(null);

  const {
    isTranslating,
    mode,
    serverUrl,
    setConnectionStatus,
    receivePrediction,
    setTranslating,
    ttsEnabled,
    targetLanguage,
  } = useAppStore();

  // ── Provider Lifecycle ──────────────────────────────────────────────────
  // Instantiate & manage provider based on active mode.
  // Teardown previous provider on mode / serverUrl / language change.
  useEffect(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }

    let provider: ITranslationProvider;

    if (mode === 'LIVE_WEBSOCKET') {
      console.log(`[TranslationEngine] Activating Live FastAPI WebSocket Engine: ${serverUrl}`);
      provider = new WebSocketTranslationProvider(serverUrl, targetLanguage);
    } else {
      console.log('[TranslationEngine] Activating Local Deterministic Mock Engine');
      provider = new MockTranslationProvider();
    }

    providerRef.current = provider;

    provider.onPrediction((pred) => {
      receivePrediction(pred);

      // Web Speech Synthesis TTS
      if (ttsEnabled && 'speechSynthesis' in window && pred.translatedText) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(pred.translatedText);
        utterance.lang = targetLanguage;
        window.speechSynthesis.speak(utterance);
      }
    });

    provider.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    provider.connect();

    return () => {
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current = null;
      }
    };
  }, [mode, serverUrl, receivePrediction, setConnectionStatus, targetLanguage, ttsEnabled]);

  // ── Frame Transmission ──────────────────────────────────────────────────
  // The provider's sendFrame() already owns the monotonic frameId counter and
  // the rate-limiting + config-before-frames guard. This hook passes only the
  // raw landmark payload; frameId is intentionally omitted here because
  // WebSocketTranslationProvider assigns it internally.
  const sendLandmarkFrame = useCallback(
    (frame: ExtractedFrameData) => {
      // Session Lifecycle Rule: only transmit when translation is ACTIVE.
      if (!providerRef.current || !isTranslating) return;

      const payload: FrameLandmarks = {
        frameId: 0, // Placeholder – overwritten by the provider's internal counter
        timestamp: frame.timestamp,
        leftHand: frame.normalizedLeftHand,
        rightHand: frame.normalizedRightHand,
      };

      providerRef.current.sendFrame(payload);
    },
    [isTranslating]
  );

  // ── Session Toggle ──────────────────────────────────────────────────────
  // When starting: generate a new sessionId, reset the monotonic frame counter,
  //   and ensure a config message is sent to the backend BEFORE any frames.
  // When stopping: immediately gate sendFrame() without tearing down the socket.
  const toggleSession = useCallback(() => {
    const nextState = !isTranslating;
    setTranslating(nextState);

    const provider = providerRef.current;
    if (!provider) return;

    if (nextState) {
      // stopped → active
      provider.startSession?.();
    } else {
      // active → stopped
      provider.stopSession?.();
    }
  }, [isTranslating, setTranslating]);

  // ── Demo Gesture Trigger (Mock provider only) ───────────────────────────
  const triggerManualDemoGesture = useCallback((gloss: string, text: string) => {
    if (providerRef.current?.triggerMockGesture) {
      providerRef.current.triggerMockGesture(gloss, text);
    }
  }, []);

  return {
    sendLandmarkFrame,
    toggleSession,
    triggerManualDemoGesture,
  };
}
