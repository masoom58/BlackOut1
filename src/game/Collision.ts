/**
 * BLACKOUT — High Performance 2D Collision Engine
 * 
 * Includes smooth sliding wall response, circle-box resolution,
 * and laser beam segment distance checks.
 */

import { Point, Rect } from './Types';

export interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  penetration: number;
}

export class Collision {
  /**
   * Circle vs Axis-Aligned Bounding Box (AABB) with sliding normal resolution
   */
  public static testCircleVsRect(
    cx: number,
    cy: number,
    radius: number,
    rect: Rect
  ): CollisionResult {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;

    // Check if circle center is strictly inside rectangle
    if (distSq === 0) {
      // Circle center is inside rect; push out along the nearest edge
      const leftDist = cx - rect.x;
      const rightDist = rect.x + rect.width - cx;
      const topDist = cy - rect.y;
      const bottomDist = rect.y + rect.height - cy;

      const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
      if (minDist === leftDist) {
        return { collided: true, normalX: -1, normalY: 0, penetration: radius + leftDist };
      } else if (minDist === rightDist) {
        return { collided: true, normalX: 1, normalY: 0, penetration: radius + rightDist };
      } else if (minDist === topDist) {
        return { collided: true, normalX: 0, normalY: -1, penetration: radius + topDist };
      } else {
        return { collided: true, normalX: 0, normalY: 1, penetration: radius + bottomDist };
      }
    }

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const penetration = radius - dist;
      return {
        collided: true,
        normalX: dx / dist,
        normalY: dy / dist,
        penetration,
      };
    }

    return { collided: false, normalX: 0, normalY: 0, penetration: 0 };
  }

  /**
   * Circle vs Circle
   */
  public static testCircleVsCircle(
    x1: number,
    y1: number,
    r1: number,
    x2: number,
    y2: number,
    r2: number
  ): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const totalR = r1 + r2;
    return dx * dx + dy * dy <= totalR * totalR;
  }

  /**
   * Distance squared from a point to a 2D line segment
   */
  public static distSqToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) {
      const dx = px - x1;
      const dy = py - y1;
      return dx * dx + dy * dy;
    }

    // Projection scalar t onto segment
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);

    const dx = px - projX;
    const dy = py - projY;
    return dx * dx + dy * dy;
  }

  /**
   * Circle vs Rotating Laser Beam
   */
  public static testCircleVsLaser(
    cx: number,
    cy: number,
    cRadius: number,
    pivot: Point,
    angle: number,
    length: number,
    beamWidth: number
  ): boolean {
    const endX = pivot.x + Math.cos(angle) * length;
    const endY = pivot.y + Math.sin(angle) * length;

    const distSq = this.distSqToSegment(cx, cy, pivot.x, pivot.y, endX, endY);
    const totalRadius = cRadius + beamWidth / 2;

    return distSq <= totalRadius * totalRadius;
  }
}
