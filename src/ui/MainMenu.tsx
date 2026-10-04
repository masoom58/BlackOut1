/**
 * BLACKOUT — Main Menu UI
 * 
 * Clean, tense, minimalist cyberpunk start screen.
 */

import React from 'react';
import { Play, HelpCircle, Settings as SettingsIcon, Trophy, ShieldAlert } from 'lucide-react';
import { GameStats } from '../storage/StorageManager';
import { IPlatformAdapter } from '../platform/PlatformAdapter';

interface MainMenuProps {
  stats: GameStats;
  platform: IPlatformAdapter;
  onPlay: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  stats,
  platform,
  onPlay,
  onOpenHowToPlay,
  onOpenSettings,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 bg-slate-950/85 backdrop-blur-md">
      {/* Top Bar / Platform Badge */}
      <div className="w-full flex items-center justify-between max-w-2xl text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>v1.0.0</span>
        </div>
        <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-400">
          {platform.name}
        </div>
      </div>

      {/* Hero Title & Actions */}
      <div className="flex flex-col items-center text-center max-w-md w-full my-auto">
        {/* Title */}
        <div className="relative mb-3">
          <h1 className="text-6xl sm:text-7xl font-black tracking-widest text-slate-100 font-display neon-glow-cyan">
            BLACKOUT
          </h1>
          <div className="absolute -inset-1 blur-xl bg-cyan-500/10 pointer-events-none -z-10" />
        </div>

        <p className="text-sm sm:text-base text-slate-400 font-mono mb-8 tracking-wide">
          MEMORIZE. NAVIGATE. SURVIVE.
        </p>

        {/* High Score / Best Sector Stats */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">BEST SCORE</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              {stats.highScore.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono">MAX SECTOR</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold font-display text-cyan-400">
              {stats.bestSector}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onPlay}
            className="w-full py-4 px-6 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-bold text-lg tracking-widest uppercase font-display rounded transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ENTER BLACKOUT</span>
          </button>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={onOpenHowToPlay}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 rounded font-mono text-xs tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>HOW TO PLAY</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 rounded font-mono text-xs tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>SETTINGS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Controls Hint */}
      <div className="text-[11px] text-slate-400 font-mono text-center">
        <span className="hidden sm:inline">WASD / ARROWS TO MOVE • SPACE FOR FLASHLIGHT • ESC TO PAUSE</span>
        <span className="sm:hidden">VIRTUAL JOYSTICK & TOUCH FLASH ENABLED</span>
      </div>
    </div>
  );
};
