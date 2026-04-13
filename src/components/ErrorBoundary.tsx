import * as React from "react";
import { captureError } from "../lib/telemetry";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    captureError(error, { source: "react_error_boundary", componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center">
            <div className="text-base font-semibold text-foreground">页面出现错误</div>
            <div className="mt-2 text-sm text-muted-foreground">请刷新页面重试</div>
            <button
              type="button"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              刷新
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

