import { Icon } from './Icon';

// Shared by every screen that loads something from the server.
export function Loading({ what }: { what: string }) {
  return (
    <p className="page-status" role="status">
      Loading {what}…
    </p>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <p className="message message-error">
        <Icon name="error" />
        <span>{message}</span>
      </p>
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
