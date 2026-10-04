/**
 * BLACKOUT — Local Platform Adapter
 * 
 * Standalone offline adapter used for local development, direct web hosting,
 * or when external platform SDKs are absent or blocked.
 */

import { AdCallbacks, IPlatformAdapter } from './PlatformAdapter';

export class LocalPlatform implements IPlatformAdapter {
  public readonly id = 'local';
  public readonly name = 'Local Platform (Standalone)';
  public isInitialized = false;

  public async init(): Promise<boolean> {
    this.isInitialized = true;
    return true;
  }

  public loadingStart(): void {
    // Local no-op
  }

  public loadingStop(): void {
    // Local no-op
  }

  public gameplayStart(): void {
    // Local no-op
  }

  public gameplayStop(): void {
    // Local no-op
  }

  public happytime(): void {
    // Local no-op
  }

  public async requestAd(type: 'midgame' | 'rewarded' = 'midgame', callbacks?: AdCallbacks): Promise<boolean> {
    callbacks?.onStart?.();
    // Simulate instantaneous clean ad completion without breaking flow
    callbacks?.onFinish?.();
    return true;
  }

  public hasAdSupport(): boolean {
    return false;
  }
}
