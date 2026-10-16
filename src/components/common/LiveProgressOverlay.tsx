import React from 'react';
import { Loader2, Sparkles, Shield, Database, Radio } from 'lucide-react';

interface LiveProgressOverlayProps {
  isLoading: boolean;
  statusMessage: string;
  subMessage?: string;
  progressPercent?: number;
}

export const LiveProgressOverlay: React.FC<LiveProgressOverlayProps> = ({
  isLoading,
  statusMessage,
  subMessage,
  progressPercent,
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121824] border border-[#27354a] rounded-xl p-6 max-w-md w-full shadow-2xl shadow-stone-950/80 text-center">
        <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
        </div>

        <h3 className="text-stone-100 font-semibold text-base mb-1 tracking-wide">
          {statusMessage || 'Processing Intelligence Pipeline...'}
        </h3>

        {subMessage && (
          <p className="text-stone-400 text-xs font-mono mb-4 leading-relaxed">{subMessage}</p>
        )}

        {typeof progressPercent === 'number' && (
          <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden mb-2">
            <div
              className="bg-amber-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-stone-400 mt-3 pt-3 border-t border-stone-800/80">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-amber-500" /> Server Gemini 3.7
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" /> Source Traceability
          </span>
        </div>
      </div>
    </div>
  );
};
