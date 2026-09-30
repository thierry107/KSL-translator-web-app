import type { FrameLandmarks } from '../types';

/**
 * Client-to-Server WebSocket Outgoing Messages
 */
export type ClientWebSocketMessage =
  | {
      type: 'config';
      sessionId: string;
      targetLanguage: string;
      fps: number;
    }
  | {
      type: 'landmarks';
      sessionId: string;
      frameId: number;
      timestamp: number;
      data: {
        leftHand: FrameLandmarks['leftHand'];
        rightHand: FrameLandmarks['rightHand'];
      };
    }
  | {
      type: 'ping';
      timestamp: number;
    };

/**
 * Server-to-Client WebSocket Incoming Messages
 */
export type ServerWebSocketMessage =
  | {
      type: 'prediction';
      sessionId: string;
      frameId?: number;
      timestamp: number;
      payload: {
        gloss: string;
        translatedText: string;
        confidence: number;
        isFinal?: boolean;
      };
    }
  | {
      type: 'pong';
      timestamp: number;
    }
  | {
      type: 'error';
      code: string;
      message: string;
    };
