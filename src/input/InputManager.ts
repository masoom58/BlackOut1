/**
 * BLACKOUT — Unified Input Manager
 * 
 * Aggregates Keyboard, Touch, and Gamepad inputs into a clean, normalized
 * vector and action state for the game engine.
 */

import { InputState } from '../game/Types';
import { KeyboardInput } from './KeyboardInput';
import { TouchInput, TouchState } from './TouchInput';

export class InputManager {
  private keyboard: KeyboardInput;
  public touch: TouchInput;
  private isTouchDevice = false;

  constructor(onPause?: () => void) {
    this.keyboard = new KeyboardInput(onPause);
    this.touch = new TouchInput();

    // Detect touch capability
    this.isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  public bindTouchContainer(element: HTMLElement): void {
    this.touch.bind(element);
  }

  public destroy(): void {
    this.keyboard.destroy();
    this.touch.destroy();
  }

  public reset(): void {
    this.keyboard.reset();
    this.touch.reset();
  }

  public getInput(): InputState {
    const keyVec = this.keyboard.getVector();
    const touchState = this.touch.getState();

    // Check standard gamepad support if connected
    let gpX = 0;
    let gpY = 0;
    let gpFlash = false;
    let gpPause = false;

    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        const deadzone = 0.15;
        const rawX = gp.axes[0] || 0;
        const rawY = gp.axes[1] || 0;

        if (Math.abs(rawX) > deadzone) gpX = rawX;
        if (Math.abs(rawY) > deadzone) gpY = rawY;

        // Button 0 (A), Button 7 (Right Trigger) for Flashlight
        gpFlash = (gp.buttons[0]?.pressed || gp.buttons[7]?.pressed) ?? false;
        // Button 9 (Start) for Pause
        gpPause = gp.buttons[9]?.pressed ?? false;
      }
    }

    // Merge vector inputs with priority on whichever is non-zero
    let moveX = keyVec.x;
    let moveY = keyVec.y;

    if (Math.hypot(touchState.moveX, touchState.moveY) > 0.05) {
      moveX = touchState.moveX;
      moveY = touchState.moveY;
    } else if (Math.hypot(gpX, gpY) > 0.05) {
      moveX = gpX;
      moveY = gpY;
    }

    // Clamp magnitude to 1
    const mag = Math.hypot(moveX, moveY);
    if (mag > 1) {
      moveX /= mag;
      moveY /= mag;
    }

    const flashlight =
      this.keyboard.isFlashlightPressed() ||
      touchState.flashlight ||
      gpFlash;

    return {
      moveX,
      moveY,
      flashlight,
      pause: gpPause,
    };
  }

  public setDpad(dx: number, dy: number): void {
    this.touch.setDpad(dx, dy);
  }

  public getTouchState(): TouchState {
    return this.touch.getState();
  }

  public hasTouchCapability(): boolean {
    return this.isTouchDevice;
  }
}

