/**
 * BLACKOUT — Game Over Screen
 * 
 * Shows final score, new high score alert, sectors survived, combo streak,
 * close calls count, and instant "Try Again" action.
 */

import React from 'react';
import { RotateCcw, Home, Trophy, Skull, Clock, ShieldAlert, Flame, Zap } from 'lucide-react';
import { IPlatformAdapter } from '../platform/PlatformAdapter';

interface GameOverModalProps {
  finalScore: number;
  bestScore: number;
  sectorReached: number;
  durationSeconds: number;
  bestCombo: number;
  closeCalls: number;
  isHighScore: boolean;
  platform: IPlatformAdapter;
  onRestart: () => void;
  onQuitToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  finalScore,
  bestScore,
  sectorReached,
  durationSeconds,
  bestCombo,
  closeCalls,
  isHighScore,
  platform,
  onRestart,
  onQuitToMenu,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${String(remainder).padStart(2, '0')}`;
  };

  const handleRestart = async () => {
    if (platform.hasAdSupport()) {
      await platform.requestAd('midgame');
    }
    onRestart();
  };

  const handleQuit = async () => {
    if (platform.hasAdSupport()) {
      await platform.requestAd('midgame');
    }
    onQuitToMenu();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/88 backdrop-blur-md">
      <div className="bg-slate-900 border border-red-900/60 p-6 sm:p-7 rounded-lg max-w-sm w-full shadow-2xl text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Skull className="w-5 h-5 text-red-500 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-red-500 font-display neon-glow-red">
            BLACKOUT
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 font-mono mb-4">
          TERMINATED IN SECTOR {String(sectorReached).padStart(2, '0')}
        </p>

        {/* High Score Celebration */}
        {isHighScore && (
          <div className="mb-4 py-1.5 px-3 bg-amber-500/10 border border-amber-500/40 rounded flex items-center justify-center gap-2 text-amber-400 font-mono text-xs animate-bounce">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-bold">NEW HIGH SCORE!</span>
          </div>
        )}

        {/* Score Breakdown Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-left font-mono">
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded">
            <span className="text-[10px] text-slate-400 block">SCORE</span>
            <span className="text-xl font-bold font-display text-slate-100">
              {finalScore.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded">
            <span className="text-[10px] text-slate-400 block">BEST</span>
            <span className="text-xl font-bold font-display text-amber-400">
              {bestScore.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">SECTIONS</span>
              <span className="text-sm font-bold font-display text-cyan-400">
                {sectorReached}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">SURVIVED</span>
              <span className="text-sm font-bold font-display text-slate-200">
                {formatTime(durationSeconds)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">BEST COMBO</span>
              <span className="text-sm font-bold font-display text-amber-300">
                x{Math.min(3.0, 1.0 + bestCombo * 0.25).toFixed(1)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">CLOSE CALLS</span>
              <span className="text-sm font-bold font-display text-yellow-300">
                {closeCalls}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRestart}
            className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-display tracking-widest uppercase rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-[0.99]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>

          <button
            onClick={handleQuit}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
