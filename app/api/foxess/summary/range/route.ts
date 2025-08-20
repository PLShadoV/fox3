import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatYMDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function monthKey(date: string) { return date.slice(0, 7); }
function* monthsBetweenInclusive(from: string, to: string) {
  const d = parseYMD(from);
  const end = parseYMD(to);
  d.setUTCDate(1);
  end.setUTCDate(1);
  while (d.getTime() <= end.getTime()) {
    yield `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
}

async function getJSON(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ ok: false, error: "Podaj ?from i ?to w formacie YYYY-MM-DD" }, { status: 200 });
    }
    if (parseYMD(from) > parseYMD(to)) {
      return NextResponse.json({ ok: false, error: "`from` nie może być po `to`" }, { status: 200 });
    }

    const base = originFrom(req);
    const days: { date: string; kwh: number }[] = [];
    const failedDates: string[] = [];

    // 1) pobierz komplet miesięcy i zsumuj tylko daty w zakresie
    for (const m of monthsBetweenInclusive(from, to)) {
      try {
        const j = await getJSON(`${base}/api/foxess/summary/month?month=${m}`);
        const list: any[] = Array.isArray(j?.days) ? j.days : [];
        const failed: string[] = Array.isArray(j?.failedDates) ? j.failedDates : [];
        // zbierz ewentualne niepowodzenia z miesiąca
        failed.forEach((d) => failedDates.push(d));
        // przefiltruj na zakres
        for (const row of list) {
          const d = String(row?.date || "");
          if (d >= from && d <= to) {
            const kwh = Number(row?.generation) || 0;
            days.push({ date: d, kwh: +kwh.toFixed(2) });
          }
        }
      } catch {
        // jeśli nie udało się pobrać całego miesiąca — zaznacz wszystkie daty tego miesiąca jako "failed"
        const y = Number(m.slice(0,4)); const mm0 = Number(m.slice(5,7)) - 1;
        const first = new Date(Date.UTC(y, mm0, 1));
        const last  = new Date(Date.UTC(y, mm0 + 1, 0));
        let cur = first;
        while (cur <= last) {
          const d = formatYMDUTC(cur);
          if (d >= from && d <= to) failedDates.push(d);
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
      }
    }

    // 2) posortuj dni i policz sumę
    days.sort((a, b) => a.date.localeCompare(b.date));
    const total_kwh = +days.reduce((a, x) => a + (Number(x.kwh) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      from, to,
      days,
      total_kwh,
      failedDates: Array.from(new Set(failedDates)).filter(d => d >= from && d <= to),
      months: Array.from(monthsBetweenInclusive(from, to)),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
