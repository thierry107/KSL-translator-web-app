import React from 'react';
import { MessageSquareText, Volume2, VolumeX, Trash2, Globe, Sparkles, Activity, Play, Pause, Hand } from 'lucide-react';
import { EngineModeSelector } from '../status/EngineModeSelector';
import { useAppStore } from '../../state/useAppStore';

interface TranslationPanelProps {
  isCameraActive: boolean;
  toggleSession: () => void;
  triggerManualDemoGesture: (gloss: string, text: string) => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  isCameraActive,
  toggleSession,
  triggerManualDemoGesture,
}) => {
  const {
    isTranslating,
    mode,
    currentGloss,
    currentSentence,
    confidence,
    history,
    ttsEnabled,
    targetLanguage,
    toggleTts,
    setTargetLanguage,
    clearHistory,
  } = useAppStore();

  const confidencePercent = Math.round(confidence * 100);

  return (
    <section className="glass-panel p-4 flex flex-col gap-4 justify-start font-sans" aria-label="Translation Panel Section">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Live Translation Output</h2>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-cyan-500"
          >
            <option value="en-US">English (US)</option>
            <option value="fr-FR">French</option>
            <option value="es-ES">Spanish</option>
          </select>
        </div>
      </div>

      {/* Engine Provider Switcher (Mock vs FastAPI WebSocket) */}
      <EngineModeSelector />

      {/* Primary Output Caption Box */}
      <div className="flex flex-col gap-3">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between min-h-[190px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Sign Gloss & Translation
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                mode === 'LIVE_WEBSOCKET'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                  : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
              }`}
            >
              {mode === 'LIVE_WEBSOCKET' ? 'FastAPI WebSocket Active' : 'Deterministic Mock Active'}
            </span>
          </div>

          <div className="my-auto py-4" aria-live="polite" aria-atomic="true">
            <div className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-300 font-display uppercase leading-tight min-h-[3.5rem] flex items-center">
              {currentGloss || 'READY'}
            </div>
            <p className="text-base sm:text-lg text-slate-200 mt-2 font-medium">
              {currentSentence || 'Waiting for hand signs...'}
            </p>
          </div>

          {/* Confidence Gauge Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Model Confidence</span>
              <span className="font-mono text-cyan-400">{confidencePercent}%</span>
            </div>
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full transition-all duration-300 shadow-sm"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controlled Manual Gesture Trigger Bar (Hackathon Demo Suite) */}
      {mode === 'MOCK_LOCAL' && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/60 border border-purple-900/40">
          <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold">
            <span className="flex items-center gap-1">
              <Hand className="w-3.5 h-3.5 text-purple-400" />
              Controlled Demo Triggers (Presentation Suite):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => triggerManualDemoGesture('HELLO', 'Hello!')}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-purple-950 border border-purple-800/50 text-purple-200 transition-colors"
            >
              ✋ HELLO
            </button>
            <button
              onClick={() => triggerManualDemoGesture('YES', 'Yes')}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-purple-950 border border-purple-800/50 text-purple-200 transition-colors"
            >
              👍 YES
            </button>
            <button
              onClick={() => triggerManualDemoGesture('PEACE', 'Peace')}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-purple-950 border border-purple-800/50 text-purple-200 transition-colors"
            >
              ✌️ PEACE
            </button>
            <button
              onClick={() => triggerManualDemoGesture('THANK YOU', 'Thank you')}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-purple-950 border border-purple-800/50 text-purple-200 transition-colors"
            >
              ✊ THANK YOU
            </button>
          </div>
        </div>
      )}

      {/* Transcript History Log */}
      <div className="flex-1 flex flex-col gap-2 min-h-[160px]">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Transcript History</span>
          <button
            onClick={clearHistory}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            title="Clear history"
            aria-label="Clear transcript history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 bg-slate-950/60 rounded-xl border border-slate-800/60 p-2 overflow-y-auto flex flex-col gap-1.5 min-h-[120px]">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-1 my-auto py-4">
              <Activity className="w-5 h-5 text-slate-600" />
              <span>No signs logged yet in this session</span>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-400 font-mono">{item.gloss}</span>
                  <span className="text-slate-400">"{item.translatedText}"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-mono">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={toggleSession}
            disabled={!isCameraActive && !isTranslating}
            className={`btn flex-1 py-2.5 text-xs font-bold ${
              isTranslating ? 'btn-danger' : 'btn-primary'
            }`}
          >
            {isTranslating ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Translation Session</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Translation Session</span>
              </>
            )}
          </button>

          <button
            onClick={toggleTts}
            className={`btn text-xs ${
              ttsEnabled ? 'btn-secondary text-cyan-400 border-cyan-800/60' : 'btn-secondary text-slate-500'
            }`}
            title={ttsEnabled ? 'Disable Text to Speech' : 'Enable Text to Speech'}
            aria-label={ttsEnabled ? 'Disable Text to Speech' : 'Enable Text to Speech'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
        {!isCameraActive && !isTranslating && (
          <p className="text-[11px] text-amber-400/90 text-center">
            Start camera to enable translation session.
          </p>
        )}
      </div>
    </section>
  );
};
