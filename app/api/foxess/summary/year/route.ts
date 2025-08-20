import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJSONRetry(url: string, opts: RequestInit, tries = 3, baseDelay = 250) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { cache: "no-store", ...opts });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await sleep(baseDelay * (i + 1));
    }
  }
  throw lastErr;
}
async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await mapper(items[idx], idx);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year"); // YYYY
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ ok: false, error: "Parametr year (YYYY) jest wymagany" }, { status: 200 });
    }

    const base = originFrom(req);
    const tz = process.env.FOXESS_TZ || "Europe/Warsaw";

    // 1) init 12 miesięcy
    const months = Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1).padStart(2, "0"), generation: 0 }));

    // 2) spróbuj natywny rok FoxESS (z TZ)
    let nativeOk = false;
    try {
      const fox = await fetchJSONRetry(
        `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/year`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: process.env.FOXESS_TOKEN || "",
          },
          body: JSON.stringify({ sn: process.env.FOXESS_SN, year, timeZone: tz }),
        },
        3,
        300
      );
      const rows: any[] = fox?.result || fox?.data || [];
      if (Array.isArray(rows)) {
        for (const it of rows) {
          const mm = String(it?.date || "").slice(-2);
          const v = Number(it?.value);
          const hit = months.find((m) => m.month === mm);
          if (hit && Number.isFinite(v)) hit.generation = Math.max(0, v);
        }
        nativeOk = true;
      }
    } catch {
      // przejdź do fallbacku
    }

    // 3) fallback — uzupełnij brakujące miesiące naszym /month (który ma retry+fallback per dzień)
    const need = months.filter((m) => !Number(m.generation));
    if (need.length) {
      await pMapLimit(need, 2, async (m) => {
        try {
          const j = await fetchJSONRetry(`${base}/api/foxess/summary/month?month=${year}-${m.month}`, {}, 3, 300);
          const val = Number(j?.totals?.generation ?? 0) || 0;
          m.generation = +val.toFixed(2);
        } catch {
          // zostaw 0
        }
      });
    }

    const out = months.sort((a, b) => a.month.localeCompare(b.month));
    const total = +out.reduce((a, x) => a + (Number(x.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      year,
      source: nativeOk ? "foxess-native+fallback" : "fallback-only",
      months: out,
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
