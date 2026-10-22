import { Component, type ErrorInfo, type ReactNode } from "react";
import { showArgusError } from "./error-view";

type State = { crashed: boolean };

export class ArgusErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    showArgusError({
      fatal: true,
      code: error.name || "Crash",
      title: "Crash",
      message:
        error.message ||
        "Something blew up while rendering. Reload to recover, or send us the technical detail.",
      detail: [
        `${error.name}: ${error.message}`,
        "",
        error.stack ?? "(no stack)",
        "",
        "Component stack:",
        info.componentStack ?? "(none)",
      ].join("\n"),
    });
  }

  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}
