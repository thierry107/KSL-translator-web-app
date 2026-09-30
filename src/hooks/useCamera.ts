import { useState, useEffect, useRef, useCallback } from 'react';
import type { CameraState, CameraFacingMode } from '../types';

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  cameraState: CameraState;
  startCamera: (deviceId?: string, facingModeOverride?: CameraFacingMode) => Promise<void>;
  stopCamera: () => void;
  switchFacingMode: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>({
    permission: 'prompt',
    isActive: false,
    isInitializing: false,
    selectedDeviceId: null,
    facingMode: 'user',
    availableDevices: [],
    resolution: { width: 0, height: 0 },
    error: null,
  });

  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

  // Helper to enumerate available video devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameraState((prev) => ({
        ...prev,
        availableDevices: videoDevices,
      }));
    } catch (err) {
      console.warn('[useCamera] Device enumeration error:', err);
    }
  }, []);

  // Stop current active stream tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        streamRef.current?.removeTrack(track);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCurrentStream(null);
    setCameraState((prev) => ({
      ...prev,
      isActive: false,
      isInitializing: false,
      resolution: { width: 0, height: 0 },
    }));
  }, []);

  // Request & attach getUserMedia stream
  const startCamera = useCallback(
    async (deviceId?: string, facingModeOverride?: CameraFacingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState((prev) => ({
          ...prev,
          error: {
            code: 'NOT_FOUND',
            message: 'Camera API (getUserMedia) is not supported by your browser.',
          },
        }));
        return;
      }

      setCameraState((prev) => ({ ...prev, isInitializing: true, error: null }));

      // Stop any existing stream before opening a new one
      if (streamRef.current) {
        stopCamera();
      }

      const targetFacingMode = facingModeOverride || cameraState.facingMode;
      const targetDeviceId = deviceId !== undefined ? deviceId : cameraState.selectedDeviceId;

      // Primary ideal constraints (720p at 30fps)
      const buildConstraints = (width: number, height: number): MediaStreamConstraints => {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: 30, max: 30 },
        };

        if (targetDeviceId) {
          videoConstraints.deviceId = { exact: targetDeviceId };
        } else {
          videoConstraints.facingMode = { ideal: targetFacingMode };
        }

        return { video: videoConstraints, audio: false };
      };

      let newStream: MediaStream | null = null;

      try {
        // Try 1280x720 primary target resolution
        try {
          newStream = await navigator.mediaDevices.getUserMedia(buildConstraints(1280, 720));
        } catch (firstErr) {
          console.warn('[useCamera] 720p constraints failed, falling back to 640x480:', firstErr);
          // Fallback to standard 640x480
          newStream = await navigator.mediaDevices.getUserMedia(buildConstraints(640, 480));
        }

        streamRef.current = newStream;
        setCurrentStream(newStream);

        // Bind stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((playErr) => {
              console.warn('[useCamera] Video play error:', playErr);
            });
          };
        }

        // Extract actual track resolution & deviceId settings
        const videoTrack = newStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const activeDeviceId = settings.deviceId || targetDeviceId || null;
        const width = settings.width || 0;
        const height = settings.height || 0;

        setCameraState((prev) => ({
          ...prev,
          permission: 'granted',
          isActive: true,
          isInitializing: false,
          selectedDeviceId: activeDeviceId,
          facingMode: targetFacingMode,
          resolution: { width, height },
          error: null,
        }));

        // Refresh device list now that permission is granted (to get non-empty device labels)
        await refreshDevices();
      } catch (err: any) {
        console.error('[useCamera] getUserMedia failed:', err);
        stopCamera();

        let errorCode: NonNullable<CameraState['error']>['code'] = 'UNKNOWN';
        let errorMessage = 'Failed to access camera.';

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorCode = 'NOT_ALLOWED';
          errorMessage = 'Camera permission was denied. Please allow camera access in browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorCode = 'NOT_FOUND';
          errorMessage = 'No camera device found on your system.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorCode = 'NOT_READABLE';
          errorMessage = 'Camera is currently in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorCode = 'OVERCONSTRAINED';
          errorMessage = 'The requested camera constraints cannot be satisfied by your device.';
        }

        setCameraState((prev) => ({
          ...prev,
          permission: errorCode === 'NOT_ALLOWED' ? 'denied' : prev.permission,
          isActive: false,
          isInitializing: false,
          error: { code: errorCode, message: errorMessage },
        }));
      }
    },
    [cameraState.facingMode, cameraState.selectedDeviceId, stopCamera, refreshDevices]
  );

  // Switch between front ("user") and rear ("environment") facing mode
  const switchFacingMode = useCallback(async () => {
    const nextFacingMode: CameraFacingMode = cameraState.facingMode === 'user' ? 'environment' : 'user';
    // Clear explicit device ID so facingMode selector takes priority
    await startCamera(undefined, nextFacingMode);
  }, [cameraState.facingMode, startCamera]);

  // Select a specific device ID
  const selectDevice = useCallback(
    async (deviceId: string) => {
      await startCamera(deviceId);
    },
    [startCamera]
  );

  // Initial device enumeration & devicechange listener setup
  useEffect(() => {
    refreshDevices();

    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  // Automatic unmount cleanup: ensure video tracks are stopped on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    stream: currentStream,
    cameraState,
    startCamera,
    stopCamera,
    switchFacingMode,
    selectDevice,
    refreshDevices,
  };
}
