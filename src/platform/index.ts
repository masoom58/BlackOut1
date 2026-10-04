/**
 * BLACKOUT — Platform Factory & Singleton
 */

import { CrazyGamesPlatform } from './CrazyGamesPlatform';
import { LocalPlatform } from './LocalPlatform';
import { IPlatformAdapter } from './PlatformAdapter';

let activePlatform: IPlatformAdapter | null = null;

export async function initPlatform(): Promise<IPlatformAdapter> {
  if (activePlatform) {
    return activePlatform;
  }

  // Attempt to initialize CrazyGamesPlatform first
  const crazyGames = new CrazyGamesPlatform();
  const success = await crazyGames.init();

  if (success && crazyGames.isInitialized) {
    activePlatform = crazyGames;
    return activePlatform;
  }

  // Fallback to LocalPlatform
  const local = new LocalPlatform();
  await local.init();
  activePlatform = local;
  return activePlatform;
}

export function getPlatform(): IPlatformAdapter {
  if (!activePlatform) {
    activePlatform = new LocalPlatform();
    activePlatform.init();
  }
  return activePlatform;
}
