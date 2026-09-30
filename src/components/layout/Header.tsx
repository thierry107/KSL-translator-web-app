import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../status/StatusBadge';
import type { ConnectionStatus } from '../../types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({ connectionStatus, isOnline }) => {
  return (
    <header className="w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-5 w-full h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight font-display">SignBridge AI</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded-full">
                DEMO
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">In-Browser MediaPipe Landmark & AI Sign Translator</p>
          </div>
        </div>

        {/* Header Right Status Badges & Privacy Indicator */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-slate-300" title="Video never leaves your device. In remote mode, only hand landmark coordinates are sent.">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy Guard On</span>
          </div>

          <StatusBadge status={connectionStatus} isOnline={isOnline} />
        </div>

      </div>
    </header>
  );
};
