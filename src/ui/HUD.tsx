/**
 * BLACKOUT — In-Game Tactical HUD
 * 
 * Minimalist display showing Sector, Score, Flashlight Battery, Combo Multiplier,
 * Blackout Pattern, Pause trigger, and Universal On-Screen Controls (D-Pad, Virtual Joystick, Flashlight).
 */

import React, { useState } from 'react';
import {
  Pause,
  Zap,
  Flame,
  AlertOctagon,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { TouchState } from '../input/TouchInput';

interface HUDProps {
  score: number;
  sector: number;
  energy: number;
  isReveal: boolean;
  revealTimeRemaining: number;
  combo: number;
  pattern: string;
  isExtreme: boolean;
  onPause: () => void;
  onCutLights: () => void;
  isTouchDevice: boolean;
  touchState: TouchState;
  onFlashlightTouch: (active: boolean) => void;
  onDpad: (dx: number, dy: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  sector,
  energy,
  isReveal,
  revealTimeRemaining,
  combo,
  pattern,
  isExtreme,
  onPause,
  onCutLights,
  isTouchDevice,
  touchState,
  onFlashlightTouch,
  onDpad,
}) => {
  const [showDpad, setShowDpad] = useState<boolean>(true);
  const energyPercent = Math.max(0, Math.min(100, energy));
  const isLowEnergy = energyPercent < 20;

  const handleDpadPress = (dx: number, dy: number) => {
    onDpad(dx, dy);
  };

  const handleDpadRelease = () => {
    onDpad(0, 0);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20 select-none">
      {/* Top Tactical Bar */}
      <div className="w-full flex items-center justify-between">
        {/* Left: Sector & Score & Multiplier */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-sm backdrop-blur-md shadow-lg">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-mono">SECTOR</span>
            <span className="text-lg sm:text-xl font-bold text-cyan-400 font-display tracking-wider">
              {String(sector).padStart(2, '0')}
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-sm backdrop-blur-md shadow-lg">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-mono">SCORE</span>
            <span className="text-lg sm:text-xl font-bold text-slate-100 font-display tracking-wider">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Combo Multiplier Badge */}
          {combo > 1.0 && (
            <div className="bg-amber-950/80 border border-amber-500/60 px-2 sm:px-2.5 py-1 rounded-sm backdrop-blur-md flex items-center gap-1 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-amber-300 font-mono">
                x{combo.toFixed(1)}
              </span>
            </div>
          )}

          {/* Extreme / Anomaly Banner */}
          {isExtreme ? (
            <div className="bg-red-950/90 border border-red-500 px-2 py-1 rounded-sm flex items-center gap-1 animate-bounce">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[9px] font-black text-red-200 font-mono tracking-wider">EXTREME</span>
            </div>
          ) : pattern !== 'NORMAL' ? (
            <div className="hidden sm:block bg-slate-900/80 border border-slate-700 px-2 py-1 rounded-sm text-[10px] text-slate-400 font-mono">
              ANOMALY: {pattern}
            </div>
          ) : null}
        </div>

        {/* Center: Flashlight Battery Gauge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 sm:px-4 py-1.5 rounded-sm backdrop-blur-md shadow-lg">
          <Zap
            className={`w-4 h-4 transition-colors ${
              isLowEnergy ? 'text-amber-500 animate-pulse' : 'text-cyan-400'
            }`}
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span className="hidden sm:inline">FLASHLIGHT</span>
              <span>{Math.round(energyPercent)}%</span>
            </div>
            <div className="w-20 sm:w-28 h-2 bg-slate-950 rounded-xs overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-75 ${
                  isLowEnergy
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                }`}
                style={{ width: `${energyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: D-Pad Toggle & Pause */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDpad((prev) => !prev)}
            className="pointer-events-auto p-2 bg-slate-900/90 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-sm active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Toggle On-Screen D-Pad"
          >
            <Compass className={`w-4 h-4 ${showDpad ? 'text-cyan-400' : 'text-slate-500'}`} />
          </button>

          <button
            onClick={onPause}
            className="pointer-events-auto p-2 sm:p-2.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-sm active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Pause Game (ESC / P)"
          >
            <Pause className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* Middle Banner during Reveal Phase */}
      {isReveal && (
        <div className="w-full flex flex-col items-center justify-center my-auto pointer-events-none">
          <div
            className={`px-5 py-3 rounded-sm backdrop-blur-md text-center max-w-md border shadow-2xl ${
              isExtreme
                ? 'bg-red-950/95 border-red-500 animate-pulse'
                : 'bg-slate-900/95 border-cyan-500/60'
            }`}
          >
            <span
              className={`font-black text-sm uppercase tracking-widest block font-display ${
                isExtreme ? 'text-red-300 neon-glow-red' : 'text-cyan-400 neon-glow-cyan'
              }`}
            >
              {isExtreme ? '⚠️ EXTREME HAZARDS DETECTED' : 'SECTOR SCAN • MEMORIZE ROUTE'}
            </span>
            <span className="text-xs text-slate-200 font-mono mt-1 block">
              Lights turn off when you start moving
            </span>
            <span className="text-[10px] text-cyan-300 font-mono mt-0.5 block opacity-90">
              Use WASD / Arrows / Click & Drag / D-Pad below
            </span>
          </div>

          <button
            onClick={onCutLights}
            className="pointer-events-auto mt-3 py-2 px-6 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-bold font-display text-xs tracking-wider uppercase rounded shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer active:scale-95 transition-all"
          >
            CUT LIGHTS NOW [SPACE]
          </button>
        </div>
      )}

      {/* Bottom Controls Area: On-Screen D-Pad & Flashlight Button */}
      <div className="w-full flex items-end justify-between pb-1 select-none">
        {/* Left: Directional D-Pad (works on mouse click, holding, and touch) */}
        {showDpad ? (
          <div className="pointer-events-auto flex flex-col items-center bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80 backdrop-blur-xs shadow-xl">
            {/* Up Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadPress(0, -1);
              }}
              onPointerUp={handleDpadRelease}
              onPointerLeave={handleDpadRelease}
              onPointerCancel={handleDpadRelease}
              className="w-12 h-11 bg-slate-900/90 hover:bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700/80 rounded flex items-center justify-center text-slate-300 transition-all cursor-pointer shadow-md"
              title="Move Up"
            >
              <ArrowUp className="w-5 h-5" />
            </button>

            {/* Middle Row (Left, Center indicator, Right) */}
            <div className="flex items-center gap-1.5 my-1">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDpadPress(-1, 0);
                }}
                onPointerUp={handleDpadRelease}
                onPointerLeave={handleDpadRelease}
                onPointerCancel={handleDpadRelease}
                className="w-12 h-11 bg-slate-900/90 hover:bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700/80 rounded flex items-center justify-center text-slate-300 transition-all cursor-pointer shadow-md"
                title="Move Left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-7 h-7 rounded-full border border-dashed border-slate-700 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>

              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDpadPress(1, 0);
                }}
                onPointerUp={handleDpadRelease}
                onPointerLeave={handleDpadRelease}
                onPointerCancel={handleDpadRelease}
                className="w-12 h-11 bg-slate-900/90 hover:bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700/80 rounded flex items-center justify-center text-slate-300 transition-all cursor-pointer shadow-md"
                title="Move Right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Down Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadPress(0, 1);
              }}
              onPointerUp={handleDpadRelease}
              onPointerLeave={handleDpadRelease}
              onPointerCancel={handleDpadRelease}
              className="w-12 h-11 bg-slate-900/90 hover:bg-slate-800 active:bg-cyan-500 active:text-slate-950 border border-slate-700/80 rounded flex items-center justify-center text-slate-300 transition-all cursor-pointer shadow-md"
              title="Move Down"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 font-mono p-2">
            WASD / ARROWS / DRAG ACTIVE
          </div>
        )}

        {/* Center: Subtle drag visualizer if thumbstick is active */}
        {touchState.joystickActive && (
          <div
            className="absolute w-24 h-24 rounded-full border-2 border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center pointer-events-none"
            style={{
              left: touchState.joystickBaseX - 48,
              top: touchState.joystickBaseY - 48,
            }}
          >
            <div
              className="w-10 h-10 rounded-full bg-cyan-400/90 border border-white shadow-[0_0_10px_rgba(6,182,212,0.8)] pointer-events-none"
              style={{
                transform: `translate(${touchState.joystickStickX - touchState.joystickBaseX}px, ${touchState.joystickStickY - touchState.joystickBaseY}px)`,
              }}
            />
          </div>
        )}

        {/* Right: Tactile Flashlight Action Button */}
        <div className="pointer-events-auto pr-1 pb-1">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onFlashlightTouch(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              onFlashlightTouch(false);
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              onFlashlightTouch(false);
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              onFlashlightTouch(false);
            }}
            className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 shadow-xl ${
              touchState.flashlight
                ? 'bg-cyan-500 text-slate-950 border-white shadow-[0_0_25px_rgba(6,182,212,0.9)]'
                : 'bg-slate-900/95 text-cyan-400 border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            }`}
            title="Toggle Flashlight (Hold Space / F)"
          >
            <Zap className="w-6 h-6 mb-0.5 fill-current" />
            <span className="text-[10px] font-black tracking-wider uppercase font-display">FLASH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
