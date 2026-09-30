import React, { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CameraViewport } from './components/camera/CameraViewport';
import { CameraTestPanel } from './components/camera/CameraTestPanel';
import { MediaPipeTestPanel } from './components/camera/MediaPipeTestPanel';
import { TranslationPanel } from './components/translation/TranslationPanel';
import { useCamera } from './hooks/useCamera';
import { useMediaPipe } from './hooks/useMediaPipe';
import { useTranslationEngine } from './hooks/useTranslationEngine';
import { useAppStore } from './state/useAppStore';

export const App: React.FC = () => {
  // Phase 2 Camera Hook Instance
  const camera = useCamera();

  // Phase 3 MediaPipe Vision Hook Instance
  const mediapipe = useMediaPipe();

  // Phase 4 Translation Engine Hook Instance
  const { sendLandmarkFrame, toggleSession, triggerManualDemoGesture } = useTranslationEngine();

  // Global State Store
  const { connectionStatus } = useAppStore();
  const isOnline = navigator.onLine;

  // Debug mode flag (?debug=1 in URL)
  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';

  // Pipeline Bridge: Transmit each MediaPipe frame EXACTLY ONCE
  const lastSentTimestampRef = React.useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const frame = mediapipe.latestFrameRef.current;
      if (frame && frame.timestamp !== lastSentTimestampRef.current) {
        lastSentTimestampRef.current = frame.timestamp;
        sendLandmarkFrame(frame);
      }
    }, 25); // Check frequently, transmit ONLY when timestamp changes

    return () => clearInterval(interval);
  }, [mediapipe.latestFrameRef, sendLandmarkFrame]);

  return (
    <div className="app-container">
      {/* Top Application Header */}
      <Header connectionStatus={connectionStatus} isOnline={isOnline} />

      {/* Main Responsive Grid Workspace */}
      <main className="main-content">
        {/* Left Column: Camera Viewport, Canvas Skeleton Overlay & MediaPipe Telemetry */}
        <div className="flex flex-col gap-4">
          <CameraViewport camera={camera} mediapipe={mediapipe} />
          {isDebug && <MediaPipeTestPanel mediapipe={mediapipe} />}
          {isDebug && <CameraTestPanel camera={camera} />}
        </div>

        {/* Right Column: Live Translation Panel & Demo Presentation Controls */}
        <TranslationPanel
          isCameraActive={camera.cameraState.isActive}
          toggleSession={toggleSession}
          triggerManualDemoGesture={triggerManualDemoGesture}
        />
      </main>

      {/* Bottom Telemetry Footer */}
      <Footer mediapipeReady={mediapipe.mediapipeStatus.isReady} fps={mediapipe.mediapipeStatus.fps} isDebug={isDebug} />
    </div>
  );
};

export default App;
