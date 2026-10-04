/**
 * BLACKOUT — Hazard Entities & Collision Logic
 * 
 * Handles update loops and collision detection for patrol drones,
 * hunter stalkers, laser scanners, and pulsing bio-electric nodes.
 */

import { Collision } from './Collision';
import { Hazard, HunterHazard, LaserHazard, PatrolHazard, Point, PulseHazard, ScannerHazard } from './Types';

export class HazardManager {
  /**
   * Updates all active hazards in the sector
   */
  public static updateHazards(hazards: Hazard[], dt: number, playerPos: Point): void {
    for (const h of hazards) {
      if (h.type === 'patrol') {
        this.updatePatrol(h, dt);
      } else if (h.type === 'hunter') {
        this.updateHunter(h, dt, playerPos);
      } else if (h.type === 'scanner') {
        this.updateScanner(h, dt);
      } else if (h.type === 'laser') {
        this.updateLaser(h, dt);
      } else if (h.type === 'pulse') {
        this.updatePulse(h, dt);
      }
    }
  }

  private static updatePatrol(patrol: PatrolHazard, dt: number): void {
    const dist = Math.hypot(
      patrol.waypointB.x - patrol.waypointA.x,
      patrol.waypointB.y - patrol.waypointA.y
    );
    if (dist <= 0) return;

    const step = (patrol.speed * dt) / dist;
    if (patrol.forward) {
      patrol.t += step;
      if (patrol.t >= 1) {
        patrol.t = 1;
        patrol.forward = false;
      }
    } else {
      patrol.t -= step;
      if (patrol.t <= 0) {
        patrol.t = 0;
        patrol.forward = true;
      }
    }

    // Smooth smoothstep interpolation for mechanical deceleration at waypoints
    const smoothT = patrol.t * patrol.t * (3 - 2 * patrol.t);
    patrol.x = patrol.waypointA.x + (patrol.waypointB.x - patrol.waypointA.x) * smoothT;
    patrol.y = patrol.waypointA.y + (patrol.waypointB.y - patrol.waypointA.y) * smoothT;
  }

  private static updateHunter(hunter: HunterHazard, dt: number, playerPos: Point): void {
    // Target is player's current position
    hunter.targetX = playerPos.x;
    hunter.targetY = playerPos.y;

    const targetAngle = Math.atan2(hunter.targetY - hunter.y, hunter.targetX - hunter.x);

    // Smooth angular turn towards player (max 2.2 rad/s)
    let diff = targetAngle - hunter.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const maxTurn = 2.2 * dt;
    hunter.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

    // Move forward in current facing direction
    hunter.x += Math.cos(hunter.angle) * hunter.speed * dt;
    hunter.y += Math.sin(hunter.angle) * hunter.speed * dt;
  }

  private static updateScanner(scanner: ScannerHazard, dt: number): void {
    // 1. Move along waypoints
    const dist = Math.hypot(
      scanner.waypointB.x - scanner.waypointA.x,
      scanner.waypointB.y - scanner.waypointA.y
    );
    if (dist > 0) {
      const step = (55 * dt) / dist;
      if (scanner.forward) {
        scanner.t += step;
        if (scanner.t >= 1) {
          scanner.t = 1;
          scanner.forward = false;
        }
      } else {
        scanner.t -= step;
        if (scanner.t <= 0) {
          scanner.t = 0;
          scanner.forward = true;
        }
      }
      scanner.x = scanner.waypointA.x + (scanner.waypointB.x - scanner.waypointA.x) * scanner.t;
      scanner.y = scanner.waypointA.y + (scanner.waypointB.y - scanner.waypointA.y) * scanner.t;
    }

    // 2. Oscillate sweeping radar beam angle
    scanner.sweepAngle += scanner.sweepSpeed * dt;
  }

  private static updateLaser(laser: LaserHazard, dt: number): void {
    laser.angle = (laser.angle + laser.rotationSpeed * dt) % (Math.PI * 2);
  }

  private static updatePulse(pulse: PulseHazard, dt: number): void {
    pulse.timer += dt;

    if (pulse.phase === 'dormant') {
      pulse.radius = 14;
      if (pulse.timer >= pulse.dormantDuration) {
        pulse.phase = 'warning';
        pulse.timer = 0;
      }
    } else if (pulse.phase === 'warning') {
      pulse.radius = 18;
      if (pulse.timer >= pulse.warningDuration) {
        pulse.phase = 'active';
        pulse.timer = 0;
      }
    } else if (pulse.phase === 'active') {
      // Expand to max radius during active detonation
      const expandProgress = Math.min(1, pulse.timer / (pulse.activeDuration * 0.4));
      pulse.radius = 18 + (pulse.maxRadius - 18) * expandProgress;

      if (pulse.timer >= pulse.activeDuration) {
        pulse.phase = 'dormant';
        pulse.timer = 0;
        pulse.radius = 14;
      }
    }
  }

  /**
   * Tests if any active hazard has killed the player
   */
  public static checkLethalCollision(hazards: Hazard[], player: { x: number; y: number; radius: number }): Hazard | null {
    for (const h of hazards) {
      if (h.type === 'patrol') {
        if (Collision.testCircleVsCircle(player.x, player.y, player.radius, h.x, h.y, h.radius)) {
          return h;
        }
      } else if (h.type === 'hunter') {
        if (Collision.testCircleVsCircle(player.x, player.y, player.radius, h.x, h.y, h.radius)) {
          return h;
        }
      } else if (h.type === 'scanner') {
        // Test drone body
        if (Collision.testCircleVsCircle(player.x, player.y, player.radius, h.x, h.y, h.radius)) {
          return h;
        }
        // Test sweeping lethal beam cone
        const dist = Math.hypot(player.x - h.x, player.y - h.y);
        if (dist <= h.beamLength + player.radius) {
          const angleToPlayer = Math.atan2(player.y - h.y, player.x - h.x);
          let diff = angleToPlayer - h.sweepAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          if (Math.abs(diff) < h.beamFov / 2) {
            return h;
          }
        }
      } else if (h.type === 'laser') {
        // Forward beam
        if (Collision.testCircleVsLaser(player.x, player.y, player.radius, h.pivot, h.angle, h.length, h.beamWidth)) {
          return h;
        }
        // Backward beam if double-sided
        if (h.doubleSided) {
          if (Collision.testCircleVsLaser(player.x, player.y, player.radius, h.pivot, h.angle + Math.PI, h.length, h.beamWidth)) {
            return h;
          }
        }
      } else if (h.type === 'pulse') {
        if (h.phase === 'active') {
          if (Collision.testCircleVsCircle(player.x, player.y, player.radius, h.x, h.y, h.radius)) {
            return h;
          }
        }
      }
    }
    return null;
  }

  /**
   * Tests Near-Miss / Close Call: hazard is dangerously close (within 22px) without killing player
   */
  public static checkNearMiss(hazards: Hazard[], player: { x: number; y: number; radius: number }): Hazard | null {
    const margin = 22;

    for (const h of hazards) {
      if (h.type === 'patrol' || h.type === 'hunter') {
        const dist = Math.hypot(player.x - h.x, player.y - h.y);
        const lethalDist = player.radius + h.radius;
        if (dist > lethalDist && dist < lethalDist + margin) {
          return h;
        }
      } else if (h.type === 'laser') {
        const dSq = Collision.distSqToSegment(
          player.x,
          player.y,
          h.pivot.x,
          h.pivot.y,
          h.pivot.x + Math.cos(h.angle) * h.length,
          h.pivot.y + Math.sin(h.angle) * h.length
        );
        const lethalR = player.radius + h.beamWidth / 2;
        const totalR = lethalR + margin;
        if (dSq > lethalR * lethalR && dSq < totalR * totalR) {
          return h;
        }
      } else if (h.type === 'pulse' && h.phase === 'active') {
        const dist = Math.hypot(player.x - h.x, player.y - h.y);
        const lethalDist = player.radius + h.radius;
        if (dist > lethalDist && dist < lethalDist + margin) {
          return h;
        }
      }
    }
    return null;
  }

  /**
   * Proximity audio warning
   */
  public static checkProximityWarning(hazards: Hazard[], player: { x: number; y: number }): boolean {
    const warningDistance = 65;
    for (const h of hazards) {
      if (h.type === 'patrol' || h.type === 'hunter') {
        if (Math.hypot(player.x - h.x, player.y - h.y) < warningDistance) return true;
      } else if (h.type === 'laser') {
        const endX = h.pivot.x + Math.cos(h.angle) * h.length;
        const endY = h.pivot.y + Math.sin(h.angle) * h.length;
        const dSq = Collision.distSqToSegment(player.x, player.y, h.pivot.x, h.pivot.y, endX, endY);
        if (dSq < warningDistance * warningDistance) return true;
      } else if (h.type === 'pulse' && (h.phase === 'warning' || h.phase === 'active')) {
        if (Math.hypot(player.x - h.x, player.y - h.y) < h.radius + 40) return true;
      }
    }
    return false;
  }

  /**
   * Evaluates closest hazard distance and position for spatial stereo audio tension
   */
  public static getNearestHazard(
    hazards: Hazard[],
    player: { x: number; y: number }
  ): { distance: number; x: number; y: number } | null {
    let minDistance = Infinity;
    let targetX = player.x;
    let targetY = player.y;

    for (const h of hazards) {
      let d = Infinity;
      let hx = player.x;
      let hy = player.y;

      if (h.type === 'patrol' || h.type === 'hunter') {
        d = Math.hypot(player.x - h.x, player.y - h.y);
        hx = h.x;
        hy = h.y;
      } else if (h.type === 'scanner') {
        d = Math.hypot(player.x - h.x, player.y - h.y);
        hx = h.x;
        hy = h.y;
      } else if (h.type === 'laser') {
        const endX = h.pivot.x + Math.cos(h.angle) * h.length;
        const endY = h.pivot.y + Math.sin(h.angle) * h.length;
        const dSq = Collision.distSqToSegment(player.x, player.y, h.pivot.x, h.pivot.y, endX, endY);
        d = Math.sqrt(dSq);
        hx = (h.pivot.x + endX) / 2;
        hy = (h.pivot.y + endY) / 2;
      } else if (h.type === 'pulse' && (h.phase === 'warning' || h.phase === 'active')) {
        d = Math.hypot(player.x - h.x, player.y - h.y);
        hx = h.x;
        hy = h.y;
      }

      if (d < minDistance) {
        minDistance = d;
        targetX = hx;
        targetY = hy;
      }
    }

    if (minDistance === Infinity) return null;
    return { distance: minDistance, x: targetX, y: targetY };
  }
}

