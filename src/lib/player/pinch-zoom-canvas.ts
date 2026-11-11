/**
 * Multi-Touch Pinch-to-Zoom & Pan Canvas Engine
 *
 * Implements IINA-level fluid trackpad gesture zooming (1.0x to 8.0x) and panning
 * directly on the video player viewport, with spring bounds and double-click reset.
 */

export interface ZoomPanTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  isZoomed: boolean;
}

export interface PinchZoomConfig {
  minScale: number; // default: 1.0
  maxScale: number; // default: 8.0
  friction: number; // inertia dampening, 0.0 to 1.0
  doubleTapResetEnabled: boolean;
}

const DEFAULT_CONFIG: PinchZoomConfig = {
  minScale: 1.0,
  maxScale: 8.0,
  friction: 0.85,
  doubleTapResetEnabled: true,
};

export class PinchZoomCanvasController {
  private scale: number = 1.0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private viewportWidth: number = 1920;
  private viewportHeight: number = 1080;
  private config: PinchZoomConfig;
  private listeners = new Set<(t: ZoomPanTransform) => void>();

  constructor(config: Partial<PinchZoomConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = Math.max(100, width);
    this.viewportHeight = Math.max(100, height);
    this.clampOffsets();
  }

  public getTransform(): ZoomPanTransform {
    return {
      scale: Math.round(this.scale * 1000) / 1000,
      offsetX: Math.round(this.offsetX),
      offsetY: Math.round(this.offsetY),
      isZoomed: this.scale > 1.01,
    };
  }

  /**
   * Applies an incremental pinch scale delta centered around a focal point (clientX, clientY).
   */
  public handlePinchZoom(scaleMultiplier: number, focalX?: number, focalY?: number): ZoomPanTransform {
    const prevScale = this.scale;
    const nextScale = Math.min(
      this.config.maxScale,
      Math.max(this.config.minScale, prevScale * scaleMultiplier),
    );

    if (Math.abs(nextScale - prevScale) < 1e-4) {
      return this.getTransform();
    }

    const fx = focalX ?? this.viewportWidth / 2;
    const fy = focalY ?? this.viewportHeight / 2;

    // Adjust offsets so zoom centers on the user's cursor / touch focal point
    const scaleRatio = nextScale / prevScale;
    this.offsetX = fx - (fx - this.offsetX) * scaleRatio;
    this.offsetY = fy - (fy - this.offsetY) * scaleRatio;
    this.scale = nextScale;

    if (this.scale <= 1.01) {
      this.reset();
    } else {
      this.clampOffsets();
      this.notify();
    }

    return this.getTransform();
  }

  /**
   * Pans the zoomed viewport by deltaX and deltaY.
   */
  public handlePan(deltaX: number, deltaY: number): ZoomPanTransform {
    if (this.scale <= 1.01) return this.getTransform();

    this.offsetX += deltaX;
    this.offsetY += deltaY;
    this.clampOffsets();
    this.notify();

    return this.getTransform();
  }

  /**
   * Resets transform back to standard 1.0x centered zoom.
   */
  public reset(): ZoomPanTransform {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.notify();
    return this.getTransform();
  }

  public subscribe(fn: (t: ZoomPanTransform) => void): () => void {
    this.listeners.add(fn);
    fn(this.getTransform());
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Generates CSS transform string for video canvas or container.
   */
  public toCssTransform(): string {
    const t = this.getTransform();
    if (!t.isZoomed) return "none";
    return `translate3d(${t.offsetX}px, ${t.offsetY}px, 0px) scale(${t.scale})`;
  }

  /**
   * Translates current zoom and pan coordinates to MPV native video-zoom and pan properties.
   */
  public toMpvProperties(): Array<{ name: string; value: string }> {
    const t = this.getTransform();
    if (!t.isZoomed) {
      return [
        { name: "video-zoom", value: "0" },
        { name: "video-pan-x", value: "0" },
        { name: "video-pan-y", value: "0" },
      ];
    }

    // In MPV: video-zoom is log2(scale), pan is normalized -1.0 to 1.0
    const zoomLog2 = (Math.log2(t.scale)).toFixed(3);
    const panX = (t.offsetX / (this.viewportWidth * (t.scale - 1) || 1)).toFixed(3);
    const panY = (t.offsetY / (this.viewportHeight * (t.scale - 1) || 1)).toFixed(3);

    return [
      { name: "video-zoom", value: zoomLog2 },
      { name: "video-pan-x", value: panX },
      { name: "video-pan-y", value: panY },
    ];
  }

  private clampOffsets(): void {
    if (this.scale <= 1.01) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const maxOffsetX = (this.viewportWidth * (this.scale - 1)) / 2;
    const maxOffsetY = (this.viewportHeight * (this.scale - 1)) / 2;

    this.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.offsetX));
    this.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.offsetY));
  }

  private notify(): void {
    const t = this.getTransform();
    for (const fn of this.listeners) {
      try {
        fn(t);
      } catch {}
    }
  }
}
