/**
 * BLACKOUT — Procedural Sector Generator & Fairness Validation System
 * 
 * Generates dynamic endless labyrinths with timed laser doors, risk-reward cores,
 * diverse hazard archetypes (hunters, scanners, double lasers), and BFS solvability proofing.
 */

import { GameConfig } from '../config/GameConfig';
import { DifficultyManager } from './Difficulty';
import {
  Hazard,
  HunterHazard,
  LaserHazard,
  PatrolHazard,
  Point,
  PulseHazard,
  RiskOrb,
  ScannerHazard,
  SectorData,
  TimedDoor,
  Wall,
} from './Types';

export class ProceduralGenerator {
  // Anti-repetition history buffer (stores last 3 spawn/exit pattern signatures)
  private static recentLayoutSignatures: string[] = [];

  public static generateSector(
    sectorIndex: number,
    width = GameConfig.world.baseWidth,
    height = GameConfig.world.baseHeight
  ): SectorData {
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = this.tryGenerateSector(sectorIndex, width, height);
      if (this.validateSector(candidate)) {
        // Record layout signature to avoid direct repetition
        const sig = `${candidate.playerSpawn.y > height / 2 ? 'bot' : 'top'}-${candidate.exitBeacon.y > height / 2 ? 'bot' : 'top'}-${candidate.blackoutPattern}`;
        this.recentLayoutSignatures.push(sig);
        if (this.recentLayoutSignatures.length > 4) {
          this.recentLayoutSignatures.shift();
        }
        return candidate;
      }
    }

    // Safety fallback
    return this.createGuaranteedFallbackSector(sectorIndex, width, height);
  }

  private static tryGenerateSector(sectorIndex: number, width: number, height: number): SectorData {
    const diff = DifficultyManager.getDifficultyForSector(sectorIndex);

    const wallThickness = 24;
    const walls: Wall[] = [];

    // Outer boundary walls
    walls.push({ id: 'wall-top', x: 0, y: 0, width, height: wallThickness });
    walls.push({ id: 'wall-bottom', x: 0, y: height - wallThickness, width, height: wallThickness });
    walls.push({ id: 'wall-left', x: 0, y: 0, width: wallThickness, height });
    walls.push({ id: 'wall-right', x: width - wallThickness, y: 0, width: wallThickness, height });

    // Internal grid
    const cols = 9;
    const rows = 6;
    const playAreaX = wallThickness;
    const playAreaY = wallThickness;
    const playAreaW = width - wallThickness * 2;
    const playAreaH = height - wallThickness * 2;

    const cellW = playAreaW / cols;
    const cellH = playAreaH / rows;

    const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    // Choose spawn cell (alternate top/bottom based on history to avoid repetition)
    const lastSig = this.recentLayoutSignatures[this.recentLayoutSignatures.length - 1];
    let preferTop = Math.random() < 0.5;
    if (lastSig?.startsWith('top')) preferTop = false;
    else if (lastSig?.startsWith('bot')) preferTop = true;

    const spawnCell = { col: 0, row: preferTop ? 0 : rows - 1 };
    const exitCell = { col: cols - 1, row: spawnCell.row === 0 ? rows - 1 : 0 };

    // Guaranteed primary corridor
    const primaryPath = this.carveGuaranteedPath(cols, rows, spawnCell, exitCell);
    const pathSet = new Set(primaryPath.map((p) => `${p.col},${p.row}`));

    // Place obstacle blocks
    const maxWallBlocks = Math.floor(cols * rows * (0.24 + diff.gridComplexity * 0.16));
    let placedWalls = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${c},${r}`;
        if (pathSet.has(key)) continue;

        const distToSpawn = Math.abs(c - spawnCell.col) + Math.abs(r - spawnCell.row);
        const distToExit = Math.abs(c - exitCell.col) + Math.abs(r - exitCell.row);
        if (distToSpawn <= 1 || distToExit <= 1) continue;

        if (Math.random() < 0.48 && placedWalls < maxWallBlocks) {
          grid[r][c] = true;
          placedWalls++;

          const insetX = cellW * 0.14;
          const insetY = cellH * 0.14;
          walls.push({
            id: `wall-block-${c}-${r}`,
            x: playAreaX + c * cellW + insetX,
            y: playAreaY + r * cellH + insetY,
            width: cellW - insetX * 2,
            height: cellH - insetY * 2,
          });
        }
      }
    }

    const playerSpawn: Point = {
      x: playAreaX + spawnCell.col * cellW + cellW * 0.5,
      y: playAreaY + spawnCell.row * cellH + cellH * 0.5,
    };

    const exitBeacon = {
      x: playAreaX + exitCell.col * cellW + cellW * 0.5,
      y: playAreaY + exitCell.row * cellH + cellH * 0.5,
      radius: 22,
      pulseTimer: 0,
    };

    // 1. Timed Doors / Dynamic Laser Gates
    const timedDoors: TimedDoor[] = [];
    if (diff.timedDoorCount > 0 && primaryPath.length > 5) {
      for (let d = 0; d < diff.timedDoorCount; d++) {
        const pathIdx = Math.floor(primaryPath.length * (0.35 + d * 0.28));
        const cell = primaryPath[pathIdx];
        if (!cell) continue;

        const dx = playAreaX + cell.col * cellW;
        const dy = playAreaY + cell.row * cellH;

        timedDoors.push({
          id: `timed-door-${d}`,
          x: dx + cellW * 0.42,
          y: dy + cellH * 0.1,
          width: 14,
          height: cellH * 0.8,
          isOpen: false,
          timer: d * 1.2,
          openDuration: 2.2,
          closedDuration: 1.6,
          warningDuration: 0.6,
        });
      }
    }

    // 2. High-Risk Data Cores
    const riskOrbs: RiskOrb[] = [];
    if (diff.hasRiskRoute) {
      // Find an open cell offset from primary path
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 2; c < cols - 2; c++) {
          const key = `${c},${r}`;
          if (!pathSet.has(key) && !grid[r][c] && riskOrbs.length === 0) {
            riskOrbs.push({
              id: 'risk-orb-1',
              x: playAreaX + c * cellW + cellW * 0.5,
              y: playAreaY + r * cellH + cellH * 0.5,
              radius: 12,
              collected: false,
              pulseTimer: 0,
              points: diff.isExtreme ? 600 : 350,
            });
          }
        }
      }
    }

    // 3. Hazards
    const hazards: Hazard[] = [];

    // Patrol Hazards
    for (let i = 0; i < diff.patrolCount; i++) {
      const validIndices = [];
      for (let pIdx = 2; pIdx < primaryPath.length - 2; pIdx++) {
        validIndices.push(pIdx);
      }

      if (validIndices.length > 0) {
        const pathIdx = validIndices[Math.floor(Math.random() * validIndices.length)];
        const centerCell = primaryPath[pathIdx];

        const cx = playAreaX + centerCell.col * cellW + cellW * 0.5;
        const cy = playAreaY + centerCell.row * cellH + cellH * 0.5;
        const horizontal = i % 2 === 0;
        const patrolDist = horizontal ? cellW * 0.85 : cellH * 0.85;

        hazards.push({
          id: `hazard-patrol-${i}`,
          type: 'patrol',
          x: cx,
          y: cy,
          radius: 12,
          waypointA: { x: horizontal ? cx - patrolDist : cx, y: horizontal ? cy : cy - patrolDist },
          waypointB: { x: horizontal ? cx + patrolDist : cx, y: horizontal ? cy : cy + patrolDist },
          speed: (GameConfig.hazards.droneBaseSpeed + (sectorIndex - 1) * GameConfig.hazards.droneSpeedPerSector) * diff.hazardSpeedMultiplier,
          t: Math.random(),
          forward: Math.random() < 0.5,
        });
      }
    }

    // Hunter Hazards (Stalker Drones & Chaser Pairs)
    for (let i = 0; i < diff.hunterCount; i++) {
      // Spawn Chaser Pair from opposite quadrants for a tense pincer movement
      const hx = i === 0 ? width - 110 : width - 160;
      const hy = i === 0
        ? (playerSpawn.y > height / 2 ? 110 : height - 110)
        : (playerSpawn.y > height / 2 ? height - 120 : 120);

      const hunter: HunterHazard = {
        id: `hazard-hunter-${i}`,
        type: 'hunter',
        x: hx,
        y: hy,
        radius: 13,
        speed: (62 + (sectorIndex - 1) * 3) * diff.hazardSpeedMultiplier,
        angle: Math.PI,
        targetX: playerSpawn.x,
        targetY: playerPosSafe(playerSpawn.y),
      };
      hazards.push(hunter);
    }

    // Scanner Hazards (Sweeping Radar Drones)
    for (let i = 0; i < diff.scannerCount; i++) {
      const midCol = Math.floor(cols / 2);
      const midRow = Math.floor(rows / 2) + (i === 0 ? -1 : 1);
      const cx = playAreaX + midCol * cellW + cellW * 0.5;
      const cy = playAreaY + midRow * cellH + cellH * 0.5;

      const scanner: ScannerHazard = {
        id: `hazard-scanner-${i}`,
        type: 'scanner',
        x: cx,
        y: cy,
        radius: 12,
        sweepAngle: 0,
        sweepSpeed: 1.6 * diff.hazardSpeedMultiplier,
        beamLength: 180,
        beamFov: Math.PI / 4, // 45 degree search cone
        waypointA: { x: cx - cellW * 0.6, y: cy },
        waypointB: { x: cx + cellW * 0.6, y: cy },
        t: 0,
        forward: true,
      };
      hazards.push(scanner);
    }

    // Rotating Laser Hazards
    for (let i = 0; i < diff.laserCount; i++) {
      const midCol = Math.floor(cols / 2) + (i % 2 === 0 ? -1 : 1);
      const midRow = Math.floor(rows / 2);
      const pivot: Point = {
        x: playAreaX + midCol * cellW + cellW * 0.5,
        y: playAreaY + midRow * cellH + cellH * 0.5,
      };

      const distSpawn = Math.hypot(pivot.x - playerSpawn.x, pivot.y - playerSpawn.y);
      const distExit = Math.hypot(pivot.x - exitBeacon.x, pivot.y - exitBeacon.y);

      if (distSpawn > GameConfig.hazards.safeSpawnRadius && distExit > GameConfig.hazards.safeExitRadius) {
        hazards.push({
          id: `hazard-laser-${i}`,
          type: 'laser',
          pivot,
          length: Math.min(cellW, cellH) * 1.35,
          angle: Math.random() * Math.PI * 2,
          rotationSpeed: (GameConfig.hazards.laserRotationSpeedBase + (sectorIndex - 1) * GameConfig.hazards.laserRotationSpeedPerSector) * (i % 2 === 0 ? 1 : -1) * diff.hazardSpeedMultiplier,
          beamWidth: 6,
          doubleSided: diff.isExtreme || (sectorIndex >= 6 && i === 0),
        });
      }
    }

    // Pulse Mines
    for (let i = 0; i < diff.pulseCount; i++) {
      const openCells: { c: number; r: number }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!grid[r][c]) {
            const px = playAreaX + c * cellW + cellW * 0.5;
            const py = playAreaY + r * cellH + cellH * 0.5;
            if (
              Math.hypot(px - playerSpawn.x, py - playerSpawn.y) > GameConfig.hazards.safeSpawnRadius &&
              Math.hypot(px - exitBeacon.x, py - exitBeacon.y) > GameConfig.hazards.safeExitRadius
            ) {
              openCells.push({ c, r });
            }
          }
        }
      }

      if (openCells.length > 0) {
        const pick = openCells[Math.floor(Math.random() * openCells.length)];
        hazards.push({
          id: `hazard-pulse-${i}`,
          type: 'pulse',
          x: playAreaX + pick.c * cellW + cellW * 0.5,
          y: playAreaY + pick.r * cellH + cellH * 0.5,
          radius: 14,
          maxRadius: 36,
          timer: Math.random() * 2.0,
          phase: 'dormant',
          dormantDuration: 1.6,
          warningDuration: GameConfig.hazards.pulseWarningDuration,
          activeDuration: GameConfig.hazards.pulseActiveDuration,
        });
      }
    }

    return {
      index: sectorIndex,
      width,
      height,
      walls,
      timedDoors,
      hazards,
      riskOrbs,
      playerSpawn,
      exitBeacon,
      revealDuration: diff.revealDuration,
      blackoutPattern: diff.blackoutPattern,
      isExtremeSector: diff.isExtreme,
    };
  }

  private static carveGuaranteedPath(
    cols: number,
    rows: number,
    start: { col: number; row: number },
    target: { col: number; row: number }
  ): { col: number; row: number }[] {
    const path: { col: number; row: number }[] = [{ ...start }];
    let currCol = start.col;
    let currRow = start.row;

    const visited = new Set<string>();
    visited.add(`${currCol},${currRow}`);

    let steps = 0;
    while ((currCol !== target.col || currRow !== target.row) && steps < 100) {
      steps++;
      const moves: { c: number; r: number }[] = [];

      if (currCol < target.col) moves.push({ c: currCol + 1, r: currRow });
      if (currCol > target.col) moves.push({ c: currCol - 1, r: currRow });
      if (currRow < target.row) moves.push({ c: currCol, r: currRow + 1 });
      if (currRow > target.row) moves.push({ c: currCol, r: currRow - 1 });

      const valid = moves.filter((m) => m.c >= 0 && m.c < cols && m.r >= 0 && m.r < rows);
      if (valid.length === 0) break;

      valid.sort((a, b) => {
        const da = Math.abs(a.c - target.col) + Math.abs(a.r - target.row);
        const db = Math.abs(b.c - target.col) + Math.abs(b.r - target.row);
        return da - db;
      });

      const next = valid[0];
      currCol = next.c;
      currRow = next.r;

      const key = `${currCol},${currRow}`;
      if (!visited.has(key)) {
        visited.add(key);
        path.push({ col: currCol, row: currRow });
      }
    }

    return path;
  }

  public static validateSector(sector: SectorData): boolean {
    const { playerSpawn, exitBeacon, walls, hazards } = sector;

    // 1. Check spawn clearance against walls
    for (const wall of walls) {
      if (
        playerSpawn.x >= wall.x - 16 &&
        playerSpawn.x <= wall.x + wall.width + 16 &&
        playerSpawn.y >= wall.y - 16 &&
        playerSpawn.y <= wall.y + wall.height + 16
      ) {
        return false;
      }

      if (
        exitBeacon.x >= wall.x - 24 &&
        exitBeacon.x <= wall.x + wall.width + 24 &&
        exitBeacon.y >= wall.y - 24 &&
        exitBeacon.y <= wall.y + wall.height + 24
      ) {
        return false;
      }
    }

    // 2. Check hazard spawn clearances
    for (const h of hazards) {
      if (h.type === 'patrol') {
        const distA = Math.hypot(h.waypointA.x - playerSpawn.x, h.waypointA.y - playerSpawn.y);
        const distB = Math.hypot(h.waypointB.x - playerSpawn.x, h.waypointB.y - playerSpawn.y);
        if (distA < GameConfig.hazards.safeSpawnRadius || distB < GameConfig.hazards.safeSpawnRadius) {
          return false;
        }
      } else if (h.type === 'hunter') {
        const dist = Math.hypot(h.x - playerSpawn.x, h.y - playerSpawn.y);
        if (dist < 220) return false; // Hunters must start far away
      } else if (h.type === 'pulse') {
        const dist = Math.hypot(h.x - playerSpawn.x, h.y - playerSpawn.y);
        if (dist < GameConfig.hazards.safeSpawnRadius) return false;
      } else if (h.type === 'laser') {
        const dist = Math.hypot(h.pivot.x - playerSpawn.x, h.pivot.y - playerSpawn.y);
        if (dist < h.length + 30) return false;
      }
    }

    // 3. Solvability path verification
    return this.verifyGridSolvability(sector);
  }

  private static verifyGridSolvability(sector: SectorData): boolean {
    const res = 24;
    const gridCols = Math.floor(sector.width / res);
    const gridRows = Math.floor(sector.height / res);

    const blocked: boolean[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

    const pad = GameConfig.player.radius + 2;
    for (const w of sector.walls) {
      const minC = Math.max(0, Math.floor((w.x - pad) / res));
      const maxC = Math.min(gridCols - 1, Math.floor((w.x + w.width + pad) / res));
      const minR = Math.max(0, Math.floor((w.y - pad) / res));
      const maxR = Math.min(gridRows - 1, Math.floor((w.y + w.height + pad) / res));

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          blocked[r][c] = true;
        }
      }
    }

    const startC = Math.floor(sector.playerSpawn.x / res);
    const startR = Math.floor(sector.playerSpawn.y / res);
    const endC = Math.floor(sector.exitBeacon.x / res);
    const endR = Math.floor(sector.exitBeacon.y / res);

    if (blocked[startR]?.[startC] || blocked[endR]?.[endC]) return false;

    const queue: [number, number][] = [[startC, startR]];
    const visited: boolean[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
    visited[startR][startC] = true;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (queue.length > 0) {
      const [c, r] = queue.shift()!;
      if (Math.abs(c - endC) <= 1 && Math.abs(r - endR) <= 1) {
        return true;
      }

      for (const [dc, dr] of dirs) {
        const nc = c + dc;
        const nr = r + dr;
        if (
          nc >= 0 &&
          nc < gridCols &&
          nr >= 0 &&
          nr < gridRows &&
          !visited[nr][nc] &&
          !blocked[nr][nc]
        ) {
          visited[nr][nc] = true;
          queue.push([nc, nr]);
        }
      }
    }

    return false;
  }

  private static createGuaranteedFallbackSector(sectorIndex: number, width: number, height: number): SectorData {
    const wallThickness = 24;
    const walls: Wall[] = [
      { id: 'fb-top', x: 0, y: 0, width, height: wallThickness },
      { id: 'fb-bottom', x: 0, y: height - wallThickness, width, height: wallThickness },
      { id: 'fb-left', x: 0, y: 0, width: wallThickness, height },
      { id: 'fb-right', x: width - wallThickness, y: 0, width: wallThickness, height },
      { id: 'fb-p1', x: width * 0.35, y: height * 0.22, width: 36, height: height * 0.4 },
      { id: 'fb-p2', x: width * 0.65, y: height * 0.38, width: 36, height: height * 0.4 },
    ];

    const playerSpawn: Point = { x: 70, y: height / 2 };
    const exitBeacon = { x: width - 70, y: height / 2, radius: 22, pulseTimer: 0 };

    const hazards: Hazard[] = [
      {
        id: 'fb-patrol-1',
        type: 'patrol',
        x: width * 0.5,
        y: height * 0.25,
        radius: 12,
        waypointA: { x: width * 0.5, y: height * 0.2 },
        waypointB: { x: width * 0.5, y: height * 0.8 },
        speed: 100,
        t: 0,
        forward: true,
      },
    ];

    return {
      index: sectorIndex,
      width,
      height,
      walls,
      timedDoors: [],
      hazards,
      riskOrbs: [],
      playerSpawn,
      exitBeacon,
      revealDuration: 2.2,
      blackoutPattern: 'NORMAL',
      isExtremeSector: false,
    };
  }
}

function playerPosSafe(val: number): number {
  return Math.max(60, val);
}
