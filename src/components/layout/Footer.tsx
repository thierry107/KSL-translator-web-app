import React from 'react';
import { Cpu, Wifi, HardDrive } from 'lucide-react';

interface FooterProps {
  mediapipeReady: boolean;
  fps: number;
  isDebug?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ mediapipeReady, fps, isDebug = false }) => {
  return (
    <footer className="w-full border-t border-white/10 bg-slate-950/60 backdrop-blur-md py-3 px-4 sm:px-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vision Engine: {mediapipeReady ? 'MediaPipe Wasm Ready' : 'Initializing...'}</span>
          </div>
          {isDebug && (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Frame Rate: {fps} FPS</span>
            </div>
          )}
        </div>

        {isDebug && (
          <div className="flex items-center gap-1 text-slate-500">
            <HardDrive className="w-3 h-3" />
            <span>Hackathon Client Build v1.0.0</span>
          </div>
        )}
      </div>
    </footer>
  );
};
