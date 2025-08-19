// app/api/range/compute/route.ts
import { NextRequest, NextResponse } from "next/server";

type Mode = "rce" | "rcem";

function isIsoDate(s?: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function baseUrl(req: NextRequest){
  // działa poprawnie w Vercel/Next: tworzy absolutne URL-e do własnego API
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fromQ = url.searchParams.get("from");
    const toQ   = url.searchParams.get("to");
    const modeQ = (url.searchParams.get("mode") || "rcem") as Mode; // domyślnie RCEm
    const ymQ   = url.searchParams.get("ym"); // opcjonalne YYYY-MM; jeżeli brak -> bierzemy z 'from'

    if (!isIsoDate(fromQ) || !isIsoDate(toQ)) {
      return NextResponse.json({ ok:false, error: "Parametry 'from' i 'to' muszą być w formacie YYYY-MM-DD" }, { status: 200 });
    }
    const from = new Date(fromQ + "T00:00:00Z");
    const to   = new Date(toQ   + "T00:00:00Z");
    if (!(from.getTime() <= to.getTime())) {
      return NextResponse.json({ ok:false, error: "'from' musi być ≤ 'to'" }, { status: 200 });
    }

    const base = baseUrl(req);

    // 1) Zbierz dzienne GENERATION dla zakresu
    let sumKWh = 0;
    const rows: Array<{date:string;kwh:number;revenue_pln:number}> = [];

    for (let cur = new Date(from); cur.getTime() <= to.getTime(); cur = addDays(cur, 1)) {
      const date = toISO(cur);
      const r = await fetch(`${base}/api/foxess/summary/day?date=${date}`, { cache: "no-store" });
      const j = await r.json();

      if (!j?.ok) {
        return NextResponse.json({ ok:false, error: `Brak danych produkcji dla ${date}` }, { status: 200 });
      }
      const kwh: number = Number(j?.today?.generation?.total ?? 0);
      rows.push({ date, kwh: +kwh.toFixed(3), revenue_pln: 0 });
      sumKWh += kwh;
    }

    // 2) Tryby liczenia
    if (modeQ === "rcem") {
      // 2a) Pobierz tabelę RCEm
      const rcemRes = await fetch(`${base}/api/rcem`, { next: { revalidate: 3600 } });
      const rcemJson = await rcemRes.json();
      if (!rcemJson?.ok || !Array.isArray(rcemJson.rows)) {
        return NextResponse.json({ ok:false, error: "RCEm endpoint zwrócił błąd" }, { status: 200 });
      }
      // rows: { year, monthIndex (0-11), value }
      const priceMap: Record<string, number> = {};
      for (const it of rcemJson.rows) {
        const ym = `${it.year}-${String((it.monthIndex as number)+1).padStart(2,'0')}`; // YYYY-MM
        if (typeof it.value === 'number') priceMap[ym] = it.value;
      }

      const chosenYM = ymQ && /^\d{4}-\d{2}$/.test(ymQ) ? ymQ : fromQ.slice(0,7);
      const price = priceMap[chosenYM];
      if (typeof price !== 'number' || Number.isNaN(price)) {
        return NextResponse.json({ ok:false, error: `Brak ceny RCEm dla ${chosenYM}` }, { status: 200 });
      }

      const priceUsed = Math.max(price, 0); // ujemne traktujemy jako 0 (zgodnie z wcześniejszym założeniem)
      const revenue = +(sumKWh * priceUsed / 1000).toFixed(2);

      // wiersze dzienne bez rozbijania RCEm – tylko sumarycznie (revenue=0 per day)
      return NextResponse.json({
        ok: true,
        mode: modeQ,
        from: fromQ,
        to: toQ,
        ym: chosenYM,
        sum: { kwh: +sumKWh.toFixed(2), revenue_pln: revenue, rcem_price_pln_mwh: price },
        rows
      }, { status: 200 });

    } else {
      // Tryb RCE – bez zmian merytorycznych (przykładowe połączenie godzin RCE z produkcją),
      // zostawiamy Twoją dotychczasową logikę. Jeśli chcesz, mogę tu scalić z aktualnym /api/rce.
      return NextResponse.json({
        ok: true,
        mode: modeQ,
        from: fromQ,
        to: toQ,
        // minimalny zwrot, aby UI działało, doprecyzujemy jeśli będziesz używać trybu RCE:
        sum: { kwh: +sumKWh.toFixed(2), revenue_pln: 0 },
        rows
      }, { status: 200 });
    }
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 200 });
  }
}
