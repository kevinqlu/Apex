import { Icon } from './Icon';

// Shared by every screen that loads the driver's loads.
export function LoadsLoading() {
  return (
    <p className="page-status" role="status">
      Loading your loads…
    </p>
  );
}

export function LoadsError({ message, onRetry }: { message: string; onRetry: () => void }) {
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
