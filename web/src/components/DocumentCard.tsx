import { useId, useState, type ChangeEvent } from 'react';
import { ApiError } from '../api/client';
import { documentFileUrl, type DocumentFile, type DocumentStatus } from '../api/documents';
import { ACCEPT, checkFile, formatSize } from '../lib/files';
import { formatWhen } from '../lib/format';
import { Icon, type IconName } from './Icon';

const statuses: Record<DocumentStatus, { label: string; icon: IconName; className: string }> = {
  missing: { label: 'Not uploaded', icon: 'circle', className: 'chip chip-pending' },
  review: { label: 'Under review', icon: 'hourglass', className: 'chip' },
  approved: { label: 'Approved', icon: 'checkCircle', className: 'chip chip-done' },
};

interface Props {
  title: string;
  detail?: string;
  status: DocumentStatus;
  file?: DocumentFile;
  // Sends the file. Resolves when the screen has the new list.
  onUpload: (file: File) => Promise<void>;
}

export function DocumentCard({ title, detail, status, file, onUpload }: Props) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chip = statuses[status];

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // So choosing the same file again still counts as a change.
    event.target.value = '';
    if (!chosen) return;

    const problem = checkFile(chosen);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onUpload(chosen);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card task">
      <header className="task-head">
        <h3 className="task-title">{title}</h3>
        <span className={chip.className}>
          <Icon name={chip.icon} />
          {chip.label}
        </span>
      </header>

      {detail && <p className="task-description">{detail}</p>}

      {file ? (
        <p className="task-due">
          {file.originalName} ({formatSize(file.size)}), added {formatWhen(file.uploadedAt)}
        </p>
      ) : (
        <p className="task-description">You have not uploaded this yet.</p>
      )}

      <div className="doc-actions">
        {/* The real file input stays in the page for keyboard and screen reader users.
            The label is the big button a driver taps. */}
        <input
          id={inputId}
          className="file-input"
          type="file"
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => void choose(e)}
        />
        <label htmlFor={inputId} className="button button-primary">
          {busy ? 'Uploading…' : file ? 'Replace file' : 'Upload file'}
        </label>
        {file && (
          <a className="button" href={documentFileUrl(file.id)}>
            Download file
          </a>
        )}
      </div>

      {error && (
        <p className="message message-error" role="alert">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </article>
  );
}
