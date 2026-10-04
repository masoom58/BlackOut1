/**
 * BLACKOUT — Core Game Types & Interfaces
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Wall extends Rect {
  id: string;
}

/** Dynamic timed barrier / laser door in the sector */
export interface TimedDoor extends Rect {
  id: string;
  isOpen: boolean;
  timer: number;
  openDuration: number;
  closedDuration: number;
  warningDuration: number; // Duration of amber warning before closing
}

/** Optional High-Risk Data Core for Risk-Reward bonus */
export interface RiskOrb {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulseTimer: number;
  points: number;
}

export type HazardType = 'patrol' | 'hunter' | 'scanner' | 'laser' | 'pulse';

export interface BaseHazard {
  id: string;
  type: HazardType;
}

export interface PatrolHazard extends BaseHazard {
  type: 'patrol';
  x: number;
  y: number;
  radius: number;
  waypointA: Point;
  waypointB: Point;
  speed: number;
  t: number;
  forward: boolean;
}

/** Stalker drone that slowly steers toward player's position in darkness */
export interface HunterHazard extends BaseHazard {
  type: 'hunter';
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  targetX: number;
  targetY: number;
}

/** Drone that projects a sweeping radar cone */
export interface ScannerHazard extends BaseHazard {
  type: 'scanner';
  x: number;
  y: number;
  radius: number;
  sweepAngle: number;
  sweepSpeed: number;
  beamLength: number;
  beamFov: number; // Field of view in radians
  waypointA: Point;
  waypointB: Point;
  t: number;
  forward: boolean;
}

export interface LaserHazard extends BaseHazard {
  type: 'laser';
  pivot: Point;
  length: number;
  angle: number;
  rotationSpeed: number; // radians per second
  beamWidth: number;
  doubleSided?: boolean;
}

export interface PulseHazard extends BaseHazard {
  type: 'pulse';
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  timer: number;
  phase: 'dormant' | 'warning' | 'active';
  dormantDuration: number;
  warningDuration: number;
  activeDuration: number;
}

export type Hazard = PatrolHazard | HunterHazard | ScannerHazard | LaserHazard | PulseHazard;

export interface ExitBeacon {
  x: number;
  y: number;
  radius: number;
  pulseTimer: number;
}

export type BlackoutPattern = 'NORMAL' | 'DEEP' | 'FLICKER' | 'PULSE' | 'FALSE_FLASH' | 'TOTAL_BLACKOUT';

export interface SectorData {
  index: number;
  width: number;
  height: number;
  walls: Wall[];
  timedDoors: TimedDoor[];
  hazards: Hazard[];
  riskOrbs: RiskOrb[];
  playerSpawn: Point;
  exitBeacon: ExitBeacon;
  revealDuration: number;
  blackoutPattern: BlackoutPattern;
  isExtremeSector: boolean;
}

export type GameState =
  | 'BOOT'
  | 'MENU'
  | 'REVEAL'
  | 'BLACKOUT'
  | 'PAUSED'
  | 'GAMEOVER';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface InputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  flashlight: boolean;
  pause: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}
