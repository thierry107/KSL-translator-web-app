import { create } from 'zustand';
import type { ConnectionStatus, PredictionResult } from '../types';

export interface AppStoreState {
  // Connection State
  connectionStatus: ConnectionStatus;
  serverUrl: string;
  
  // Translation Session State
  isTranslating: boolean;
  mode: 'MOCK_LOCAL' | 'LIVE_WEBSOCKET';
  currentGloss: string;
  currentSentence: string;
  confidence: number;
  history: PredictionResult[];
  
  // Controls & Preferences
  ttsEnabled: boolean;
  targetLanguage: string;
  
  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setServerUrl: (url: string) => void;
  setTranslating: (translating: boolean) => void;
  setMode: (mode: 'MOCK_LOCAL' | 'LIVE_WEBSOCKET') => void;
  receivePrediction: (prediction: PredictionResult) => void;
  toggleTts: () => void;
  setTargetLanguage: (lang: string) => void;
  clearHistory: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  // Defaults
  connectionStatus: 'MOCK_MODE',
  serverUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/api/v1/translate/ws',
  isTranslating: false,
  mode: 'MOCK_LOCAL',
  currentGloss: 'WAITING FOR SIGN',
  currentSentence: 'Start translation session and show sign gesture to camera.',
  confidence: 0,
  history: [],
  ttsEnabled: true,
  targetLanguage: 'en-US',

  // Actions
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setServerUrl: (url) => set({ serverUrl: url }),
  
  setTranslating: (translating) => set({ isTranslating: translating }),
  
  setMode: (mode) => set({ mode }),

  receivePrediction: (pred) =>
    set((state) => {
      // Avoid duplicate consecutive history entries if same gloss fired within 2s
      const isDuplicate = state.history.length > 0 && 
        state.history[0].gloss === pred.gloss && 
        (pred.timestamp - state.history[0].timestamp < 2000);

      const updatedHistory = isDuplicate
        ? state.history
        : [pred, ...state.history.slice(0, 19)]; // Keep last 20 transcript logs

      return {
        currentGloss: pred.gloss,
        currentSentence: pred.translatedText,
        confidence: pred.confidence,
        history: updatedHistory,
      };
    }),

  toggleTts: () => set((state) => ({ ttsEnabled: !state.ttsEnabled })),

  setTargetLanguage: (lang) => set({ targetLanguage: lang }),

  clearHistory: () => set({
    history: [],
    currentGloss: 'WAITING FOR SIGN',
    currentSentence: 'Start translation session and show sign gesture to camera.',
    confidence: 0,
  }),
}));
