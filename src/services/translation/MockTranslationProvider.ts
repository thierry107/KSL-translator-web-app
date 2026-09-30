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
 * Deterministic Heuristic Hand Gesture Matcher based on 21 keypoints
 */
function detectHeuristicGesture(pts: LandmarkPoint[]): string | null {
  // Check finger extension states (Fingertip Y < PIP Y relative to wrist)
  const isThumbUp = pts[4].y < pts[3].y && pts[4].y < pts[2].y && pts[8].y > pts[6].y && pts[12].y > pts[10].y;
  const isIndexExtended = pts[8].y < pts[6].y;
  const isMiddleExtended = pts[12].y < pts[10].y;
  const isRingExtended = pts[16].y < pts[14].y;
  const isPinkyExtended = pts[20].y < pts[18].y;

  // 1. Open Palm / Wave (All 4 fingers extended)
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
    return 'HELLO';
  }

  // 2. Thumbs Up (Thumb extended up, index/middle/ring/pinky folded)
  if (isThumbUp && !isIndexExtended && !isMiddleExtended && !isRingExtended) {
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
