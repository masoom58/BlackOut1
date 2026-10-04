/**
 * BLACKOUT — Pause Menu Modal
 */

import React from 'react';
import { Play, RotateCcw, Home, Settings as SettingsIcon } from 'lucide-react';

interface PauseModalProps {
  sector: number;
  score: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onQuitToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  sector,
  score,
  onResume,
  onRestart,
  onOpenSettings,
  onQuitToMenu,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-lg max-w-sm w-full shadow-2xl text-center">
        <h2 className="text-3xl font-black tracking-widest text-slate-100 font-display neon-glow-cyan mb-2">
          PAUSED
        </h2>

        <p className="text-xs text-slate-400 font-mono mb-6">
          SECTOR {String(sector).padStart(2, '0')} • SCORE {score.toLocaleString()}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-display tracking-widest uppercase rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART RUN</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>SETTINGS</span>
          </button>

          <button
            onClick={onQuitToMenu}
            className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>QUIT TO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
