/**
 * Hover-to-Preview "Quick Pitch" Micro-Trailer Engine
 *
 * Powers Netflix & Apple TV-style interactive poster cards that smoothly
 * expand into a high-definition, silent trailer micro-player when hovered for > 500ms.
 */

export interface PreviewState {
  metaId: string | null;
  trailerUrl: string | null;
  isLoading: boolean;
  isMuted: boolean;
  volume: number;
}

export interface HoverPreviewConfig {
  hoverDelayMs: number; // e.g. 500ms
  autoUnmuteOnHover: boolean;
  preloadHeadOnly: boolean;
}

const DEFAULT_CONFIG: HoverPreviewConfig = {
  hoverDelayMs: 500,
  autoUnmuteOnHover: false,
  preloadHeadOnly: true,
};

export class HoverPreviewController {
  private config: HoverPreviewConfig;
  private activeMetaId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private state: PreviewState = {
    metaId: null,
    trailerUrl: null,
    isLoading: false,
    isMuted: true,
    volume: 0,
  };
  private listeners = new Set<(state: PreviewState) => void>();

  constructor(config: Partial<HoverPreviewConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Called when pointer enters a poster card.
   */
  public onPointerEnter(
    metaId: string,
    fetchTrailerUrl: () => Promise<string | null>,
  ): void {
    if (this.activeMetaId === metaId) return;

    this.clearTimer();
    this.timer = setTimeout(async () => {
      this.activeMetaId = metaId;
      this.state = {
        metaId,
        trailerUrl: null,
        isLoading: true,
        isMuted: true,
        volume: 0,
      };
      this.emit();

      try {
        const url = await fetchTrailerUrl();
        // Ensure user hasn't hovered away in the meantime
        if (this.activeMetaId === metaId) {
          this.state = {
            ...this.state,
            trailerUrl: url,
            isLoading: false,
          };
          this.emit();
        }
      } catch {
        if (this.activeMetaId === metaId) {
          this.state = { ...this.state, isLoading: false };
          this.emit();
        }
      }
    }, this.config.hoverDelayMs);
  }

  /**
   * Called when pointer leaves a poster card.
   */
  public onPointerLeave(metaId?: string): void {
    if (!metaId || this.activeMetaId === metaId) {
      this.clearTimer();
      this.activeMetaId = null;
      this.state = {
        metaId: null,
        trailerUrl: null,
        isLoading: false,
        isMuted: true,
        volume: 0,
      };
      this.emit();
    }
  }

  public toggleMute(): boolean {
    this.state.isMuted = !this.state.isMuted;
    this.state.volume = this.state.isMuted ? 0 : 0.6;
    this.emit();
    return this.state.isMuted;
  }

  public getState(): PreviewState {
    return { ...this.state };
  }

  public subscribe(fn: (state: PreviewState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emit(): void {
    const s = this.getState();
    for (const fn of this.listeners) {
      try {
        fn(s);
      } catch {}
    }
  }
}

export const globalHoverPreviewController = new HoverPreviewController();
