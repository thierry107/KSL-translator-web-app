import type { ITranslationProvider } from './ITranslationProvider';
import type { FrameLandmarks, PredictionResult, ConnectionStatus, LandmarkPoint } from '../../types';

export class MockTranslationProvider implements ITranslationProvider {
  private predictionCallback: ((pred: PredictionResult) => void) | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;

  private isConnected = false;
  private lastTriggerTime = 0;
  private lastRecognizedGloss = '';
  private gestureHoldCounter = 0;

  async connect(): Promise<void> {
    this.isConnected = true;
    console.log('[MockProvider] Deterministic Mock Engine Connected.');
    this.statusCallback?.('MOCK_MODE');
  }

  disconnect(): void {
    this.isConnected = false;
    console.log('[MockProvider] Deterministic Mock Engine Disconnected.');
    this.statusCallback?.('DISCONNECTED');
  }

  onPrediction(callback: (pred: PredictionResult) => void): void {
    this.predictionCallback = callback;
  }

  onError(_callback: (err: string) => void): void {
    // Mock provider does not generate runtime errors
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallback = callback;
    if (this.isConnected) {
      callback('MOCK_MODE');
    }
  }

  /**
   * Deterministically analyzes incoming 3D hand keypoints.
   * Fires predictions only when specific physical hand gestures are held stably.
   */
  sendFrame(landmarks: FrameLandmarks): void {
    if (!this.isConnected) return;

    const hand = landmarks.rightHand.length > 0 ? landmarks.rightHand : landmarks.leftHand;
    if (!hand || hand.length < 21) {
      this.gestureHoldCounter = 0;
      this.lastRecognizedGloss = '';
      return;
    }

    const now = Date.now();
    if (now - this.lastTriggerTime < 1200) {
      // Cooldown interval between distinct gesture triggers
      return;
    }

    const detectedGloss = detectHeuristicGesture(hand);
    if (!detectedGloss) {
      this.gestureHoldCounter = 0;
      return;
    }

    if (detectedGloss === this.lastRecognizedGloss) {
      this.gestureHoldCounter += 1;
    } else {
      this.lastRecognizedGloss = detectedGloss;
      this.gestureHoldCounter = 1;
    }

    // Require holding gesture across 5 consecutive frames (~200ms) for stability
    if (this.gestureHoldCounter >= 5) {
      this.lastTriggerTime = now;
      this.gestureHoldCounter = 0;

      const predictionMap: Record<string, { text: string; confidence: number }> = {
        'HELLO': { text: 'Hello!', confidence: 0.95 },
        'YES': { text: 'Yes', confidence: 0.92 },
        'PEACE': { text: 'Peace', confidence: 0.94 },
        'THANK YOU': { text: 'Thank you', confidence: 0.91 },
      };

      const meta = predictionMap[detectedGloss] || { text: detectedGloss.toLowerCase(), confidence: 0.90 };

      const result: PredictionResult = {
        id: `pred_${now}_${Math.random().toString(36).substr(2, 4)}`,
        gloss: detectedGloss,
        translatedText: meta.text,
        confidence: meta.confidence,
        timestamp: now,
      };

      console.log('[MockProvider] Deterministic Gesture Matched:', result);
      this.predictionCallback?.(result);
    }
  }

  /**
   * Controlled Manual Trigger for Reliable Presentation Demos
   */
  triggerMockGesture(gloss: string, text: string): void {
    if (!this.isConnected) return;

    const result: PredictionResult = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      gloss: gloss.toUpperCase(),
      translatedText: text,
      confidence: 0.96,
      timestamp: Date.now(),
    };

    console.log('[MockProvider] Manual Demo Trigger Fired:', result);
    this.predictionCallback?.(result);
  }
}

/**
 * Rotation-independent Euclidean distance calculation between 3D landmark points
 */
function dist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Deterministic Heuristic Hand Gesture Matcher based on 21 keypoints
 */
function detectHeuristicGesture(pts: LandmarkPoint[]): string | null {
  const wrist = pts[0];

  // Rotation-independent finger extension checks: compare fingertip dist from wrist vs PIP dist from wrist
  const isThumbExtended = dist(pts[4], wrist) > dist(pts[3], wrist);
  const isIndexExtended = dist(pts[8], wrist) > dist(pts[6], wrist);
  const isMiddleExtended = dist(pts[12], wrist) > dist(pts[10], wrist);
  const isRingExtended = dist(pts[16], wrist) > dist(pts[14], wrist);
  const isPinkyExtended = dist(pts[20], wrist) > dist(pts[18], wrist);

  // 1. Open Palm / Wave (All 4 fingers extended)
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
    return 'HELLO';
  }

  // 2. Thumbs Up (Thumb extended, index/middle/ring/pinky folded)
  if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'YES';
  }

  // 3. Victory / Peace (Index & Middle extended, ring & pinky folded)
  if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'PEACE';
  }

  // 4. Fist / Closed Hand (All 4 fingers folded down)
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'THANK YOU';
  }

  return null;
}
