/**
 * BLACKOUT — Visibility & Darkness Mask System
 * 
 * Handles Reveal Phase radar sweep, transition surges, and dynamic Blackout patterns:
 * NORMAL, DEEP, FLICKER, PULSE, and FALSE_FLASH, plus near-miss danger vignettes.
 */

import { GameConfig } from '../config/GameConfig';
import { Player } from './Player';
import { BlackoutPattern, ExitBeacon, GameState } from './Types';

export class VisibilitySystem {
  private radarScanProgress = 0;
  private maskCanvas: HTMLCanvasElement | null = null;
  private maskCtx: CanvasRenderingContext2D | null = null;

  public update(dt: number, state: GameState): void {
    if (state === 'REVEAL') {
      this.radarScanProgress = (this.radarScanProgress + dt * 1.1) % 1;
    } else {
      this.radarScanProgress = 0;
    }
  }

  private getMaskContext(width: number, height: number): CanvasRenderingContext2D | null {
    if (!this.maskCanvas) {
      this.maskCanvas = document.createElement('canvas');
      this.maskCanvas.width = width;
      this.maskCanvas.height = height;
      this.maskCtx = this.maskCanvas.getContext('2d');
    } else if (this.maskCanvas.width !== width || this.maskCanvas.height !== height) {
      this.maskCanvas.width = width;
      this.maskCanvas.height = height;
      this.maskCtx = this.maskCanvas.getContext('2d');
    }
    return this.maskCtx;
  }

  public renderRevealOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    revealTimeRemaining: number,
    revealTotalTime: number,
    isExtreme: boolean
  ): void {
    const sweepX = this.radarScanProgress * width;

    // Glowing radar sweep line
    const grad = ctx.createLinearGradient(sweepX - 90, 0, sweepX + 10, 0);
    if (isExtreme) {
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(0.85, 'rgba(239, 68, 68, 0.18)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.55)');
    } else {
      grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.14)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.45)');
    }

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, sweepX, height);

    ctx.strokeStyle = isExtreme ? 'rgba(239, 68, 68, 0.9)' : 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, height);
    ctx.stroke();

    // Top tactical reveal countdown indicator
    const barWidth = Math.min(width * 0.55, 420);
    const barHeight = 8;
    const barX = (width - barWidth) / 2;
    const barY = 28;

    const progress = Math.max(0, Math.min(1, revealTimeRemaining / revealTotalTime));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(barX - 6, barY - 6, barWidth + 12, barHeight + 12);
    ctx.strokeStyle = isExtreme ? 'rgba(239, 68, 68, 0.8)' : 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - 6, barY - 6, barWidth + 12, barHeight + 12);

    // Bar fill
    const barFillGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    if (isExtreme) {
      barFillGrad.addColorStop(0, '#ef4444');
      barFillGrad.addColorStop(1, '#f97316');
    } else if (revealTimeRemaining > 1.0) {
      barFillGrad.addColorStop(0, '#06b6d4');
      barFillGrad.addColorStop(1, '#38bdf8');
    } else {
      barFillGrad.addColorStop(0, '#ef4444');
      barFillGrad.addColorStop(1, '#f59e0b');
    }
    ctx.fillStyle = barFillGrad;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // Text label
    ctx.fillStyle = isExtreme ? '#fecaca' : '#e0f2fe';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isExtreme
        ? `⚠️ EXTREME PROTOCOL: HIGHEST CASUALTY HAZARDS`
        : `STUDY ROUTE • MEMORIZE SECTOR HAZARDS`,
      width / 2,
      barY - 10
    );

    // Prompt to move
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `LIGHTS OFF WHEN YOU MOVE • READY TO ENGAGE`,
      width / 2,
      barY + barHeight + 16
    );

    ctx.restore();
  }

  public renderDarknessMask(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: Player,
    exitBeacon: ExitBeacon,
    reducedMotion: boolean,
    pattern: BlackoutPattern = 'NORMAL',
    blackoutTime = 0,
    nearMissTimer = 0
  ): void {
    ctx.save();

    const maskCtx = this.getMaskContext(width, height);
    if (!maskCtx || !this.maskCanvas) {
      ctx.restore();
      return;
    }

    // Determine if pattern is flickering or flashing
    let darknessOpacity = 0.985;
    if (pattern === 'FLICKER') {
      const cycle = blackoutTime % 2.4;
      if (cycle < 0.12) {
        darknessOpacity = 0.35; // Brief snapshot flash
      }
    } else if (pattern === 'FALSE_FLASH') {
      if (blackoutTime > 3.0 && blackoutTime < 3.22) {
        darknessOpacity = 0.45;
      }
    } else if (pattern === 'TOTAL_BLACKOUT') {
      darknessOpacity = 0.995; // Absolute darkness
    }

    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = `rgba(2, 6, 23, ${darknessOpacity})`;
    maskCtx.fillRect(0, 0, width, height);
    maskCtx.globalCompositeOperation = 'destination-out';

    // Calculate baseline vision radius based on pattern
    let baseRadius: number = GameConfig.visibility.normalVisionRadius;
    if (pattern === 'DEEP') {
      baseRadius = 46; // Claustrophobic deep blackout
    } else if (pattern === 'TOTAL_BLACKOUT') {
      baseRadius = 32; // Immediate character aura only
    } else if (pattern === 'PULSE') {
      baseRadius = baseRadius + (reducedMotion ? 0 : Math.sin(blackoutTime * 3.2) * 16);
    }


    // A. Ambient player vision cutout
    const ambientGrad = maskCtx.createRadialGradient(
      player.x,
      player.y,
      baseRadius * 0.25,
      player.x,
      player.y,
      baseRadius
    );
    ambientGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    ambientGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    maskCtx.fillStyle = ambientGrad;
    maskCtx.beginPath();
    maskCtx.arc(player.x, player.y, baseRadius, 0, Math.PI * 2);
    maskCtx.fill();

    // B. Flashlight expanded radius + directional conic beam
    if (player.flashlightActive && player.flashlightEnergy > 0) {
      const bonusRadius = baseRadius + GameConfig.visibility.flashlightBonusRadius;
      const flashAmbientGrad = maskCtx.createRadialGradient(
        player.x,
        player.y,
        bonusRadius * 0.2,
        player.x,
        player.y,
        bonusRadius
      );
      flashAmbientGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      flashAmbientGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.75)');
      flashAmbientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      maskCtx.fillStyle = flashAmbientGrad;
      maskCtx.beginPath();
      maskCtx.arc(player.x, player.y, bonusRadius, 0, Math.PI * 2);
      maskCtx.fill();

      // Directional Flashlight Cone
      const beamLength = GameConfig.visibility.flashlightBeamLength;
      const beamAngle = GameConfig.visibility.flashlightBeamAngle;
      const startAngle = player.facingAngle - beamAngle / 2;
      const endAngle = player.facingAngle + beamAngle / 2;

      const coneGrad = maskCtx.createRadialGradient(
        player.x,
        player.y,
        20,
        player.x,
        player.y,
        beamLength
      );
      coneGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      coneGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.9)');
      coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      maskCtx.fillStyle = coneGrad;
      maskCtx.beginPath();
      maskCtx.moveTo(player.x, player.y);
      maskCtx.arc(player.x, player.y, beamLength, startAngle, endAngle);
      maskCtx.closePath();
      maskCtx.fill();
    }

    // C. Beacon rhythmic pulse in darkness
    const beaconPulsePhase = (Date.now() % 2400) / 2400;
    const beaconPingRadius = 36 + (reducedMotion ? 0 : Math.sin(beaconPulsePhase * Math.PI) * 10);
    const beaconGrad = maskCtx.createRadialGradient(
      exitBeacon.x,
      exitBeacon.y,
      6,
      exitBeacon.x,
      exitBeacon.y,
      beaconPingRadius
    );
    beaconGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    beaconGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    maskCtx.fillStyle = beaconGrad;
    maskCtx.beginPath();
    maskCtx.arc(exitBeacon.x, exitBeacon.y, beaconPingRadius, 0, Math.PI * 2);
    maskCtx.fill();

    // Composite darkness veil over the main canvas
    if (this.maskCanvas) {
      ctx.drawImage(this.maskCanvas, 0, 0);
    }

    // Flashlight volumetric light mist
    if (player.flashlightActive && player.flashlightEnergy > 0) {
      const beamLength = GameConfig.visibility.flashlightBeamLength;
      const beamAngle = GameConfig.visibility.flashlightBeamAngle;
      const startAngle = player.facingAngle - beamAngle / 2;
      const endAngle = player.facingAngle + beamAngle / 2;

      const beamLightGrad = ctx.createRadialGradient(
        player.x,
        player.y,
        20,
        player.x,
        player.y,
        beamLength
      );
      beamLightGrad.addColorStop(0, 'rgba(224, 242, 254, 0.14)');
      beamLightGrad.addColorStop(0.7, 'rgba(224, 242, 254, 0.05)');
      beamLightGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');

      ctx.fillStyle = beamLightGrad;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, beamLength, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }

    // Near-Miss Danger Pulse Vignette
    if (nearMissTimer > 0) {
      const vigAlpha = (nearMissTimer / 0.4) * 0.38;
      const vigGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.28,
        width / 2,
        height / 2,
        width * 0.55
      );
      vigGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      vigGrad.addColorStop(1, `rgba(239, 68, 68, ${vigAlpha})`);

      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
}
