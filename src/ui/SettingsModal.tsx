/**
 * BLACKOUT — Settings Modal
 * 
 * Audio controls, reduced motion, and graphics performance settings.
 */

import React, { useState } from 'react';
import { X, Volume2, VolumeX, Music, Shield, Cpu } from 'lucide-react';
import { GameSettings, storage } from '../storage/StorageManager';
import { sound } from '../audio/SoundSynthesizer';

interface SettingsModalProps {
  onClose: () => void;
  onQualityChange?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onQualityChange }) => {
  const [settings, setSettings] = useState<GameSettings>(storage.getSettings());

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = storage.saveSettings({ [key]: value });
    setSettings(updated);
    sound.updateSettings();

    if (key === 'quality') {
      onQualityChange?.();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black tracking-widest text-slate-100 font-display neon-glow-cyan mb-1">
          SETTINGS
        </h2>
        <p className="text-xs text-slate-400 font-mono mb-6">
          SYSTEM CALIBRATION
        </p>

        <div className="flex flex-col gap-4 text-left font-mono text-xs">
          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>SOUND FX</span>
            </div>
            <button
              onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                settings.soundEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Music / Ambient Drone Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Music className={`w-4 h-4 ${settings.musicEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>AMBIENT DRONE</span>
            </div>
            <button
              onClick={() => updateSetting('musicEnabled', !settings.musicEnabled)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                settings.musicEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-slate-300">
              <span>MASTER VOLUME</span>
              <span className="text-cyan-400">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>REDUCED MOTION</span>
            </div>
            <button
              onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                settings.reducedMotion ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.reducedMotion ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Performance Quality Preset */}
          <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>GRAPHICS QUALITY</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['auto', 'high', 'med', 'low'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => updateSetting('quality', q)}
                  className={`py-1.5 text-[10px] uppercase font-bold rounded transition-colors cursor-pointer ${
                    settings.quality === q
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-display uppercase tracking-wider rounded transition-colors cursor-pointer"
        >
          CONFIRM
        </button>
      </div>
    </div>
  );
};
