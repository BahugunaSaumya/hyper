// src/lib/cache.ts
type Entry<T = unknown> = { v: T; exp: number; swr: number };
const mem = new Map<string, Entry>();
const now = () => Date.now();

// toggle console logs by setting NEXT_PUBLIC_CACHE_DEBUG=true
const DEBUG = (process.env.NEXT_PUBLIC_CACHE_DEBUG ?? "").toLowerCase() === "true";
const log = (...args: any[]) => { if (DEBUG) console.log("[cache]", ...args); };

export function get<T = unknown>(k: string): T | undefined {
  const e = mem.get(k);
  if (!e) return;
  const t = now();
  if (t <= e.exp) { log("HIT:fresh", k); return e.v as T; }
  if (t <= e.swr) { log("HIT:stale", k); return e.v as T; }
  log("EXPIRED", k);
  mem.delete(k);
}

export function peek(k: string) {
  // Like get(), but does NOT alter the entry or delete it when expired
  const e = mem.get(k);
  if (!e) return { has: false as const };
  const t = now();
  return {
    has: true as const,
    fresh: t <= e.exp,
    stale: t > e.exp && t <= e.swr,
    expired: t > e.swr,
  };
}

export function set<T = unknown>(k: string, v: T, ttlMs = 60_000, swrMs = 5 * 60_000) {
  const t = now();
  mem.set(k, { v, exp: t + ttlMs, swr: t + swrMs });
  log("SET", k, { ttlMs, swrMs });
}

export function del(keyOrPrefix: string) {
  let n = 0;
  for (const k of mem.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) { mem.delete(k); n++; }
  }
  log("DEL", keyOrPrefix, { removed: n });
}

export async function remember<T>(
  k: string,
  ttlMs: number,
  swrMs: number,
  fetcher: () => Promise<T>,
  onBg?: (fresh: T) => void
): Promise<T> {
  const e = mem.get(k);
  const t = now();

  if (e) {
    if (t <= e.exp) { log("HIT:fresh", k); return e.v as T; }
    if (t <= e.swr) {
      log("HIT:stale→BGRefresh", k);
      fetcher().then(f => { set(k, f, ttlMs, swrMs); onBg?.(f); }).catch(() => {});
      return e.v as T;
    }
    log("MISS:expired", k);
  } else {
    log("MISS", k);
  }

  const fresh = await fetcher();
  set(k, fresh, ttlMs, swrMs);
  return fresh;
}
