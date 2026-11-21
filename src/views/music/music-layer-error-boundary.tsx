import { Component, type ReactNode } from "react";
import { Music2 } from "@/components/icons/music-icons";

export class MusicLayerErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error("[MusicView] Layer error caught:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          data-music-view
          className="w-full h-full min-h-0 min-w-0 flex-1 pt-28 px-5 sm:px-8 text-ink bg-canvas flex flex-col items-center justify-center gap-4"
        >
          <div className="flex flex-col items-center gap-3 text-center max-w-md">
            <div className="p-3 rounded-full bg-surface-raised border border-edge">
              <Music2 size={28} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Music Interface Recovery</h2>
            <p className="text-sm text-ink-muted">
              {this.state.error.message ||
                "An issue occurred while loading the music view. Click below to recover."}
            </p>
            <button
              type="button"
              className="mt-2 px-5 py-2.5 rounded-full bg-accent text-white font-medium text-sm transition-transform active:scale-95 hover:brightness-110"
              onClick={() => this.setState({ error: null })}
            >
              Reload Music View
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
