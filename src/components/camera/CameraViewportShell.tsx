import React from 'react';
import { Camera, RefreshCw, Eye } from 'lucide-react';

export const CameraViewportShell: React.FC = () => {
  return (
    <section className="glass-panel p-4 flex flex-col gap-4 relative overflow-hidden" aria-label="Camera Viewport Section">
      {/* Top Bar Controls Placeholder */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Camera & Landmark Viewport</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-slate-800/80 text-[11px] font-mono text-slate-400 border border-slate-700/60">
            Phase 1 Shell Mode
          </span>
        </div>
      </div>

      {/* Main Aspect-Ratio Video Container */}
      <div className="relative aspect-video w-full rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col items-center justify-center overflow-hidden group shadow-inner">
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Center Prompt Icon */}
        <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
            <Camera className="w-7 h-7 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 mb-1">Camera Stream Inactive</h3>
          <p className="text-xs text-slate-400 mb-4">
            Phase 1 application shell ready. Camera access and MediaPipe tracking will be activated in Phase 2 & Phase 3.
          </p>
          
          <button className="btn btn-primary text-xs cursor-not-allowed opacity-80" disabled>
            <Camera className="w-3.5 h-3.5" />
            <span>Enable Camera (Phase 2)</span>
          </button>
        </div>

        {/* Viewport Status Footer Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/60">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Overlay: 0 Keypoints</span>
          </div>
          <span>Resolution: Auto (1280x720)</span>
        </div>
      </div>

      {/* Controls Bar Placeholder */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <select className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none cursor-not-allowed" disabled>
            <option>Default Camera (Uninitialized)</option>
          </select>
          <button className="btn btn-secondary text-xs" disabled title="Flip camera (Phase 2)">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Canvas: 2D Context Stream
        </div>
      </div>
    </section>
  );
};
