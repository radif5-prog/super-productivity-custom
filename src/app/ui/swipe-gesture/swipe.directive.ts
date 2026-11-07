import { Directive, HostListener, input, output } from '@angular/core';

/**
 * Simple swipe directive for touch gestures.
 * Detects swipe left and swipe right gestures.
 */
@Directive({
  selector: '[swipeGesture]',
  standalone: true,
})
export class SwipeDirective {
  readonly swiperight = output<void>();
  readonly swipeleft = output<void>();

  // Configuration options
  readonly swipeThreshold = input(50); // Minimum distance in pixels
  readonly swipeVelocityThreshold = input(0.3); // Minimum velocity in pixels/ms
  readonly swipeMaxTime = input(1000); // Maximum time in ms for a swipe
  readonly swipeEnabled = input(true); // Enable/disable swipe detection

  /**
   * Optional left-screen-edge gate for right swipes. When specified, a
   * `swiperight` gesture is recognized only when its initial touch is within
   * this number of CSS pixels from the viewport's left edge.
   */
  readonly swipeStartEdgePx = input<number | null>(null);

  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeStartTime = 0;
  private touchIdentifier: number | null = null;
  private isRightSwipeAllowed = true;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.swipeEnabled() || this.touchIdentifier !== null) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const edgePx = this.swipeStartEdgePx();
    this.isRightSwipeAllowed = edgePx === null || touch.clientX <= edgePx;
    this.touchIdentifier = touch.identifier;
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeStartTime = Date.now();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.swipeEnabled() || this.touchIdentifier === null) {
      return;
    }

    // Find the touch that matches our identifier.
    let touch: Touch | null = null;
    for (let i = 0; i < event.changedTouches.length; i++) {
      if (event.changedTouches[i].identifier === this.touchIdentifier) {
        touch = event.changedTouches[i];
        break;
      }
    }

    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - this.swipeStartX;
    const deltaY = touch.clientY - this.swipeStartY;
    const deltaTime = Date.now() - this.swipeStartTime;
    const isRightSwipeAllowed = this.isRightSwipeAllowed;

    // Reset state.
    this.touchIdentifier = null;
    this.isRightSwipeAllowed = true;

    // Check if this qualifies as a swipe.
    if (deltaTime > this.swipeMaxTime()) {
      return; // Too slow
    }

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Check if horizontal movement is dominant.
    if (absX < this.swipeThreshold() || absX < absY * 1.5) {
      return; // Not enough horizontal movement or too much vertical movement
    }

    // Calculate velocity.
    const velocity = absX / deltaTime;
    if (velocity < this.swipeVelocityThreshold()) {
      return; // Too slow
    }

    // A left swipe is unrestricted. The optional edge gate exists solely for
    // the right swipe used to open the mobile side navigation.
    if (deltaX > 0) {
      if (isRightSwipeAllowed) {
        this.swiperight.emit();
      }
    } else {
      this.swipeleft.emit();
    }
  }

  @HostListener('touchcancel')
  onTouchCancel(): void {
    // Reset state on cancel.
    this.touchIdentifier = null;
    this.isRightSwipeAllowed = true;
  }
}
