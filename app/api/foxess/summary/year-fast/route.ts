import { NextRequest, NextResponse } from "next/server";

/** cache w pamięci (10 min) */
type CacheEntry = { exp: number; value: any };
const CACHE: Map<string, CacheEntry> = (globalThis as any).__FOX_CACHE__ ?? new Map();
(globalThis as any).__FOX_CACHE__ = CACHE;
function getCache(key: string) {
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { CACHE.delete(key); return null; }
  return e.value;
}
function setCache(key: string, value: any, ttlMs = 10 * 60 * 1000) {
  CACHE.set(key, { exp: Date.now() + ttlMs, value });
}

// prosty limiter równoległości
async function withPool<T>(items: string[], limit: number, fn: (m: string) => Promise<T>) {
  const ret: T[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return ret;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year"); // YYYY
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ ok: false, error: "year (YYYY) required" }, { status: 200 });
    }

    const cacheKey = `year-fast:${year}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // zrób 12 zapytań do month-fast z małą równoległością
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    const parts = await withPool(months, 3, async (m) => {
      const r = await fetch(`${url.origin}/api/foxess/summary/month-fast?month=${m}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`month-fast ${m} ${r.status}`);
      const j = await r.json();
      const sum = Number(j?.totals?.generation ?? 0) || 0;
      return { month: m.slice(-2), generation: +sum.toFixed(2) };
    });

    const total = +parts.reduce((a, x) => a + (x.generation || 0), 0).toFixed(2);
    const payload = { ok: true, year, source: "sum(month-fast)", months: parts, totals: { generation: total } };

    setCache(cacheKey, payload);
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
