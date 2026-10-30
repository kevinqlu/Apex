export async function getHealth(): Promise<{ ok: boolean }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('The server is not responding.');
  return res.json();
}
