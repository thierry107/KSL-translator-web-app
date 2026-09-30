import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { normalizeHandLandmarks } from '../landmark/normalizer';
import type { MediaPipeStatus, LandmarkPoint } from '../types';

export interface ExtractedFrameData {
  timestamp: number;
  leftHand: LandmarkPoint[];
  rightHand: LandmarkPoint[];
  normalizedLeftHand: LandmarkPoint[];
  normalizedRightHand: LandmarkPoint[];
}

export interface UseMediaPipeReturn {
  mediapipeStatus: MediaPipeStatus;
  latestFrameRef: React.RefObject<ExtractedFrameData | null>;
  startProcessing: (video: HTMLVideoElement) => void;
  stopProcessing: () => void;
}

export function useMediaPipe(): UseMediaPipeReturn {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);

  // Telemetry FPS counters
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());

  const latestFrameRef = useRef<ExtractedFrameData | null>(null);

  const [mediapipeStatus, setMediapipeStatus] = useState<MediaPipeStatus>({
    isReady: false,
    isProcessing: false,
    fps: 0,
    detectedHands: 0,
    error: null,
  });

  // Target processing rate: 25 FPS (40ms interval) to avoid GPU over-utilization
  const TARGET_FPS = 25;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Initialize MediaPipe HandLandmarker with local Wasm and task model
  useEffect(() => {
    let isSubscribed = true;

    async function initHandLandmarker() {
      try {
        console.log('[MediaPipe] Resolving Wasm binaries from local assets...');
        let visionResolver;
        try {
          // Primary local Wasm resolver
          visionResolver = await FilesetResolver.forVisionTasks(
            `${import.meta.env.BASE_URL}vendor/mediapipe/wasm`
          );
        } catch (localWasmErr) {
          console.warn('[MediaPipe] Local Wasm resolver failed, attempting CDN fallback:', localWasmErr);
          visionResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
        }

        console.log('[MediaPipe] Creating HandLandmarker from task model...');
        let landmarker: HandLandmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(visionResolver, {
            baseOptions: {
              modelAssetPath: `${import.meta.env.BASE_URL}vendor/mediapipe/models/hand_landmarker.task`,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (localModelErr) {
          console.warn('[MediaPipe] Local task model failed, attempting CDN fallback:', localModelErr);
          landmarker = await HandLandmarker.createFromOptions(visionResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isSubscribed) {
          handLandmarkerRef.current = landmarker;
          setMediapipeStatus((prev) => ({
            ...prev,
            isReady: true,
            error: null,
          }));
          console.log('[MediaPipe] HandLandmarker successfully initialized.');
        }
      } catch (err: any) {
        console.error('[MediaPipe] HandLandmarker initialization error:', err);
        if (isSubscribed) {
          setMediapipeStatus((prev) => ({
            ...prev,
            isReady: false,
            error: err.message || 'Failed to initialize MediaPipe vision engine.',
          }));
        }
      }
    }

    initHandLandmarker();

    return () => {
      isSubscribed = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  // Frame processing loop (Throttled to ~25 FPS)
  const processFrame = useCallback((video: HTMLVideoElement, timestamp: DOMHighResTimeStamp) => {
    if (!handLandmarkerRef.current) return;

    if (timestamp - lastProcessedTimeRef.current >= FRAME_INTERVAL) {
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        try {
          const results: HandLandmarkerResult = handLandmarkerRef.current.detectForVideo(video, timestamp);

          let leftHand: LandmarkPoint[] = [];
          let rightHand: LandmarkPoint[] = [];

          if (results.landmarks && results.handedness) {
            results.handedness.forEach((handednessList, index) => {
              const label = handednessList[0]?.categoryName;
              const pts = results.landmarks[index] as LandmarkPoint[];

              // Note: MediaPipe labels are mirrored for front camera feeds
              if (label === 'Left') {
                leftHand = pts;
              } else {
                rightHand = pts;
              }
            });
          }

          const normLeft = normalizeHandLandmarks(leftHand);
          const normRight = normalizeHandLandmarks(rightHand);

          latestFrameRef.current = {
            timestamp: Date.now(),
            leftHand,
            rightHand,
            normalizedLeftHand: normLeft,
            normalizedRightHand: normRight,
          };

          // Update Telemetry FPS & Hand Count once per second without triggering heavy React re-renders
          frameCountRef.current += 1;
          const now = performance.now();
          if (now - lastFpsCalcTimeRef.current >= 1000) {
            const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcTimeRef.current));
            const detectedCount = (leftHand.length > 0 ? 1 : 0) + (rightHand.length > 0 ? 1 : 0);

            setMediapipeStatus((prev) => ({
              ...prev,
              fps: currentFps,
              detectedHands: detectedCount,
            }));

            frameCountRef.current = 0;
            lastFpsCalcTimeRef.current = now;
          }
        } catch (detErr) {
          console.warn('[MediaPipe] detectForVideo error:', detErr);
        }
      }
      lastProcessedTimeRef.current = timestamp;
    }

    animFrameIdRef.current = requestAnimationFrame((ts) => processFrame(video, ts));
  }, []);

  const startProcessing = useCallback(
    (video: HTMLVideoElement) => {
      if (!handLandmarkerRef.current) return;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

      setMediapipeStatus((prev) => ({ ...prev, isProcessing: true }));
      animFrameIdRef.current = requestAnimationFrame((ts) => processFrame(video, ts));
    },
    [processFrame]
  );

  const stopProcessing = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    latestFrameRef.current = null;
    setMediapipeStatus((prev) => ({
      ...prev,
      isProcessing: false,
      fps: 0,
      detectedHands: 0,
    }));
  }, []);

  return {
    mediapipeStatus,
    latestFrameRef,
    startProcessing,
    stopProcessing,
  };
}
