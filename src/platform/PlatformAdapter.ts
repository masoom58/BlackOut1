/**
 * BLACKOUT — Platform Adapter Interface
 * 
 * Provides unified abstraction over runtime hosting platforms.
 * Decouples core game logic from any proprietary platform SDKs (CrazyGames, Poki, local, etc.).
 */

export interface AdCallbacks {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: unknown) => void;
}

export interface IPlatformAdapter {
  readonly id: string;
  readonly name: string;
  readonly isInitialized: boolean;

  /** Initializes the platform SDK if available */
  init(): Promise<boolean>;

  /** Signals to the platform that loading has begun */
  loadingStart(): void;

  /** Signals to the platform that loading has completed */
  loadingStop(): void;

  /** Signals to the platform that active gameplay has started or resumed */
  gameplayStart(): void;

  /** Signals to the platform that active gameplay has stopped (menu, pause, game over) */
  gameplayStop(): void;

  /** Signals an exciting gameplay moment (e.g. high score, cleared sector) */
  happytime(): void;

  /**
   * Requests an advertisement (e.g., 'midgame' at natural break or 'rewarded').
   * Guaranteed to resolve without throwing an unhandled rejection.
   */
  requestAd(type?: 'midgame' | 'rewarded', callbacks?: AdCallbacks): Promise<boolean>;

  /** Whether the underlying platform supports ads */
  hasAdSupport(): boolean;
}
