/**
 * BLACKOUT — Local Storage & Persistence Manager
 * 
 * Safe storage wrapper with memory fallback for private windows or sandboxed iframes.
 */

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0.0 to 1.0
  reducedMotion: boolean;
  quality: 'auto' | 'high' | 'med' | 'low';
}

export interface GameStats {
  highScore: number;
  bestSector: number;
  totalRuns: number;
  totalTimeSeconds: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.75,
  reducedMotion: false,
  quality: 'auto',
};

const DEFAULT_STATS: GameStats = {
  highScore: 0,
  bestSector: 1,
  totalRuns: 0,
  totalTimeSeconds: 0,
};

const STORAGE_KEYS = {
  SETTINGS: 'blackout_game_settings',
  STATS: 'blackout_game_stats',
};

class StorageManager {
  private memorySettings: GameSettings = { ...DEFAULT_SETTINGS };
  private memoryStats: GameStats = { ...DEFAULT_STATS };
  private isStorageAvailable = true;

  constructor() {
    this.checkStorageSupport();
    this.load();
  }

  private checkStorageSupport(): void {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      this.isStorageAvailable = true;
    } catch {
      this.isStorageAvailable = false;
    }
  }

  private load(): void {
    if (!this.isStorageAvailable) return;

    try {
      const savedSettings = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        this.memorySettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }

      const savedStats = window.localStorage.getItem(STORAGE_KEYS.STATS);
      if (savedStats) {
        this.memoryStats = { ...DEFAULT_STATS, ...JSON.parse(savedStats) };
      }
    } catch (e) {
      console.warn('Failed to load from storage, using memory cache:', e);
    }
  }

  public getSettings(): GameSettings {
    return { ...this.memorySettings };
  }

  public saveSettings(settings: Partial<GameSettings>): GameSettings {
    this.memorySettings = { ...this.memorySettings, ...settings };
    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.memorySettings));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
    }
    return this.getSettings();
  }

  public getStats(): GameStats {
    return { ...this.memoryStats };
  }

  public recordRun(score: number, sector: number, durationSeconds: number): { isNewHighScore: boolean; isNewBestSector: boolean } {
    const isNewHighScore = score > this.memoryStats.highScore;
    const isNewBestSector = sector > this.memoryStats.bestSector;

    this.memoryStats.highScore = Math.max(this.memoryStats.highScore, score);
    this.memoryStats.bestSector = Math.max(this.memoryStats.bestSector, sector);
    this.memoryStats.totalRuns += 1;
    this.memoryStats.totalTimeSeconds += Math.floor(durationSeconds);

    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(this.memoryStats));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
    }

    return { isNewHighScore, isNewBestSector };
  }
}

export const storage = new StorageManager();
