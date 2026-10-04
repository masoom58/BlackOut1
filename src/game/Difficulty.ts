/**
 * BLACKOUT — Advanced Multi-System Difficulty Manager
 * 
 * Manages speed, visibility, blackout patterns, hazard variants,
 * environmental timed doors, and extreme protocol encounters.
 */

import { GameConfig } from '../config/GameConfig';
import { BlackoutPattern } from './Types';

export interface SectorDifficulty {
  revealDuration: number;
  patrolCount: number;
  hunterCount: number;
  scannerCount: number;
  laserCount: number;
  pulseCount: number;
  timedDoorCount: number;
  hasRiskRoute: boolean;
  hazardSpeedMultiplier: number;
  scoreMultiplier: number;
  gridComplexity: number;
  blackoutPattern: BlackoutPattern;
  isExtreme: boolean;
  flashlightDrainMultiplier: number;
  flashlightRechargeMultiplier: number;
  visionRadiusModifier: number;
}

export class DifficultyManager {
  public static getDifficultyForSector(sectorIndex: number): SectorDifficulty {
    const s = Math.max(1, sectorIndex);

    // Extreme Protocol Sectors (starts appearing at Sector 4+)
    const isExtreme = s >= 4 && (s % 4 === 0 || (s > 8 && Math.random() < 0.28));

    // Reveal duration starts at 3.2s, scaling down to at least 1.8s
    const baseReveal = isExtreme
      ? 1.8
      : Math.max(GameConfig.visibility.revealDurationMin, GameConfig.visibility.revealDurationBase - (s - 1) * 0.14);

    // Blackout Pattern selection
    let blackoutPattern: BlackoutPattern = 'NORMAL';
    if (s === 1 || s === 2) {
      blackoutPattern = 'NORMAL';
    } else if (s === 3) {
      blackoutPattern = 'FLICKER';
    } else if (s === 4) {
      blackoutPattern = 'PULSE';
    } else if (s === 5) {
      blackoutPattern = 'DEEP';
    } else if (s === 6) {
      blackoutPattern = 'FALSE_FLASH';
    } else if (s === 7) {
      blackoutPattern = 'TOTAL_BLACKOUT';
    } else {
      const patterns: BlackoutPattern[] = ['NORMAL', 'DEEP', 'FLICKER', 'PULSE', 'FALSE_FLASH', 'TOTAL_BLACKOUT'];
      blackoutPattern = patterns[(s + Math.floor(Math.random() * 2)) % patterns.length];
    }

    if (isExtreme) {
      const extremePool: BlackoutPattern[] = ['DEEP', 'PULSE', 'TOTAL_BLACKOUT'];
      blackoutPattern = extremePool[Math.floor(Math.random() * extremePool.length)];
    }


    // Hazard Composition
    let patrolCount = 1;
    let hunterCount = 0;
    let scannerCount = 0;
    let laserCount = 0;
    let pulseCount = 1;
    let timedDoorCount = 0;

    if (s === 1) {
      patrolCount = 1;
      pulseCount = 1;
    } else if (s === 2) {
      patrolCount = 2;
      pulseCount = 1;
    } else if (s === 3) {
      patrolCount = 2;
      hunterCount = 1; // Hunter introduced!
      pulseCount = 1;
      timedDoorCount = 1;
    } else if (s === 4) {
      patrolCount = 2;
      hunterCount = 1;
      laserCount = 1;
      pulseCount = 1;
      timedDoorCount = 1;
    } else if (s === 5) {
      patrolCount = 2;
      hunterCount = 1;
      scannerCount = 1; // Scanner introduced!
      laserCount = 1;
      pulseCount = 2;
      timedDoorCount = 2;
    } else {
      patrolCount = Math.min(3, 2 + Math.floor((s - 5) / 3));
      hunterCount = Math.min(2, 1 + Math.floor((s - 3) / 4));
      scannerCount = Math.min(2, 1 + Math.floor((s - 4) / 4));
      laserCount = Math.min(3, 1 + Math.floor((s - 4) / 3));
      pulseCount = Math.min(3, 2 + Math.floor((s - 5) / 3));
      timedDoorCount = Math.min(3, 1 + Math.floor((s - 3) / 3));
    }

    if (isExtreme) {
      hunterCount = Math.max(1, hunterCount + 1);
      laserCount = Math.max(1, laserCount + 1);
      timedDoorCount = Math.max(1, timedDoorCount + 1);
    }

    // Hazard Speed Multiplier
    const hazardSpeedMultiplier = Math.min(1.85, 1.0 + (s - 1) * 0.055 + (isExtreme ? 0.2 : 0));

    // Score Multiplier (huge reward for extreme)
    const scoreMultiplier = (1.0 + (s - 1) * 0.35) * (isExtreme ? 2.5 : 1.0);

    // Maze Complexity
    const gridComplexity = Math.min(1.0, 0.35 + (s - 1) * 0.08);

    // Flashlight constraints become tighter at high levels
    const flashlightDrainMultiplier = 1.0 + Math.min(0.5, (s - 1) * 0.04);
    const flashlightRechargeMultiplier = Math.max(0.65, 1.0 - (s - 1) * 0.03);

    // Vision radius modifier
    let visionRadiusModifier = 0;
    if (blackoutPattern === 'DEEP') {
      visionRadiusModifier = -18; // Much tighter vision!
    }

    return {
      revealDuration: baseReveal,
      patrolCount,
      hunterCount,
      scannerCount,
      laserCount,
      pulseCount,
      timedDoorCount,
      hasRiskRoute: s >= 2,
      hazardSpeedMultiplier,
      scoreMultiplier,
      gridComplexity,
      blackoutPattern,
      isExtreme,
      flashlightDrainMultiplier,
      flashlightRechargeMultiplier,
      visionRadiusModifier,
    };
  }
}
