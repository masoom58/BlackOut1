/**
 * BLACKOUT — Core Game Engine
 * 
 * Orchestrates main loop, state machine, rendering pipeline, responsive scaling,
 * audio triggers, dynamic blackout patterns, risk routes, hunters, and platform lifecycle.
 */

import { sound } from '../audio/SoundSynthesizer';
import { GameConfig, QualityConfig } from '../config/GameConfig';
import { InputManager } from '../input/InputManager';
import { getPlatform } from '../platform';
import { storage } from '../storage/StorageManager';
import { Collision } from './Collision';
import { DifficultyManager, SectorDifficulty } from './Difficulty';
import { HazardManager } from './Hazard';
import { Player } from './Player';
import { ProceduralGenerator } from './ProceduralGenerator';
import { FloatingText, GameState, Hazard, Particle, SectorData, Wall } from './Types';
import { VisibilitySystem } from './VisibilitySystem';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onScoreUpdate: (
    score: number,
    sector: number,
    energy: number,
    revealTime: number,
    combo: number,
    pattern: string,
    isExtreme: boolean
  ) => void;
  onGameOver: (
    finalScore: number,
    sector: number,
    isHighScore: boolean,
    duration: number,
    bestCombo: number,
    closeCalls: number
  ) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  public state: GameState = 'BOOT';
  public input: InputManager;
  private visibilitySystem: VisibilitySystem;
  private player: Player;

  public currentSector: SectorData | null = null;
  public sectorIndex = 1;
  public score = 0;
  public gameDurationSeconds = 0;
  public revealTimeRemaining = 0;
  public blackoutTransitionTimer = 0;
  public lightCollapseTimer = 0;
  public blackoutTime = 0;
  public nearMissTimer = 0;
  private nearMissCooldown = 0;
  public nearMissCount = 0;
  public comboStreak = 0;
  public bestComboStreak = 0;
  public consecutiveNoFlashClears = 0;

  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public diffConfig: SectorDifficulty | null = null;

  // Frame timing
  private lastTime = 0;
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  // Scaling & Viewport
  public scale = 1;
  public offsetX = 0;
  public offsetY = 0;
  public viewportWidth = 960;
  public viewportHeight = 640;

  // Performance quality
  private qualityConfig: QualityConfig = GameConfig.quality.high;

  // Mouse & Pointer click-to-move steering
  private pointerActive = false;
  private pointerWorldX = 0;
  private pointerWorldY = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.input = new InputManager(() => this.togglePause());
    this.visibilitySystem = new VisibilitySystem();
    this.player = new Player({ x: 100, y: 100 });

    this.applyQualitySettings();
    this.bindWindowEvents();
    this.bindCanvasEvents();
    this.resizeCanvas();
  }

  public applyQualitySettings(): void {
    const settings = storage.getSettings();
    if (settings.quality === 'low') {
      this.qualityConfig = GameConfig.quality.low;
    } else if (settings.quality === 'med') {
      this.qualityConfig = GameConfig.quality.med;
    } else {
      this.qualityConfig = GameConfig.quality.high;
    }
  }

  private bindWindowEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    window.addEventListener('pointermove', this.handleCanvasPointerMove);
    window.addEventListener('pointerup', this.handleCanvasPointerUp);
    window.addEventListener('pointercancel', this.handleCanvasPointerUp);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    }
    window.removeEventListener('pointermove', this.handleCanvasPointerMove);
    window.removeEventListener('pointerup', this.handleCanvasPointerUp);
    window.removeEventListener('pointercancel', this.handleCanvasPointerUp);
    this.input.destroy();
    sound.stopAmbientDrone();
  }

  private handleCanvasPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.canvas.focus();
    this.pointerActive = true;
    this.updatePointerWorldPos(e.clientX, e.clientY);
  };

  private handleCanvasPointerMove = (e: PointerEvent): void => {
    if (this.pointerActive) {
      this.updatePointerWorldPos(e.clientX, e.clientY);
    }
  };

  private handleCanvasPointerUp = (): void => {
    this.pointerActive = false;
  };

  private updatePointerWorldPos(clientX: number, clientY: number): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    this.pointerWorldX = (canvasX - this.offsetX) / (this.scale || 1);
    this.pointerWorldY = (canvasY - this.offsetY) / (this.scale || 1);
  }

  public setDpad(dx: number, dy: number): void {
    this.input.setDpad(dx, dy);
  }

  private handleResize = (): void => {
    this.resizeCanvas();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden && (this.state === 'REVEAL' || this.state === 'BLACKOUT')) {
      this.pauseGame();
    }
  };

  private handleWindowBlur = (): void => {
    if (this.state === 'REVEAL' || this.state === 'BLACKOUT') {
      this.pauseGame();
    }
  };

  public resizeCanvas(): void {

    if (!this.canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.qualityConfig.resolutionScale;
    const rect = this.canvas.parentElement?.getBoundingClientRect() || {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const displayWidth = rect.width;
    const displayHeight = rect.height;

    this.canvas.width = Math.floor(displayWidth * dpr);
    this.canvas.height = Math.floor(displayHeight * dpr);

    this.viewportWidth = displayWidth;
    this.viewportHeight = displayHeight;

    const targetW = GameConfig.world.baseWidth;
    const targetH = GameConfig.world.baseHeight;

    const scaleX = displayWidth / targetW;
    const scaleY = displayHeight / targetH;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (displayWidth - targetW * this.scale) / 2;
    this.offsetY = (displayHeight - targetH * this.scale) / 2;
  }

  public startNewGame(): void {
    sound.ensureContext();
    sound.startAmbientDrone();

    this.sectorIndex = 1;
    this.score = 0;
    this.gameDurationSeconds = 0;
    this.blackoutTime = 0;
    this.nearMissTimer = 0;
    this.nearMissCooldown = 0;
    this.nearMissCount = 0;
    this.comboStreak = 0;
    this.bestComboStreak = 0;
    this.consecutiveNoFlashClears = 0;
    this.particles = [];
    this.floatingTexts = [];

    const platform = getPlatform();
    platform.gameplayStart();

    this.loadSector(this.sectorIndex);
    this.setState('REVEAL');
    sound.playRadarTick(1.2);

    this.lastTime = performance.now();
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  }

  private loadSector(index: number): void {
    this.diffConfig = DifficultyManager.getDifficultyForSector(index);
    this.currentSector = ProceduralGenerator.generateSector(
      index,
      GameConfig.world.baseWidth,
      GameConfig.world.baseHeight
    );

    this.player.reset(this.currentSector.playerSpawn);
    this.revealTimeRemaining = this.currentSector.revealDuration;
    this.blackoutTime = 0;

    if (this.currentSector.isExtremeSector) {
      sound.playExtremeAlert();
      this.addFloatingText(
        this.currentSector.width / 2,
        this.currentSector.height / 2 - 40,
        'EXTREME PROTOCOL: NO SECOND CHANCE',
        '#ef4444',
        2.2
      );
    }
  }

  public setState(newState: GameState): void {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  public togglePause(): void {
    if (this.state === 'REVEAL' || this.state === 'BLACKOUT') {
      this.pauseGame();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  public pauseGame(): void {
    if (this.state === 'REVEAL' || this.state === 'BLACKOUT') {
      this.setState('PAUSED');
      getPlatform().gameplayStop();
    }
  }

  public resumeGame(): void {
    if (this.state === 'PAUSED') {
      this.lastTime = performance.now();
      this.setState(this.revealTimeRemaining > 0 ? 'REVEAL' : 'BLACKOUT');
      getPlatform().gameplayStart();
    }
  }

  public quitToMenu(): void {
    this.setState('MENU');
    getPlatform().gameplayStop();
    sound.stopAmbientDrone();
  }

  public cutLightsAndStart(): void {
    if (this.state === 'REVEAL') {
      this.revealTimeRemaining = 0;
      this.blackoutTransitionTimer = 0.45;
      this.lightCollapseTimer = 0.35;
      this.blackoutTime = 0;
      this.setState('BLACKOUT');
      sound.playSignatureBlackout();
    }
  }

  public addFloatingText(x: number, y: number, text: string, color = '#38bdf8', maxLife = 1.2): void {
    this.floatingTexts.push({
      id: `ft-${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      alpha: 1,
      life: 0,
      maxLife,
    });
  }

  private gameLoop = (time: number): void => {
    if (this.isDestroyed) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    if (!this.currentSector || !this.diffConfig) return;

    if (this.state === 'REVEAL' || this.state === 'BLACKOUT') {
      this.gameDurationSeconds += dt;
      const diff = this.diffConfig;

      // Score accumulation based on combo multiplier
      const comboMultiplier = Math.min(3.0, 1.0 + this.comboStreak * 0.25);
      this.score += Math.floor(GameConfig.score.pointsPerSecondSurvival * diff.scoreMultiplier * comboMultiplier * dt);

      // 1. Reveal Phase vs Blackout Phase
      let rawInput = this.input.getInput();

      // Pointer click-to-move / drag steering fallback when keyboard/Dpad is idle
      if (this.pointerActive && Math.hypot(rawInput.moveX, rawInput.moveY) < 0.05) {
        const dx = this.pointerWorldX - this.player.x;
        const dy = this.pointerWorldY - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 12) {
          const factor = Math.min(1, dist / 35);
          rawInput = {
            ...rawInput,
            moveX: (dx / dist) * factor,
            moveY: (dy / dist) * factor,
          };
        }
      }

      const isPlayerMoving = Math.hypot(rawInput.moveX, rawInput.moveY) > 0.05;

      if (this.state === 'REVEAL') {
        const prevSec = Math.ceil(this.revealTimeRemaining);
        if (this.revealTimeRemaining > 0) {
          this.revealTimeRemaining -= dt;
        }
        const curSec = Math.ceil(this.revealTimeRemaining);
        if (curSec < prevSec && curSec > 0) {
          sound.playRadarTick(1.0 + (3 - curSec) * 0.25);
        }

        // User request 3: "make some tough and light off after player can move only"
        // Lights cut off into Blackout ONLY after player initiates movement or presses Flashlight/Space
        if (isPlayerMoving || rawInput.flashlight) {
          this.cutLightsAndStart();
        }
      } else if (this.state === 'BLACKOUT') {
        this.blackoutTime += dt;
        if (this.blackoutTransitionTimer > 0) {
          this.blackoutTransitionTimer -= dt;
        }
      }

      if (this.lightCollapseTimer > 0) {
        this.lightCollapseTimer -= dt;
      }

      // 2. Dynamic Timed Doors Update
      const effectiveWalls: Wall[] = [...this.currentSector.walls];
      for (const door of this.currentSector.timedDoors) {
        door.timer += dt;
        const cycle = door.openDuration + door.closedDuration;
        const phaseTime = door.timer % cycle;

        const wasOpen = door.isOpen;
        door.isOpen = phaseTime < door.openDuration;

        if (door.isOpen !== wasOpen) {
          sound.playDoorState(door.isOpen);
        }

        // If door is closed, treat it as an impassable wall
        if (!door.isOpen) {
          effectiveWalls.push({
            id: door.id,
            x: door.x,
            y: door.y,
            width: door.width,
            height: door.height,
          });

          // Crushing/lethal check if door closed directly on player
          const res = Collision.testCircleVsRect(this.player.x, this.player.y, this.player.radius, door);
          if (res.collided) {
            this.handlePlayerDeath({ id: 'door-crush', type: 'pulse' });
            return;
          }
        }
      }

      // 3. Player Update (responsive with dynamic flashlight drain/recharge)
      const playerResult = this.player.update(
        dt,
        rawInput,
        effectiveWalls,
        this.qualityConfig.maxParticles,
        diff.flashlightDrainMultiplier,
        diff.flashlightRechargeMultiplier
      );

      if (playerResult.playedFlashlightOn) sound.playFlashlightOn();
      if (playerResult.playedFlashlightOff) sound.playFlashlightOff();
      if (playerResult.isMoving) sound.playMove();

      this.visibilitySystem.update(dt, this.state);

      // 4. Hazards Update (pass player position for hunters)
      HazardManager.updateHazards(this.currentSector.hazards, dt, { x: this.player.x, y: this.player.y });

      // 5. Spatial Danger Tension Audio (stereo panned & rising frequency)
      if (this.state === 'BLACKOUT') {
        const nearestHazard = HazardManager.getNearestHazard(this.currentSector.hazards, this.player);
        if (nearestHazard) {
          const distRatio = Math.max(0, Math.min(1, nearestHazard.distance / 240));
          const panX = (nearestHazard.x - this.player.x) / 240;
          sound.updateSpatialDanger(distRatio, panX);
        }
      }

      // 6. Near-Miss / Close Call Detection
      if (this.nearMissCooldown > 0) {
        this.nearMissCooldown -= dt;
      }
      if (this.nearMissTimer > 0) {
        this.nearMissTimer -= dt;
      }

      if (this.nearMissCooldown <= 0) {
        const nearMissHazard = HazardManager.checkNearMiss(this.currentSector.hazards, this.player);
        if (nearMissHazard) {
          this.nearMissCount++;
          this.nearMissCooldown = 0.8;
          this.nearMissTimer = 0.45;
          sound.playNearMiss();
          this.score += 75;
          this.addFloatingText(this.player.x, this.player.y - 18, '⚡ CLOSE CALL +75', '#f59e0b', 0.9);
        }
      }

      // 7. Risk Orbs Collection
      for (const orb of this.currentSector.riskOrbs) {
        if (!orb.collected) {
          orb.pulseTimer += dt;
          if (Collision.testCircleVsCircle(this.player.x, this.player.y, this.player.radius, orb.x, orb.y, orb.radius)) {
            orb.collected = true;
            sound.playRiskCollect();
            this.score += orb.points;
            this.comboStreak++;
            this.bestComboStreak = Math.max(this.bestComboStreak, this.comboStreak);
            this.addFloatingText(orb.x, orb.y - 15, `+${orb.points} RISK REWARD!`, '#ec4899', 1.4);

            // Radiant particle explosion
            for (let i = 0; i < 18; i++) {
              const a = (i / 18) * Math.PI * 2;
              const spd = 70 + Math.random() * 80;
              this.particles.push({
                x: orb.x,
                y: orb.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                radius: 2.5,
                alpha: 1,
                color: '#ec4899',
                life: 0,
                maxLife: 0.5,
              });
            }
          }
        }
      }

      // 8. Lethal Collision Check
      const lethalHazard = HazardManager.checkLethalCollision(this.currentSector.hazards, this.player);
      if (lethalHazard) {
        this.handlePlayerDeath(lethalHazard);
        return;
      }

      // 9. Exit Beacon Collision Check
      const distToExit = Math.hypot(
        this.player.x - this.currentSector.exitBeacon.x,
        this.player.y - this.currentSector.exitBeacon.y
      );

      if (distToExit <= this.player.radius + this.currentSector.exitBeacon.radius) {
        this.handleSectorCleared();
      }

      // UI Notifications
      this.callbacks.onScoreUpdate(
        this.score,
        this.sectorIndex,
        this.player.flashlightEnergy,
        this.revealTimeRemaining,
        comboMultiplier,
        this.currentSector.blackoutPattern,
        this.currentSector.isExtremeSector
      );
    }

    // Particles decay
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = 1 - p.life / p.maxLife;
      }
    }

    // Floating text decay
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y -= 30 * dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      } else {
        ft.alpha = 1 - ft.life / ft.maxLife;
      }
    }
  }

  private handleSectorCleared(): void {
    sound.playSectorClear(this.currentSector?.isExtremeSector ?? false);
    getPlatform().happytime();

    const diff = this.diffConfig!;
    const comboMult = Math.min(3.0, 1.0 + this.comboStreak * 0.25);
    const sectorBonus = Math.floor(GameConfig.score.pointsPerSectorClear * diff.scoreMultiplier * comboMult);
    this.score += sectorBonus;

    // Flashlight Conservation & Darkness Master bonus
    let flashBonus = 0;
    if (!this.player.usedFlashlightThisSector) {
      this.consecutiveNoFlashClears++;
      flashBonus = 200 + this.consecutiveNoFlashClears * 50;
      this.score += flashBonus;
      this.addFloatingText(this.player.x, this.player.y - 25, `🌙 DARKNESS MASTER +${flashBonus}!`, '#a855f7', 1.5);
    } else {
      this.consecutiveNoFlashClears = 0;
      flashBonus = Math.floor(
        (this.player.flashlightEnergy / GameConfig.visibility.flashlightMaxEnergy) *
          GameConfig.score.flashlightConservationBonusMax
      );
      this.score += flashBonus;
    }

    // Stack combo streak
    this.comboStreak++;
    this.bestComboStreak = Math.max(this.bestComboStreak, this.comboStreak);

    // Radiant emerald beacon clear shockwave
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const spd = 120 + Math.random() * 140;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 3,
        alpha: 1,
        color: '#10b981',
        life: 0,
        maxLife: 0.65,
      });
    }

    this.sectorIndex += 1;
    this.loadSector(this.sectorIndex);
    this.setState('REVEAL');
    sound.playRadarTick(1.2 + Math.min(0.6, this.sectorIndex * 0.05));
  }

  private handlePlayerDeath(hazard?: Hazard | { id: string; type: string }): void {
    sound.playGameOver();
    const deathParticles = this.player.explode();
    this.particles.push(...deathParticles);

    this.setState('GAMEOVER');
    const platform = getPlatform();
    platform.gameplayStop();

    const { isNewHighScore } = storage.recordRun(
      this.score,
      this.sectorIndex,
      this.gameDurationSeconds
    );

    if (isNewHighScore) {
      platform.happytime();
    }

    this.callbacks.onGameOver(
      this.score,
      this.sectorIndex,
      isNewHighScore,
      this.gameDurationSeconds,
      this.bestComboStreak,
      this.nearMissCount
    );
  }

  private render(): void {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.qualityConfig.resolutionScale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = GameConfig.colors.voidDark;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    if (this.currentSector && this.state !== 'MENU' && this.state !== 'BOOT') {
      this.renderFloorGrid(ctx, this.currentSector.width, this.currentSector.height);
      this.renderWalls(ctx, this.currentSector.walls);
      this.renderTimedDoors(ctx, this.currentSector.timedDoors);
      this.renderRiskOrbs(ctx, this.currentSector.riskOrbs);
      this.renderExitBeacon(ctx, this.currentSector.exitBeacon);
      this.renderHazards(ctx, this.currentSector.hazards);
      this.renderPlayer(ctx);
      this.renderParticles(ctx);
      this.renderFloatingTexts(ctx);

      if (this.state === 'REVEAL') {
        this.visibilitySystem.renderRevealOverlay(
          ctx,
          this.currentSector.width,
          this.currentSector.height,
          this.revealTimeRemaining,
          this.currentSector.revealDuration,
          this.currentSector.isExtremeSector
        );
      } else if (this.state === 'BLACKOUT' || this.state === 'PAUSED' || this.state === 'GAMEOVER') {
        const settings = storage.getSettings();
        this.visibilitySystem.renderDarknessMask(
          ctx,
          this.currentSector.width,
          this.currentSector.height,
          this.player,
          this.currentSector.exitBeacon,
          settings.reducedMotion,
          this.currentSector.blackoutPattern,
          this.blackoutTime,
          this.nearMissTimer
        );
      }

      // Signature Visual Event: The Light Collapse
      // Illumination contracts rapidly into the player's singularity core before blackout
      if (this.lightCollapseTimer > 0) {
        const progress = this.lightCollapseTimer / 0.35; // 1 down to 0
        const maxR = Math.hypot(this.currentSector.width, this.currentSector.height) * 0.7;
        const collapseR = progress * maxR;

        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
        ctx.beginPath();
        ctx.rect(0, 0, this.currentSector.width, this.currentSector.height);
        ctx.arc(this.player.x, this.player.y, Math.max(1, collapseR), 0, Math.PI * 2, true);
        ctx.fill();

        // High-voltage electromagnetic contraction perimeter
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, Math.max(1, collapseR), 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      if (this.blackoutTransitionTimer > 0) {
        const flashAlpha = (this.blackoutTransitionTimer / 0.45) * 0.35;
        ctx.fillStyle = `rgba(56, 189, 248, ${flashAlpha})`;
        ctx.fillRect(0, 0, this.currentSector.width, this.currentSector.height);
      }
    }

    ctx.restore();
  }


  private renderFloorGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.strokeStyle = GameConfig.colors.gridLine;
    ctx.lineWidth = 1;
    const gridSize = 40;
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderWalls(ctx: CanvasRenderingContext2D, walls: SectorData['walls']): void {
    ctx.save();
    for (const wall of walls) {
      ctx.fillStyle = GameConfig.colors.wallFill;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = GameConfig.colors.wallStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
    ctx.restore();
  }

  private renderTimedDoors(ctx: CanvasRenderingContext2D, doors: SectorData['timedDoors']): void {
    ctx.save();
    const time = Date.now() / 150;
    for (const door of doors) {
      if (door.isOpen) {
        // Open door: green threshold holographic beam
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fillRect(door.x, door.y, door.width, door.height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);
        ctx.strokeRect(door.x, door.y, door.width, door.height);
        ctx.setLineDash([]);
      } else {
        // Closed laser door: electric red barrier
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(door.x, door.y, door.width, door.height);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(door.x, door.y, door.width, door.height);

        // Crackling laser lines
        ctx.strokeStyle = '#fee2e2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const yOffset = (time % 8) * (door.height / 8);
        ctx.moveTo(door.x, door.y + yOffset);
        ctx.lineTo(door.x + door.width, door.y + yOffset);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderRiskOrbs(ctx: CanvasRenderingContext2D, orbs: SectorData['riskOrbs']): void {
    ctx.save();
    const time = Date.now() / 1000;
    for (const orb of orbs) {
      if (orb.collected) continue;

      // Pulsing diamond
      const pulse = 1 + Math.sin(time * 5) * 0.18;
      const r = orb.radius * pulse;

      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.rotate(time * 2);

      ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#fbcfe8';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+RISK', orb.x, orb.y - r - 4);
    }
    ctx.restore();
  }

  private renderExitBeacon(ctx: CanvasRenderingContext2D, beacon: SectorData['exitBeacon']): void {
    ctx.save();
    const time = Date.now() / 1000;
    const pulseScale = 1 + Math.sin(time * 4) * 0.15;
    const auraGrad = ctx.createRadialGradient(
      beacon.x,
      beacon.y,
      beacon.radius * 0.3,
      beacon.x,
      beacon.y,
      beacon.radius * 1.8 * pulseScale
    );
    auraGrad.addColorStop(0, 'rgba(16, 185, 129, 0.7)');
    auraGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
    auraGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, beacon.radius * 1.8 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = GameConfig.colors.exitCore;
    ctx.lineWidth = 2.5;

    ctx.save();
    ctx.translate(beacon.x, beacon.y);
    ctx.rotate(time * 1.5);
    ctx.strokeRect(-beacon.radius * 0.6, -beacon.radius * 0.6, beacon.radius * 1.2, beacon.radius * 1.2);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderHazards(ctx: CanvasRenderingContext2D, hazards: Hazard[]): void {
    ctx.save();
    const time = Date.now() / 1000;

    for (const h of hazards) {
      if (h.type === 'patrol') {
        // Hazard 1: "Echo" — Undulating distorted light pattern with trailing ripples
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(h.waypointA.x, h.waypointA.y);
        ctx.lineTo(h.waypointB.x, h.waypointB.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Undulating dual ripple
        const pulse = 1 + Math.sin(time * 6 + h.x * 0.05) * 0.18;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * 1.35 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Echo core
        const grad = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, h.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ef4444');
        grad.addColorStop(1, 'rgba(185, 28, 28, 0.1)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (h.type === 'hunter') {
        // Hazard 2: "Void Stalker" — Angular dark-matter chassis with intense ruby tracker eye
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);

        // Faint wake
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.beginPath();
        ctx.moveTo(-h.radius * 1.5, -h.radius * 0.6);
        ctx.lineTo(-h.radius * 2.2, 0);
        ctx.lineTo(-h.radius * 1.5, h.radius * 0.6);
        ctx.fill();

        // Stealth Chassis
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h.radius * 1.3, 0);
        ctx.lineTo(-h.radius * 0.8, -h.radius * 0.85);
        ctx.lineTo(-h.radius * 0.4, 0);
        ctx.lineTo(-h.radius * 0.8, h.radius * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Intense Ruby Tracker Slit
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(h.radius * 0.2, -1.5, 4, 3);
        ctx.restore();
      } else if (h.type === 'scanner') {
        // Hazard 3: "Surveillance Sweep" — Moving transmitter with radar search cone
        ctx.save();
        // Base transmitter
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotating optical ticks
        const rot = time * 2;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4, rot, rot + Math.PI);
        ctx.stroke();

        // Sweeping search cone
        const startA = h.sweepAngle - h.beamFov / 2;
        const endA = h.sweepAngle + h.beamFov / 2;
        const coneGrad = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.beamLength);
        coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        coneGrad.addColorStop(0.8, 'rgba(239, 68, 68, 0.08)');
        coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.arc(h.x, h.y, h.beamLength, startA, endA);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (h.type === 'laser') {
        // Hazard 4: "Fracture Filament" — Crackling high-voltage laser beam
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.pivot.x, h.pivot.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Forward Beam
        const endX = h.pivot.x + Math.cos(h.angle) * h.length;
        const endY = h.pivot.y + Math.sin(h.angle) * h.length;

        // Outer glow
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = h.beamWidth * 2.4;
        ctx.beginPath();
        ctx.moveTo(h.pivot.x, h.pivot.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Hot white-pink core filament
        ctx.strokeStyle = '#fff1f2';
        ctx.lineWidth = h.beamWidth * 0.75;
        ctx.beginPath();
        ctx.moveTo(h.pivot.x, h.pivot.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Double-sided reverse beam
        if (h.doubleSided) {
          const backX = h.pivot.x + Math.cos(h.angle + Math.PI) * h.length;
          const backY = h.pivot.y + Math.sin(h.angle + Math.PI) * h.length;

          ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.lineWidth = h.beamWidth * 2.4;
          ctx.beginPath();
          ctx.moveTo(h.pivot.x, h.pivot.y);
          ctx.lineTo(backX, backY);
          ctx.stroke();

          ctx.strokeStyle = '#fff1f2';
          ctx.lineWidth = h.beamWidth * 0.75;
          ctx.beginPath();
          ctx.moveTo(h.pivot.x, h.pivot.y);
          ctx.lineTo(backX, backY);
          ctx.stroke();
        }
      } else if (h.type === 'pulse') {
        // Hazard 5: "Resonance Node" — Bio-electric breathing node
        const isLethal = h.phase === 'active';
        const isWarning = h.phase === 'warning';

        ctx.strokeStyle = isLethal ? '#ef4444' : isWarning ? '#f59e0b' : 'rgba(51, 65, 85, 0.6)';
        ctx.lineWidth = isLethal ? 2.5 : 1.2;

        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (isLethal) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fill();
        } else if (isWarning) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /**
   * Original Player Entity: "The Photonic Singularity"
   * A pure neutral white light core surrounded by dual geometric orbital reticles
   * and a razor-sharp forward directional photon slit.
   */
  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    if (this.player.isDead) return;

    ctx.save();

    // 1. Fading persistence-of-vision light trail
    for (const p of this.player.trail) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const px = this.player.x;
    const py = this.player.y;
    const pr = this.player.radius;

    // 2. Subtle electromagnetic corona
    const coronaGrad = ctx.createRadialGradient(px, py, pr * 0.3, px, py, pr * 2.4);
    coronaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
    coronaGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
    coronaGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dual Geometric Orbital Reticle
    const rotSpeed = Date.now() / 600;

    // Inner orbital ring with 4 cardinal micro-optic ticks
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.45, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + rotSpeed * 0.5;
      const x1 = px + Math.cos(a) * (pr * 1.3);
      const y1 = py + Math.sin(a) * (pr * 1.3);
      const x2 = px + Math.cos(a) * (pr * 1.6);
      const y2 = py + Math.sin(a) * (pr * 1.6);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Outer segmented optical reticle that rotates in direction of facing
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.85, this.player.facingAngle - 1.2, this.player.facingAngle + 1.2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Pure Light Singularity Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // 5. Forward Directional Optic Slit
    const slitX = px + Math.cos(this.player.facingAngle) * (pr * 0.7);
    const slitY = py + Math.sin(this.player.facingAngle) * (pr * 0.7);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(slitX, slitY, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Ready Tactical Holo-Reticle during Reveal Phase
    if (this.state === 'REVEAL') {
      const scanRot = Date.now() / 400;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(px, py, pr * 2.3, scanRot, scanRot + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#7dd3fc';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[MOVE TO ENGAGE]', px, py - pr * 2.6);
    }

    ctx.restore();
  }


  private renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
