/**
 * Camera Interaction Listeners
 * Setup and manage camera interaction event listeners
 */
import type { DragControls } from './DragControls'

export interface InteractionCallbacks {
  onPointerDown?: (event: PointerEvent) => void
  onPointerMove?: (event: PointerEvent) => void
  onPointerUp?: () => void
  onWheel?: (event: WheelEvent) => void
  onTouchStart?: () => void
}

export class CameraInteractionListeners {
  private domElement: HTMLElement
  private dragControls: DragControls | null
  private callbacks: InteractionCallbacks
  private userInteracting: boolean = false

  constructor(
    domElement: HTMLElement,
    dragControls: DragControls | null = null,
    callbacks: InteractionCallbacks = {}
  ) {
    this.domElement = domElement
    this.dragControls = dragControls
    this.callbacks = callbacks

    this.setup()
  }

  /**
   * Setup all interaction event listeners
   */
  private setup(): void {
    this.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.domElement.addEventListener('pointerup', this.handlePointerUp)
    this.domElement.addEventListener('pointerleave', this.handlePointerUp)
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: true })
    this.domElement.addEventListener('wheel', this.handleWheelInteraction, { passive: true })
    this.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    this.domElement.addEventListener('touchend', this.handlePointerUp, { passive: true })
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.userInteracting = true

    if (this.dragControls && event.button === 0) {
      this.dragControls.startDrag(event.clientX, event.clientY)
    }

    if (this.callbacks.onPointerDown) {
      this.callbacks.onPointerDown(event)
    }
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.dragControls) {
      this.dragControls.handlePointerMove(event)
    }

    if (this.callbacks.onPointerMove) {
      this.callbacks.onPointerMove(event)
    }
  }

  private handlePointerUp = (): void => {
    if (this.dragControls) {
      this.dragControls.stopDrag()
    }

    if (this.callbacks.onPointerUp) {
      this.callbacks.onPointerUp()
    }
  }

  private handleWheel = (event: WheelEvent): void => {
    if (this.callbacks.onWheel) {
      this.callbacks.onWheel(event)
    }
  }

  private handleWheelInteraction = (): void => {
    this.userInteracting = true
  }

  private handleTouchStart = (): void => {
    this.userInteracting = true

    if (this.callbacks.onTouchStart) {
      this.callbacks.onTouchStart()
    }
  }

  /**
   * Check if user is currently interacting
   */
  public isUserInteracting(): boolean {
    return this.userInteracting
  }

  /**
   * Reset interaction flag
   */
  public resetInteractionFlag(): void {
    this.userInteracting = false
  }

  /**
   * Update callbacks
   */
  public setCallbacks(callbacks: InteractionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * Dispose of event listeners
   */
  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.domElement.removeEventListener('pointerleave', this.handlePointerUp)
    this.domElement.removeEventListener('wheel', this.handleWheel)
    this.domElement.removeEventListener('wheel', this.handleWheelInteraction)
    this.domElement.removeEventListener('touchstart', this.handleTouchStart)
    this.domElement.removeEventListener('touchend', this.handlePointerUp)
  }
}
