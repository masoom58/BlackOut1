/**
 * BLACKOUT — Player Entity & Mechanics
 * 
 * Handles position, velocity, smooth wall sliding, flashlight energy management,
 * facing direction, and trail particle generation.
 */

import { GameConfig } from '../config/GameConfig';
import { Collision } from './Collision';
import { Particle, Point, Wall } from './Types';

export class Player {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius = GameConfig.player.radius;
  public facingAngle = 0; // In radians

  // Flashlight system
  public flashlightActive = false;
  public flashlightEnergy: number = GameConfig.visibility.flashlightMaxEnergy;
  public flashlightRechargeDelayTimer = 0;
  public usedFlashlightThisSector = false;

  // Visuals & Trails
  public trail: Particle[] = [];
  public isDead = false;

  constructor(spawn: Point) {
    this.x = spawn.x;
    this.y = spawn.y;
  }

  public reset(spawn: Point): void {
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.facingAngle = 0;
    this.flashlightActive = false;
    this.flashlightEnergy = GameConfig.visibility.flashlightMaxEnergy;
    this.flashlightRechargeDelayTimer = 0;
    this.usedFlashlightThisSector = false;
    this.trail = [];
    this.isDead = false;
  }

  public update(
    dt: number,
    input: { moveX: number; moveY: number; flashlight: boolean },
    walls: Wall[],
    maxParticles: number,
    drainMultiplier = 1.0,
    rechargeMultiplier = 1.0
  ): { playedFlashlightOn: boolean; playedFlashlightOff: boolean; isMoving: boolean } {
    if (this.isDead) {
      return { playedFlashlightOn: false, playedFlashlightOff: false, isMoving: false };
    }

    let playedFlashlightOn = false;
    let playedFlashlightOff = false;

    // 1. Flashlight mechanics
    const wantsFlashlight = input.flashlight;
    if (wantsFlashlight && this.flashlightEnergy >= GameConfig.visibility.minEnergyToActivate && !this.flashlightActive) {
      this.flashlightActive = true;
      this.usedFlashlightThisSector = true;
      playedFlashlightOn = true;
    } else if (!wantsFlashlight && this.flashlightActive) {
      this.flashlightActive = false;
      this.flashlightRechargeDelayTimer = GameConfig.visibility.flashlightRechargeDelay;
      playedFlashlightOff = true;
    }

    if (this.flashlightActive) {
      this.usedFlashlightThisSector = true;
      this.flashlightEnergy -= GameConfig.visibility.flashlightDrainRate * drainMultiplier * dt;
      if (this.flashlightEnergy <= 0) {
        this.flashlightEnergy = 0;
        this.flashlightActive = false;
        this.flashlightRechargeDelayTimer = GameConfig.visibility.flashlightRechargeDelay;
        playedFlashlightOff = true;
      }
    } else {
      if (this.flashlightRechargeDelayTimer > 0) {
        this.flashlightRechargeDelayTimer -= dt;
      } else {
        this.flashlightEnergy = Math.min(
          GameConfig.visibility.flashlightMaxEnergy,
          this.flashlightEnergy + GameConfig.visibility.flashlightRechargeRate * rechargeMultiplier * dt
        );
      }
    }

    // 2. Movement & Acceleration
    const inputMagnitude = Math.hypot(input.moveX, input.moveY);
    const isMoving = inputMagnitude > 0.08;

    if (isMoving) {
      const dirX = input.moveX / inputMagnitude;
      const dirY = input.moveY / inputMagnitude;

      // Update facing angle smoothly
      this.facingAngle = Math.atan2(dirY, dirX);

      // Accelerate towards target velocity
      this.vx += dirX * GameConfig.player.acceleration * dt;
      this.vy += dirY * GameConfig.player.acceleration * dt;

      // Clamp max velocity
      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed > GameConfig.player.speed) {
        this.vx = (this.vx / currentSpeed) * GameConfig.player.speed;
        this.vy = (this.vy / currentSpeed) * GameConfig.player.speed;
      }
    } else {
      // Natural friction/damping when input ceases
      this.vx *= Math.pow(GameConfig.player.friction, dt * 60);
      this.vy *= Math.pow(GameConfig.player.friction, dt * 60);
      if (Math.abs(this.vx) < 1) this.vx = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }

    // 3. Wall Collision & Smooth Sliding
    // Move along X, resolve collisions
    this.x += this.vx * dt;
    for (const wall of walls) {
      const res = Collision.testCircleVsRect(this.x, this.y, this.radius, wall);
      if (res.collided) {
        this.x += res.normalX * res.penetration;
        // Zero out normal velocity component for clean sliding
        if (res.normalX !== 0) this.vx = 0;
      }
    }

    // Move along Y, resolve collisions
    this.y += this.vy * dt;
    for (const wall of walls) {
      const res = Collision.testCircleVsRect(this.x, this.y, this.radius, wall);
      if (res.collided) {
        this.y += res.normalY * res.penetration;
        if (res.normalY !== 0) this.vy = 0;
      }
    }

    // 4. Update Particle Trail
    if (isMoving && Math.random() < 0.45 && this.trail.length < maxParticles) {
      this.trail.push({
        x: this.x + (Math.random() - 0.5) * 6,
        y: this.y + (Math.random() - 0.5) * 6,
        vx: -this.vx * 0.15 + (Math.random() - 0.5) * 20,
        vy: -this.vy * 0.15 + (Math.random() - 0.5) * 20,
        radius: 2.5 + Math.random() * 2,
        alpha: 0.6,
        color: this.flashlightActive ? '#e0f2fe' : '#38bdf8',
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
      });
    }

    // Decay trail particles
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.trail.splice(i, 1);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = (1 - p.life / p.maxLife) * 0.6;
      }
    }

    return { playedFlashlightOn, playedFlashlightOff, isMoving };
  }

  /**
   * Explodes the player into radiant neon shards on death
   */
  public explode(): Particle[] {
    this.isDead = true;
    const particles: Particle[] = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 120 + Math.random() * 260;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        alpha: 1,
        color: Math.random() < 0.6 ? '#06b6d4' : '#ef4444',
        life: 0,
        maxLife: 0.7 + Math.random() * 0.5,
      });
    }

    return particles;
  }
}
