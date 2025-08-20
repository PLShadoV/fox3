import { NextRequest, NextResponse } from "next/server";

/** prościutki cache w pamięci procesu (TTL minutowy) */
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month"); // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ ok: false, error: "month (YYYY-MM) required" }, { status: 200 });
    }

    const cacheKey = `month-fast:${month}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const token = process.env.FOXESS_TOKEN || "";
    const sn = process.env.FOXESS_SN;
    const tz = process.env.FOXESS_TZ || "Europe/Warsaw";
    const base = process.env.FOXESS_BASE ?? "https://www.foxesscloud.com";

    const r = await fetch(`${base}/op/v1/device/energy/month`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ sn, month, timeZone: tz }),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`FoxESS month HTTP ${r.status}`);
    const j = await r.json();

    // Zwykle: { result: [{ date:"YYYY-MM-DD", value:number }, ...] }
    const rows: any[] = j?.result || j?.data || [];
    const days = Array.isArray(rows)
      ? rows.map((d) => ({ date: String(d?.date || ""), generation: Number(d?.value) || 0 }))
      : [];

    const total = +days.reduce((a, x) => a + (x.generation || 0), 0).toFixed(2);
    const payload = { ok: true, month, source: "device/month-fast", days, totals: { generation: total } };

    setCache(cacheKey, payload);
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
