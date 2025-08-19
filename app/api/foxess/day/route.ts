import { ok, bad } from "../../../../lib/utils";

function diffSeries(arr: number[]) {
  // Turn cumulative into hourly; clamp negatives to 0
  const out = new Array(24).fill(0);
  for (let i=0;i<24;i++) {
    const cur = Number(arr[i]||0);
    const prev = i>0 ? Number(arr[i-1]||0) : 0;
    out[i] = Math.max(0, cur - prev);
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0,10);
  const token = process.env.FOXESS_TOKEN;
  const sn = process.env.FOXESS_DEVICE_SN;

  try {
    if (!token || !sn) {
      // graceful fallback: empty day
      return ok({
        date,
        unit: "kWh",
        generation: new Array(24).fill(0),
        export: new Array(24).fill(0)
      });
    }
    // Here you should implement your verified FoxESS call and map to 24 cumulative values.
    // For now, return shape with zeros to avoid 500s.
    return ok({
      date,
      unit: "kWh",
      generation: new Array(24).fill(0),
      export: new Array(24).fill(0)
    });
  } catch (e:any) {
    return bad(e.message);
  }
}
