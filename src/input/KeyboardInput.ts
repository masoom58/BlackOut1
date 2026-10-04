/**
 * BLACKOUT — Desktop Keyboard Input Handler
 * 
 * Supports WASD, ZQSD (French layouts), Arrow keys, IJKL, Numpad arrows,
 * Spacebar (Flashlight), ESC & P (Pause), F.
 * Maps both e.code and e.key with event capture for bulletproof iframe compatibility.
 */

export class KeyboardInput {
  private keys: Record<string, boolean> = {};
  private onPauseTrigger?: () => void;

  constructor(onPause?: () => void) {
    this.onPauseTrigger = onPause;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    document.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('keyup', this.handleKeyUp, { capture: true });
    document.addEventListener('keyup', this.handleKeyUp, { capture: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    document.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
    document.removeEventListener('keyup', this.handleKeyUp, { capture: true });
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.keys = {};
  }

  public reset(): void {
    this.keys = {};
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.keys = {};
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const k = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';

    // Prevent default scrolling on arrow keys and spacebar during game play
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) ||
      [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
    ) {
      e.preventDefault();
    }

    if (code === 'Escape' || code === 'KeyP' || k === 'p' || e.key === 'Escape') {
      e.preventDefault();
      this.onPauseTrigger?.();
      return;
    }

    if (code) this.keys[code] = true;
    if (k) this.keys[k] = true;
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const k = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';
    if (code) this.keys[code] = false;
    if (k) this.keys[k] = false;
  };

  public getVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // Horizontal (A/D, Left/Right, Q for AZERTY, J/L for Vim)
    if (
      this.keys['KeyA'] ||
      this.keys['ArrowLeft'] ||
      this.keys['a'] ||
      this.keys['q'] ||
      this.keys['arrowleft'] ||
      this.keys['KeyJ'] ||
      this.keys['j'] ||
      this.keys['Numpad4']
    ) {
      x -= 1;
    }
    if (
      this.keys['KeyD'] ||
      this.keys['ArrowRight'] ||
      this.keys['d'] ||
      this.keys['arrowright'] ||
      this.keys['KeyL'] ||
      this.keys['l'] ||
      this.keys['Numpad6']
    ) {
      x += 1;
    }

    // Vertical (W/S, Up/Down, Z for AZERTY, I/K for Vim)
    if (
      this.keys['KeyW'] ||
      this.keys['ArrowUp'] ||
      this.keys['w'] ||
      this.keys['z'] ||
      this.keys['arrowup'] ||
      this.keys['KeyI'] ||
      this.keys['i'] ||
      this.keys['Numpad8']
    ) {
      y -= 1;
    }
    if (
      this.keys['KeyS'] ||
      this.keys['ArrowDown'] ||
      this.keys['s'] ||
      this.keys['arrowdown'] ||
      this.keys['KeyK'] ||
      this.keys['k'] ||
      this.keys['Numpad2']
    ) {
      y += 1;
    }

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }

    return { x, y };
  }

  public isFlashlightPressed(): boolean {
    return !!(
      this.keys['Space'] ||
      this.keys['KeyF'] ||
      this.keys[' '] ||
      this.keys['f']
    );
  }
}
