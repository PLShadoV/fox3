import { ok, bad } from "../../../../lib/utils";

export async function GET() {
  const token = process.env.FOXESS_TOKEN;
  const sn = process.env.FOXESS_DEVICE_SN;
  try {
    if (!token || !sn) {
      // fallback mock
      return ok({ pvNowW: null, note: "Brak FOXESS_TOKEN/FOXESS_DEVICE_SN" });
    }
    // Minimal call example (FoxESS specifics vary; here we only show a shape + fallback)
    // You should replace with your verified FoxESS Cloud request.
    // For safety, we just return "pvNowW:null" and let frontend not crash.
    return ok({ pvNowW: null });
  } catch (e:any) {
    return bad(e.message);
  }
}
