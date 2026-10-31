// The same limits the server enforces. Checking here too just saves a slow trip for a file
// that was never going to be accepted. The server is the one that decides.
const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic'];

export const ACCEPT = EXTENSIONS.map((e) => `.${e}`).join(',');

// Returns a plain-language problem, or null when the file looks fine.
export function checkFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSIONS.includes(extension)) {
    return 'That file type is not allowed. Upload a PDF, JPG, PNG, or HEIC file.';
  }
  if (file.size > MAX_BYTES) return 'That file is too large. The limit is 10 MB.';
  if (file.size === 0) return 'That file is empty. Choose a different file.';
  return null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
