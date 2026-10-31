import { Component, type ReactNode } from 'react';

// The last safety net. A bug in one screen should not leave the driver on a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="login">
        <h1 className="brand brand-large">Apex</h1>
        <div className="card">
          <h2>Something went wrong</h2>
          <p>The page could not be shown. Reload the page to try again.</p>
          <button type="button" className="button button-primary" onClick={() => location.reload()}>
            Reload the page
          </button>
        </div>
      </main>
    );
  }
}
