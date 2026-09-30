import React, { useState } from 'react';
import { TestTube, CheckCircle, VideoOff, RefreshCw } from 'lucide-react';
import type { UseCameraReturn } from '../../hooks/useCamera';

interface CameraTestProps {
  camera: UseCameraReturn;
}

export const CameraTestPanel: React.FC<CameraTestProps> = ({ camera }) => {
  const [testLog, setTestLog] = useState<string[]>([]);

  const logTest = (msg: string) => {
    setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
  };

  const { cameraState, startCamera, stopCamera, switchFacingMode } = camera;

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 text-xs border-cyan-900/40">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-200">Phase 2 Camera Verification & Test Suite</h3>
        </div>
        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono text-[10px]">
          Phase 2 Active
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Test 1: Start/Permission Granted */}
        <button
          onClick={async () => {
            logTest('Testing: Request camera permission...');
            await startCamera();
            logTest(`Result: Permission ${cameraState.permission}, Active=${cameraState.isActive}`);
          }}
          className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex flex-col gap-1 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>1. Start / Permission</span>
          </div>
          <span className="text-[10px] text-slate-400">Triggers getUserMedia()</span>
        </button>

        {/* Test 2: Switch Camera / Facing Mode */}
        <button
          onClick={async () => {
            logTest(`Testing: Switch facing mode (Current: ${cameraState.facingMode})...`);
            await switchFacingMode();
            logTest('Result: Facing mode toggled.');
          }}
          disabled={!cameraState.isActive}
          className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex flex-col gap-1 transition-colors disabled:opacity-40"
        >
          <div className="flex items-center gap-1.5 font-medium text-cyan-400">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>2. Switch Camera</span>
          </div>
          <span className="text-[10px] text-slate-400">User vs Environment</span>
        </button>

        {/* Test 3: Stop / Restart Cleanup */}
        <button
          onClick={() => {
            if (cameraState.isActive) {
              stopCamera();
              logTest('Testing: Stopped camera stream. MediaTracks released.');
            } else {
              startCamera();
              logTest('Testing: Restarted camera stream.');
            }
          }}
          className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex flex-col gap-1 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-medium text-amber-400">
            <VideoOff className="w-3.5 h-3.5" />
            <span>3. Stop / Restart</span>
          </div>
          <span className="text-[10px] text-slate-400">{cameraState.isActive ? 'Stop Feed' : 'Restart Feed'}</span>
        </button>

        {/* Test 4: Device Info Telemetry */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1 justify-center">
          <span className="font-medium text-purple-400 text-[11px]">4. Camera Telemetry</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {cameraState.availableDevices.length} Device(s) | {cameraState.facingMode}
          </span>
        </div>
      </div>

      {/* Test Execution Diagnostic Log */}
      {testLog.length > 0 && (
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-400 flex flex-col gap-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Test Activity Log:</div>
          {testLog.map((log, idx) => (
            <div key={idx} className="text-cyan-300/90">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
};
