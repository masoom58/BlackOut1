# BLACKOUT — Production-Ready HTML5 Game

BLACKOUT is a high-tension, 2D endless survival browser game. Built with lightweight procedural Canvas graphics, pure Web Audio API synthesis, responsive multi-touch controls, and a fully decoupled architecture adhering to official CrazyGames SDK v3 requirements.

---

## 🎮 Game Concept & Loop

1. **LOOK (Reveal Phase)**: The sector begins with a brief window of visibility (3.2s in Sector 1, reducing to 1.1s in deep sectors). A radar sweep visualizes walls, dangerous choke points, and moving hazards.
2. **REMEMBER**: Commit the corridor layouts, hazard pathways, and safe zones to memory.
3. **MOVE (Blackout Phase)**: Total darkness falls. The player has a small ambient vision radius.
4. **SURVIVE**: Navigate through the darkness without contacting lethal red hazards.
5. **FLASHLIGHT**: Press `SPACE` (or tap `FLASH` on touch devices) to project a directional cone of light. Uses limited battery that automatically regenerates when inactive.
6. **ADVANCE**: Reach the pulsing emerald exit beacon to advance to deeper sectors, increasing difficulty and score multipliers!

---

## 🏗️ Architecture & Platform Decoupling

The game strictly isolates game logic from any platform SDK:

```
                  ┌──────────────────┐
                  │  BLACKOUT ENGINE │
                  └────────┬─────────┘
                           │
                    Platform Adapter
                           │
               ┌───────────┴───────────┐
               │                       │
        LocalPlatform          CrazyGamesPlatform
               │                       │
          (Standalone)           (Official SDK v3)
```

The core game engine never directly calls CrazyGames or third-party APIs. All platform lifecycle signals go through `IPlatformAdapter`:
- `platform.gameplayStart()`
- `platform.gameplayStop()`
- `platform.loadingStart()`
- `platform.loadingStop()`
- `platform.happytime()`
- `platform.requestAd('midgame' | 'rewarded')`

---

## 🕹️ CrazyGames SDK v3 Verification

- **Documentation**: [https://docs.crazygames.com/sdk/html5/v3/](https://docs.crazygames.com/sdk/html5/v3/)
- **CDN Script**: `https://sdk.crazygames.com/crazygames-sdk-v3.js`
- **Adapter Source**: `src/platform/CrazyGamesPlatform.ts`
- **Fallback**: If the CrazyGames SDK script fails to load, is blocked by network/adblocker, or runs on localhost, the game automatically falls back to `LocalPlatform` with zero errors.
- **Ad Policies**: Ad requests are only triggered at natural gameplay breaks (Game Over / Retry). Midgame ad cooldown (minimum 60s) is enforced in the adapter. Audio is handled gracefully during ad lifecycles.

---

## ⌨️ Controls

### Desktop
- **Move**: `W`, `A`, `S`, `D` or `Arrow Keys`
- **Flashlight**: `Spacebar` or `F`
- **Pause**: `ESC` or `P`

### Mobile & Tablet
- **Move**: Responsive on-screen floating virtual joystick
- **Flashlight**: Dedicated large `FLASH` action button
- **Pause**: On-screen pause button in HUD

### Gamepad
- **Move**: Left Analog Stick
- **Flashlight**: `A` Button / Right Trigger
- **Pause**: `Start` Button

---

## 🛠️ Build & Development Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Compile and type-check
npm run lint

# Production build
npm run build
```

---

## 🔒 Fairness & Performance System

- **Procedural Solvability**: Every chamber is verified with a Breadth-First Search (BFS) flood fill to guarantee an unblocked, fair passage between spawn and exit beacon.
- **Safety Clearances**: Safe perimeter zones around player spawn (110px) and exit beacon (100px) ensure zero unavoidable instantaneous deaths.
- **Pure Web Audio API**: No external audio files to load, zero bandwidth, instant sound effects and continuous ambient tension drone.
- **Zero Heavy Assets**: 100% vector & procedural Canvas rendering. Bundle size is less than 1 MB!
