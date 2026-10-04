/**
 * BLACKOUT — Main Application Container
 * 
 * Mounts canvas rendering engine, manages UI overlays, platform lifecycle,
 * and responsive viewport scaling.
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './game/Types';
import { TouchState } from './input/TouchInput';
import { getPlatform, initPlatform } from './platform';
import { IPlatformAdapter } from './platform/PlatformAdapter';
import { GameStats, storage } from './storage/StorageManager';
import { GameOverModal } from './ui/GameOverModal';
import { HowToPlayModal } from './ui/HowToPlayModal';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { PauseModal } from './ui/PauseModal';
import { SettingsModal } from './ui/SettingsModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('BOOT');
  const [platform, setPlatform] = useState<IPlatformAdapter>(getPlatform());
  const [stats, setStats] = useState<GameStats>(storage.getStats());

  // In-game HUD reactive state
  const [score, setScore] = useState(0);
  const [sector, setSector] = useState(1);
  const [energy, setEnergy] = useState(100);
  const [revealTimeRemaining, setRevealTimeRemaining] = useState(0);
  const [combo, setCombo] = useState(1.0);
  const [pattern, setPattern] = useState('NORMAL');
  const [isExtreme, setIsExtreme] = useState(false);

  // Game over state
  const [gameOverData, setGameOverData] = useState<{
    finalScore: number;
    sector: number;
    isHighScore: boolean;
    duration: number;
    bestCombo: number;
    closeCalls: number;
  }>({
    finalScore: 0,
    sector: 1,
    isHighScore: false,
    duration: 0,
    bestCombo: 0,
    closeCalls: 0,
  });

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Touch controls reactive state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [touchState, setTouchState] = useState<TouchState>({
    moveX: 0,
    moveY: 0,
    flashlight: false,
    joystickActive: false,
    joystickBaseX: 0,
    joystickBaseY: 0,
    joystickStickX: 0,
    joystickStickY: 0,
  });

  // Initialize Platform & Game Engine
  useEffect(() => {
    let isMounted = true;

    async function setupGame() {
      // 1. Initialize Platform Adapter (CrazyGames v3 SDK or LocalPlatform)
      const activePlatform = await initPlatform();
      if (!isMounted) return;
      setPlatform(activePlatform);

      activePlatform.loadingStart();

      // 2. Initialize Canvas & Game Engine
      if (canvasRef.current) {
        const engine = new GameEngine(canvasRef.current, {
          onStateChange: (newState) => {
            if (isMounted) setGameState(newState);
          },
          onScoreUpdate: (curScore, curSector, curEnergy, curRevealTime, curCombo, curPattern, curExtreme) => {
            if (isMounted) {
              setScore(curScore);
              setSector(curSector);
              setEnergy(curEnergy);
              setRevealTimeRemaining(curRevealTime);
              setCombo(curCombo);
              setPattern(curPattern);
              setIsExtreme(curExtreme);
            }
          },
          onGameOver: (finalScore, curSector, isHighScore, duration, bestCombo, closeCalls) => {
            if (isMounted) {
              setGameOverData({
                finalScore,
                sector: curSector,
                isHighScore,
                duration,
                bestCombo,
                closeCalls,
              });
              setStats(storage.getStats());
            }
          },
        });

        engineRef.current = engine;
        setIsTouchDevice(engine.input.hasTouchCapability());

        if (containerRef.current) {
          engine.input.bindTouchContainer(containerRef.current);
        }

        // Ready for Menu
        activePlatform.loadingStop();
        engine.setState('MENU');
      }
    }

    setupGame();

    return () => {
      isMounted = false;
      engineRef.current?.destroy();
    };
  }, []);

  // Update touch visualizer state for HUD
  useEffect(() => {
    let animId: number;
    const pollTouch = () => {
      if (engineRef.current && isTouchDevice) {
        setTouchState({ ...engineRef.current.input.getTouchState() });
      }
      animId = requestAnimationFrame(pollTouch);
    };
    animId = requestAnimationFrame(pollTouch);

    return () => cancelAnimationFrame(animId);
  }, [isTouchDevice]);

  const handleStartGame = () => {
    window.focus();
    canvasRef.current?.focus();
    engineRef.current?.startNewGame();
  };

  const handlePause = () => {
    engineRef.current?.pauseGame();
  };

  const handleResume = () => {
    window.focus();
    canvasRef.current?.focus();
    engineRef.current?.resumeGame();
  };

  const handleRestart = () => {
    window.focus();
    canvasRef.current?.focus();
    engineRef.current?.startNewGame();
  };

  const handleQuitToMenu = () => {
    engineRef.current?.quitToMenu();
  };

  const handleFlashlightTouch = (active: boolean) => {
    engineRef.current?.input.touch.setFlashlightTouch(active);
  };

  const handleDpad = (dx: number, dy: number) => {
    engineRef.current?.setDpad(dx, dy);
  };

  const handleCutLights = () => {
    engineRef.current?.cutLightsAndStart();
  };

  const handleQualityChange = () => {
    engineRef.current?.applyQualitySettings();
    engineRef.current?.resizeCanvas();
  };

  return (
    <div
      ref={containerRef}
      onClick={() => {
        window.focus();
        canvasRef.current?.focus();
      }}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none touch-none"
    >
      {/* 2D Canvas Engine */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="w-full h-full block bg-slate-950 cursor-crosshair outline-none"
      />

      {/* Main Menu */}
      {(gameState === 'MENU' || gameState === 'BOOT') && (
        <MainMenu
          stats={stats}
          platform={platform}
          onPlay={handleStartGame}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* In-Game HUD & Mobile Controls */}
      {(gameState === 'REVEAL' || gameState === 'BLACKOUT') && (
        <HUD
          score={score}
          sector={sector}
          energy={energy}
          isReveal={gameState === 'REVEAL'}
          revealTimeRemaining={revealTimeRemaining}
          combo={combo}
          pattern={pattern}
          isExtreme={isExtreme}
          onPause={handlePause}
          onCutLights={handleCutLights}
          isTouchDevice={isTouchDevice}
          touchState={touchState}
          onFlashlightTouch={handleFlashlightTouch}
          onDpad={handleDpad}
        />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          sector={sector}
          score={score}
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenSettings={() => setShowSettings(true)}
          onQuitToMenu={handleQuitToMenu}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal
          finalScore={gameOverData.finalScore}
          bestScore={stats.highScore}
          sectorReached={gameOverData.sector}
          durationSeconds={gameOverData.duration}
          bestCombo={gameOverData.bestCombo}
          closeCalls={gameOverData.closeCalls}
          isHighScore={gameOverData.isHighScore}
          platform={platform}
          onRestart={handleRestart}
          onQuitToMenu={handleQuitToMenu}
        />
      )}

      {/* How To Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onQualityChange={handleQualityChange}
        />
      )}
    </div>
  );
}
