/**
 * BLACKOUT — Game Configuration & Tunables
 */

export interface QualityConfig {
  maxParticles: number;
  enableGlowFilter: boolean;
  resolutionScale: number;
}

export const GameConfig = {
  // Canvas & World Dimensions
  world: {
    baseWidth: 960,
    baseHeight: 640,
    minSectorWidth: 800,
    minSectorHeight: 600,
  },

  // Player Physics & Properties
  player: {
    radius: 12,
    speed: 240, // pixels per second
    acceleration: 1400,
    friction: 0.88,
    glowRadius: 28,
  },

  // Visibility & Flashlight Mechanics
  visibility: {
    revealDurationBase: 3.2, // seconds in sector 1 (generous memory snapshot)
    revealDurationMin: 1.8, // guaranteed minimum seconds in deep sectors
    revealDurationReductionPerSector: 0.14,

    normalVisionRadius: 66, // tighter ambient radius around player in blackout
    flashlightMaxEnergy: 100,
    flashlightDrainRate: 32, // energy per second while active
    flashlightRechargeRate: 15, // energy per second while off
    flashlightRechargeDelay: 0.4, // seconds before recharge starts after releasing
    flashlightBonusRadius: 85, // expands normal radius by this much
    flashlightBeamLength: 260, // forward cone length
    flashlightBeamAngle: Math.PI / 2.9, // cone spread (~62 degrees)
    minEnergyToActivate: 5,
  },

  // Hazard System
  hazards: {
    droneBaseSpeed: 135, // faster base patrol drones
    droneSpeedPerSector: 9,
    laserRotationSpeedBase: 1.05, // rad/sec
    laserRotationSpeedPerSector: 0.07,
    pulsePeriod: 2.6, // faster cycle
    pulseWarningDuration: 0.75, // tighter warning window
    pulseActiveDuration: 1.1, // seconds lethal
    safeSpawnRadius: 95, // clear zone around player start
    safeExitRadius: 90, // clear zone around exit beacon
  },

  // Scoring
  score: {
    pointsPerSecondSurvival: 10,
    pointsPerSectorClear: 250,
    flashlightConservationBonusMax: 100,
  },

  // Colors & Visual Aesthetic
  colors: {
    voidDark: '#020617',
    gridLine: 'rgba(30, 41, 59, 0.4)',
    wallFill: '#0f172a',
    wallStroke: '#0284c7',
    wallGlow: 'rgba(2, 132, 199, 0.5)',
    playerCore: '#ffffff',
    playerGlow: '#06b6d4',
    exitCore: '#10b981',
    exitGlow: '#34d399',
    hazardDanger: '#ef4444',
    hazardWarning: '#f59e0b',
    hazardSafe: '#334155',
    flashlightBeam: 'rgba(224, 242, 254, 0.18)',
    darknessFog: 'rgba(2, 6, 23, 0.98)',
  },

  // Quality Presets
  quality: {
    high: {
      maxParticles: 90,
      enableGlowFilter: true,
      resolutionScale: 1,
    } as QualityConfig,
    med: {
      maxParticles: 45,
      enableGlowFilter: true,
      resolutionScale: 1,
    } as QualityConfig,
    low: {
      maxParticles: 15,
      enableGlowFilter: false,
      resolutionScale: 0.85,
    } as QualityConfig,
  },
} as const;
