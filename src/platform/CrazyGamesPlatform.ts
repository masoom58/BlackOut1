/**
 * BLACKOUT — CrazyGames Platform Adapter (Official SDK v3)
 * 
 * Target: Official CrazyGames SDK v3 (https://docs.crazygames.com/sdk/html5/v3/)
 * Script: https://sdk.crazygames.com/crazygames-sdk-v3.js
 * 
 * Verified Official SDK APIs:
 * - window.CrazyGames.SDK.init()
 * - window.CrazyGames.SDK.game.loadingStart()
 * - window.CrazyGames.SDK.game.loadingStop()
 * - window.CrazyGames.SDK.game.gameplayStart()
 * - window.CrazyGames.SDK.game.gameplayStop()
 * - window.CrazyGames.SDK.game.happytime()
 * - window.CrazyGames.SDK.ad.requestAd(type, callbacks)
 * 
 * If SDK is unavailable or blocked by adblocker/network, methods fail gracefully
 * without throwing errors or breaking core gameplay.
 */

import { AdCallbacks, IPlatformAdapter } from './PlatformAdapter';

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init: () => Promise<void>;
        game?: {
          loadingStart?: () => void;
          loadingStop?: () => void;
          gameplayStart?: () => void;
          gameplayStop?: () => void;
          happytime?: () => void;
        };
        ad?: {
          requestAd: (
            type: 'midgame' | 'rewarded',
            callbacks?: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (error: unknown) => void;
            }
          ) => Promise<void>;
        };
        banner?: {
          requestBanner: (params: { id: string; width: number; height: number }) => Promise<void>;
          clearBanner: (id: string) => void;
        };
      };
    };
  }
}

export class CrazyGamesPlatform implements IPlatformAdapter {
  public readonly id = 'crazygames';
  public readonly name = 'CrazyGames Platform (SDK v3)';
  public isInitialized = false;

  private sdkAvailable = false;
  private lastMidgameAdTime = 0;
  // CrazyGames policy requires respecting ad cooldown (minimum 60-90 seconds between midgame ads)
  private readonly midgameCooldownMs = 60000;

  public async init(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Check if global SDK script has attached
      if (window.CrazyGames?.SDK?.init) {
        await window.CrazyGames.SDK.init();
        this.sdkAvailable = true;
        this.isInitialized = true;
        return true;
      }
      // If script tag hasn't finished loading yet, give it a short polling window (up to 1.5s)
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 250));
        if (window.CrazyGames?.SDK?.init) {
          await window.CrazyGames.SDK.init();
          this.sdkAvailable = true;
          this.isInitialized = true;
          return true;
        }
      }
    } catch (err) {
      console.warn('[CrazyGamesPlatform] SDK init failed, falling back to local mode:', err);
    }

    this.sdkAvailable = false;
    this.isInitialized = true;
    return false;
  }

  public loadingStart(): void {
    if (!this.sdkAvailable) return;
    try {
      window.CrazyGames?.SDK?.game?.loadingStart?.();
    } catch (e) {
      console.warn('[CrazyGamesPlatform] loadingStart failed', e);
    }
  }

  public loadingStop(): void {
    if (!this.sdkAvailable) return;
    try {
      window.CrazyGames?.SDK?.game?.loadingStop?.();
    } catch (e) {
      console.warn('[CrazyGamesPlatform] loadingStop failed', e);
    }
  }

  public gameplayStart(): void {
    if (!this.sdkAvailable) return;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart?.();
    } catch (e) {
      console.warn('[CrazyGamesPlatform] gameplayStart failed', e);
    }
  }

  public gameplayStop(): void {
    if (!this.sdkAvailable) return;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStop?.();
    } catch (e) {
      console.warn('[CrazyGamesPlatform] gameplayStop failed', e);
    }
  }

  public happytime(): void {
    if (!this.sdkAvailable) return;
    try {
      window.CrazyGames?.SDK?.game?.happytime?.();
    } catch (e) {
      console.warn('[CrazyGamesPlatform] happytime failed', e);
    }
  }

  public async requestAd(type: 'midgame' | 'rewarded' = 'midgame', callbacks?: AdCallbacks): Promise<boolean> {
    if (!this.sdkAvailable || !window.CrazyGames?.SDK?.ad?.requestAd) {
      callbacks?.onStart?.();
      callbacks?.onFinish?.();
      return false;
    }

    // Enforce cooldown policy for midgame ads
    const now = Date.now();
    if (type === 'midgame' && now - this.lastMidgameAdTime < this.midgameCooldownMs) {
      callbacks?.onFinish?.();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      let isSettled = false;

      const finishOnce = (success: boolean) => {
        if (isSettled) return;
        isSettled = true;
        if (type === 'midgame') {
          this.lastMidgameAdTime = Date.now();
        }
        resolve(success);
      };

      try {
        window.CrazyGames?.SDK?.ad?.requestAd(type, {
          adStarted: () => {
            callbacks?.onStart?.();
          },
          adFinished: () => {
            callbacks?.onFinish?.();
            finishOnce(true);
          },
          adError: (error: unknown) => {
            callbacks?.onError?.(error);
            callbacks?.onFinish?.(); // Always unpause & resume game on error per CrazyGames docs
            finishOnce(false);
          },
        }).catch((err) => {
          callbacks?.onError?.(err);
          callbacks?.onFinish?.();
          finishOnce(false);
        });
      } catch (err) {
        callbacks?.onError?.(err);
        callbacks?.onFinish?.();
        finishOnce(false);
      }
    });
  }

  public hasAdSupport(): boolean {
    return this.sdkAvailable;
  }
}
