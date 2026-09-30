import React, { useEffect } from 'react';
import { Camera, VideoOff, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2, Play, Square, Cpu, Eye, Sun } from 'lucide-react';
import { LandmarkOverlay } from './LandmarkOverlay';
import type { UseCameraReturn } from '../../hooks/useCamera';
import type { UseMediaPipeReturn } from '../../hooks/useMediaPipe';

interface CameraViewportProps {
  camera: UseCameraReturn;
  mediapipe: UseMediaPipeReturn;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({ camera, mediapipe }) => {
  const { videoRef, cameraState, startCamera, stopCamera, switchFacingMode, selectDevice } = camera;
  const { mediapipeStatus, latestFrameRef, startProcessing, stopProcessing } = mediapipe;

  const { isActive, isInitializing, selectedDeviceId, facingMode, availableDevices, error } = cameraState;
  const isFrontCamera = facingMode === 'user';

  // Automatically trigger / stop MediaPipe processing loop when camera stream starts / stops
  useEffect(() => {
    if (isActive && videoRef.current && mediapipeStatus.isReady) {
      startProcessing(videoRef.current);
    } else {
      stopProcessing();
    }
  }, [isActive, mediapipeStatus.isReady, startProcessing, stopProcessing, videoRef]);

  return (
    <section className="glass-panel p-4 flex flex-col gap-4 relative overflow-hidden" aria-label="Camera Viewport Section">
      {/* Viewport Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Camera & Landmark Viewport</h2>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE FEED & VISION ACTIVE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400">
              <VideoOff className="w-3 h-3 text-slate-500" />
              <span>INACTIVE</span>
            </span>
          )}
        </div>
      </div>

      {/* Primary Video Container + Overlay Canvas */}
      <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center overflow-hidden shadow-inner group">
        {/* HTML5 Video Feed */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          } ${isFrontCamera ? 'scale-x-[-1]' : 'scale-x-1'}`}
        />

        {/* 60 FPS HTML5 Canvas Skeleton Overlay */}
        <LandmarkOverlay
          latestFrameRef={latestFrameRef}
          isFrontCamera={isFrontCamera}
          isActive={isActive}
        />

        {/* Placeholder when Camera is Inactive */}
        {!isActive && !error && !isInitializing && (
          <div className="relative z-20 flex flex-col items-center text-center p-6 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
              <Camera className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">Camera & Vision Ready</h3>
            <p className="text-xs text-slate-400 mb-4">
              Click below to start camera feed and activate real-time 3D hand landmark tracking.
            </p>

            <button
              onClick={() => startCamera()}
              className="btn btn-primary text-xs font-semibold shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Camera & Vision Engine</span>
            </button>
          </div>
        )}

        {/* Initializing Spinner Overlay */}
        {isInitializing && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-cyan-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs font-medium text-slate-300">Initializing camera stream...</span>
          </div>
        )}

        {/* Camera or MediaPipe Error Message Display Overlay */}
        {(error || mediapipeStatus.error) && !isInitializing && (
          <div className="relative z-20 flex flex-col items-center text-center p-6 max-w-md bg-rose-950/40 border border-rose-800/60 rounded-xl backdrop-blur-md">
            {error?.code === 'NOT_ALLOWED' ? (
              <ShieldAlert className="w-10 h-10 text-rose-400 mb-2" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
            )}
            <h4 className="text-sm font-bold text-slate-100 mb-1">
              {error?.code === 'NOT_ALLOWED' ? 'Permission Denied' : 'System Error'}
            </h4>
            <p className="text-xs text-slate-300 mb-4">{error?.message || mediapipeStatus.error}</p>
            <button
              onClick={() => startCamera()}
              className="btn btn-secondary text-xs border-slate-700 hover:border-slate-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Initialization</span>
            </button>
          </div>
        )}

        {/* Telemetry Bar Overlay over Active Video */}
        {isActive && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-200 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 shadow-md z-20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Feed Active ({isFrontCamera ? 'Front' : 'Rear'})</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-slate-300">
              <span className="flex items-center gap-1 text-cyan-400">
                <Cpu className="w-3 h-3" />
                {mediapipeStatus.fps} FPS (Vision)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Eye className="w-3 h-3" />
                {mediapipeStatus.detectedHands} Hand(s)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Workflow steps hint & Lighting/framing tip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/50 border border-slate-800/60 px-3 py-2 rounded-lg">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 text-[10px] font-mono">STEPS</span>
          <span>1. Allow camera &nbsp;2. Start session &nbsp;3. Sign</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Tip: face a light source and keep your hands inside the frame.</span>
        </div>
      </div>

      {/* Camera Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => selectDevice(e.target.value)}
            disabled={!isActive || availableDevices.length === 0}
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {availableDevices.length === 0 ? (
              <option value="">No cameras enumerated</option>
            ) : (
              availableDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))
            )}
          </select>

          <button
            onClick={switchFacingMode}
            disabled={!isActive}
            className="btn btn-secondary text-xs px-3 py-2"
            title={`Switch to ${isFrontCamera ? 'Rear' : 'Front'} Camera`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flip</span>
          </button>
        </div>

        {isActive && (
          <div>
            <button onClick={stopCamera} className="btn btn-danger text-xs font-semibold px-4 py-2">
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Camera</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
