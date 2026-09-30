// ==========================================
// SignBridge AI - Central TypeScript Definitions
// ==========================================

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'MOCK_MODE';

export type CameraPermissionState = 'prompt' | 'granted' | 'denied';
export type CameraFacingMode = 'user' | 'environment';

export interface CameraState {
  permission: CameraPermissionState;
  isActive: boolean;
  isInitializing: boolean;
  selectedDeviceId: string | null;
  facingMode: CameraFacingMode;
  availableDevices: MediaDeviceInfo[];
  resolution: { width: number; height: number };
  error: {
    code: 'NOT_ALLOWED' | 'NOT_FOUND' | 'NOT_READABLE' | 'OVERCONSTRAINED' | 'UNKNOWN';
    message: string;
  } | null;
}

export interface MediaPipeStatus {
  isReady: boolean;
  isProcessing: boolean;
  fps: number;
  detectedHands: number;
  error: string | null;
}

export interface PredictionResult {
  id: string;
  gloss: string;
  translatedText: string;
  confidence: number;
  timestamp: number;
  isStub?: boolean;
}

export interface AppTranslationState {
  isTranslating: boolean;
  mode: 'LIVE_WEBSOCKET' | 'MOCK_LOCAL';
  currentGloss: string;
  currentSentence: string;
  confidence: number;
  history: PredictionResult[];
  ttsEnabled: boolean;
  targetLanguage: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FrameLandmarks {
  frameId: number;
  timestamp: number;
  leftHand: LandmarkPoint[];
  rightHand: LandmarkPoint[];
}
