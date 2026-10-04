/**
 * BLACKOUT — How To Play Guide Modal
 */

import React from 'react';
import { X, Eye, Moon, Zap, Flag, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black tracking-widest text-slate-100 font-display neon-glow-cyan mb-1">
          TACTICAL DIRECTIVE
        </h2>
        <p className="text-xs text-slate-400 font-mono mb-6">
          NEURAL RECONNAISSANCE PROTOCOL
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-4 text-left">
          {/* Step 1 */}
          <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded border border-slate-800/80">
            <div className="p-2 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 font-display">1. SEE & MEMORIZE (REVEAL)</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                Take your time to inspect the labyrinth, hazards, timed laser doors, and green exit beacon.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded border border-slate-800/80">
            <div className="p-2 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-800/50 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 font-display">2. MOVE TO ENGAGE BLACKOUT</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                The instant you make your first move, lights extinguish and BLACKOUT begins! Navigate from memory through the darkness.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded border border-slate-800/80">
            <div className="p-2 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 font-display">3. TACTICAL FLASHLIGHT</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                Hold <span className="text-cyan-300 font-bold">SPACE / F</span> (or tap <span className="text-cyan-300 font-bold">FLASH</span> button) for forward illumination. Beware: battery drains fast and recharges slowly!
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded border border-slate-800/80">
            <div className="p-2 rounded bg-pink-950/40 text-pink-400 border border-pink-800/50 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 font-display">4. RISK CORES & COMBOS</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                Collect pink Risk Orbs for +350-600 bonus score. Dodging within inches of lethal hazards earns +75 Close Call adrenaline score!
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3 bg-emerald-950/40 p-3 rounded border border-emerald-800/50">
            <div className="p-2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-700/60 shrink-0">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-300 font-display">5. REACH THE EXIT</h3>
              <p className="text-xs text-emerald-200/80 font-mono mt-0.5 leading-relaxed">
                Reach the pulsing green beacon to complete the sector. Complete a sector without using the flashlight for the Darkness Master bonus!
              </p>
            </div>
          </div>

          {/* Controls Summary */}
          <div className="flex items-start gap-3 bg-slate-950/80 p-3 rounded border border-slate-800">
            <div className="p-2 rounded bg-slate-900 text-cyan-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 font-display">UNIVERSAL CONTROLS</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                • Keyboard: WASD / Arrow Keys<br />
                • Mouse: Click & Drag to guide ball<br />
                • On-Screen: D-Pad arrows & Flash button<br />
                • Touch: Drag anywhere for virtual joystick
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-display text-sm tracking-widest uppercase rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
        >
          I AM READY
        </button>
      </div>
    </div>
  );
};
