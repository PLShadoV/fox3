import { ok, bad } from "../../../../lib/utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0,10);
  const provider = process.env.RCE_PROVIDER_URL;
  try {
    if (provider) {
      const r = await fetch(`${provider}?date=${date}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Provider ${r.status}`);
      const data = await r.json();
      return ok({ date, rows: data.rows || [] });
    }
    // fallback: zeros for 24h
    const rows = Array.from({length:24}, (_,h)=>({ hour:h, rce_pln_mwh: 0 }));
    return ok({ date, rows });
  } catch (e:any) {
    return bad(e.message);
  }
}
