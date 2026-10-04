/**
 * BLACKOUT — Touch & Virtual Joystick Input Handler
 * 
 * Supports responsive multi-touch: virtual thumbstick on the left zone
 * and dedicated Flashlight action button on the right zone.
 */

export interface TouchState {
  moveX: number;
  moveY: number;
  flashlight: boolean;
  joystickActive: boolean;
  joystickBaseX: number;
  joystickBaseY: number;
  joystickStickX: number;
  joystickStickY: number;
}

export class TouchInput {
  private touchState: TouchState = {
    moveX: 0,
    moveY: 0,
    flashlight: false,
    joystickActive: false,
    joystickBaseX: 0,
    joystickBaseY: 0,
    joystickStickX: 0,
    joystickStickY: 0,
  };

  private dpadMoveX = 0;
  private dpadMoveY = 0;

  private activeMovementTouchId: number | null = null;
  private containerElement: HTMLElement | null = null;
  private readonly maxRadius = 45; // Maximum thumbstick travel in pixels

  constructor() {
    // Container bound when UI mounts
  }

  public bind(element: HTMLElement): void {
    this.containerElement = element;
    element.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: false });
  }

  public destroy(): void {
    if (this.containerElement) {
      this.containerElement.removeEventListener('pointerdown', this.onPointerDown);
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.reset();
  }

  public reset(): void {
    this.activeMovementTouchId = null;
    this.dpadMoveX = 0;
    this.dpadMoveY = 0;
    this.touchState = {
      moveX: 0,
      moveY: 0,
      flashlight: false,
      joystickActive: false,
      joystickBaseX: 0,
      joystickBaseY: 0,
      joystickStickX: 0,
      joystickStickY: 0,
    };
  }

  /** Direct directional input from On-Screen D-Pad buttons */
  public setDpad(dx: number, dy: number): void {
    this.dpadMoveX = dx;
    this.dpadMoveY = dy;
  }

  private onPointerDown = (e: PointerEvent): void => {
    // Only respond to primary mouse button or touch/pen
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    // Don't hijack clicks on buttons or interactive UI controls
    if (target && target.closest('button, [data-interactive="true"]')) {
      return;
    }

    const rect = this.containerElement?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (this.activeMovementTouchId === null) {
      this.activeMovementTouchId = e.pointerId;
      this.touchState.joystickActive = true;
      this.touchState.joystickBaseX = clientX;
      this.touchState.joystickBaseY = clientY;
      this.touchState.joystickStickX = clientX;
      this.touchState.joystickStickY = clientY;
      this.touchState.moveX = 0;
      this.touchState.moveY = 0;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId === this.activeMovementTouchId && this.containerElement) {
      const rect = this.containerElement.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      let dx = clientX - this.touchState.joystickBaseX;
      let dy = clientY - this.touchState.joystickBaseY;
      const dist = Math.hypot(dx, dy);

      if (dist > this.maxRadius) {
        dx = (dx / dist) * this.maxRadius;
        dy = (dy / dist) * this.maxRadius;
      }

      this.touchState.joystickStickX = this.touchState.joystickBaseX + dx;
      this.touchState.joystickStickY = this.touchState.joystickBaseY + dy;

      // Ultra responsive deadzone (0.05 instead of 0.12)
      const normalizedMag = Math.min(1, dist / this.maxRadius);
      if (normalizedMag < 0.05) {
        this.touchState.moveX = 0;
        this.touchState.moveY = 0;
      } else {
        const factor = (normalizedMag - 0.05) / (1 - 0.05);
        this.touchState.moveX = (dx / (dist || 1)) * factor;
        this.touchState.moveY = (dy / (dist || 1)) * factor;
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.activeMovementTouchId) {
      this.activeMovementTouchId = null;
      this.touchState.joystickActive = false;
      this.touchState.moveX = 0;
      this.touchState.moveY = 0;
    }
  };

  public setFlashlightTouch(active: boolean): void {
    this.touchState.flashlight = active;
  }

  public getState(): TouchState {
    // If D-Pad buttons are pressed, they take priority
    if (Math.hypot(this.dpadMoveX, this.dpadMoveY) > 0.05) {
      return {
        ...this.touchState,
        moveX: this.dpadMoveX,
        moveY: this.dpadMoveY,
      };
    }
    return this.touchState;
  }
}

