// Failed sign-ins per driver ID and IP, in memory; a restart clears it.
export function createLoginLimiter(maxFailures = 5, windowMs = 15 * 60_000) {
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((t) => now - t < windowMs);

  return {
    minutesUntilAllowed(key: string, now = Date.now()): number {
      const times = recent(key, now);
      const oldest = times[0];
      if (times.length < maxFailures || oldest === undefined) return 0;
      return Math.ceil((oldest + windowMs - now) / 60_000);
    },
    recordFailure(key: string, now = Date.now()): void {
      failures.set(key, [...recent(key, now), now]);
    },
    clear(key: string): void {
      failures.delete(key);
    },
  };
}

export type LoginLimiter = ReturnType<typeof createLoginLimiter>;
