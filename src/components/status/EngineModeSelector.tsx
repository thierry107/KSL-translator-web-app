import React, { useState } from 'react';
import { Cpu, Wifi, Settings, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';

export const EngineModeSelector: React.FC = () => {
  const { mode, serverUrl, setMode, setServerUrl } = useAppStore();
  const [showConfig, setShowConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setServerUrl(tempUrl);
    setShowConfig(false);
  };

  return (
    <div className="glass-panel p-3.5 flex flex-col gap-3 text-xs border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Translation Provider Engine:</span>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          title="Configure WebSocket settings"
          aria-label="Configure WebSocket settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Switcher Toggle Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('MOCK_LOCAL')}
          className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
            mode === 'MOCK_LOCAL'
              ? 'bg-purple-950/60 border-purple-700/80 text-purple-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Mock Engine (Local)</span>
          </div>
          <span className="text-[10px] text-slate-400">Deterministic local gesture matcher</span>
        </button>

        <button
          onClick={() => setMode('LIVE_WEBSOCKET')}
          className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
            mode === 'LIVE_WEBSOCKET'
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>FastAPI WebSocket</span>
          </div>
          <span className="text-[10px] text-slate-400">Live remote backend model</span>
        </button>
      </div>

      {/* Live Server URL Config Dropdown */}
      {showConfig && (
        <form onSubmit={handleSaveUrl} className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300">FastAPI WebSocket Endpoint URL:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="ws://localhost:8000/api/v1/translate/ws"
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-mono outline-none focus:border-cyan-500"
            />
            <button type="submit" className="btn btn-primary text-xs px-3 py-1.5">
              Save
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1" title="Video never leaves your device. In remote mode, only hand landmark coordinates are sent.">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Privacy Guard: Video never leaves your device. In remote mode, only hand landmark coordinates are sent.</span>
          </div>
        </form>
      )}
    </div>
  );
};
