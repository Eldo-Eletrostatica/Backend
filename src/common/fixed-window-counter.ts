interface WindowCount {
  count: number;
  windowEndsAt: number;
}

// Counts events per key in fixed windows that start at the first event.
// In memory: counts reset when the API restarts and are not shared between
// instances, which is enough for the single server of each client's deploy.
export class FixedWindowCounter {
  private readonly counts = new Map<string, WindowCount>();
  private nextCleanupAt = 0;

  constructor(private readonly windowMs: number) {}

  count(key: string, now = Date.now()): number {
    const entry = this.counts.get(key);
    return entry && entry.windowEndsAt > now ? entry.count : 0;
  }

  increment(key: string, now = Date.now()): void {
    this.removeExpiredCounts(now);
    const entry = this.counts.get(key);
    if (entry && entry.windowEndsAt > now) {
      entry.count += 1;
    } else {
      this.counts.set(key, { count: 1, windowEndsAt: now + this.windowMs });
    }
  }

  reset(key: string): void {
    this.counts.delete(key);
  }

  // Keeps the map from growing with every key an attacker tries.
  private removeExpiredCounts(now: number): void {
    if (now < this.nextCleanupAt) return;
    for (const [key, entry] of this.counts) {
      if (entry.windowEndsAt <= now) this.counts.delete(key);
    }
    this.nextCleanupAt = now + this.windowMs;
  }
}
