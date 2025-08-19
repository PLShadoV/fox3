import crypto from "crypto";

const FOX_DOMAIN = process.env.FOXESS_DOMAIN || "https://www.foxesscloud.com";

type SepKind = "literal" | "crlf" | "lf";

function buildSignature(path: string, token: string, timestamp: number, kind: SepKind){
  const sep = kind === "literal" ? "\r\n" : (kind === "crlf" ? "
" : "
");
  const plaintext = path + sep + token + sep + String(timestamp);
  return crypto.createHash("md5").update(plaintext).digest("hex");
}

async function foxFetch(path: string, body:any){
  const token = process.env.FOXESS_TOKEN || "";
  if(!token) throw new Error("FOXESS_TOKEN is required");
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${FOX_DOMAIN}${path}`;
  const kinds: SepKind[] = ["literal","crlf","lf"];
  let lastErr:any=null;
  for(const k of kinds){
    try{
      const sign = buildSignature(path, token, timestamp, k);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "lang": "pl",
          "token": token,
          "t": String(timestamp),
          "sign": sign
        },
        body: JSON.stringify(body)
      });
      const j = await res.json().catch(()=>({}));
      if(j?.errno === 0 || j?.code === 0) return j;
      if(j?.errno === 40256 && k !== "lf") continue; // illegal signature -> try next
      lastErr = j;
    }catch(e:any){ lastErr = e; }
  }
  throw new Error(`FoxESS error: ${typeof lastErr==='object'?JSON.stringify(lastErr):String(lastErr)}`);
}

export async function foxRealtime(){
  const sn = process.env.FOXESS_DEVICE_SN || "";
  if(!sn) throw new Error("FOXESS_DEVICE_SN is required");
  // try op path first then c path
  const paths = ["/op/v1/device/real/query", "/c/v0/device/real/query"];
  const payload = { deviceCategory:"inverter", sn, variables:["pvPower","pv1Power","pv2Power","generationPower","feedinPower","acPower"] };
  for(const p of paths){
    try{ return await foxFetch(p, payload); }catch(e){/* try next */}
  }
  throw new Error("FoxESS realtime failed for all paths");
}

export async function foxHistoryDay(date: string){
  const sn = process.env.FOXESS_DEVICE_SN || "";
  if(!sn) throw new Error("FOXESS_DEVICE_SN is required");
  const paths = ["/op/v1/device/history/query", "/c/v0/device/history/query"];
  const candidates = [
    { dimension:"day", variables:["generation","feedin"] },
    { dimension:"DAY", variables:["generation","feedin"] },
  ];
  for(const p of paths){
    for(const v of candidates){
      try{
        const res = await foxFetch(p, { sn, ...v, queryDate: date });
        return res;
      }catch(e){ /* try next */ }
    }
  }
  throw new Error("FoxESS history failed for all variants");
}

// Helpers to normalize FoxESS responses into common shape
export function parseRealtime(raw:any){
  // Expect raw.datas array with variables
  const block = Array.isArray(raw?.result) ? raw.result[0] : raw?.result || raw?.data || raw;
  const datas = block?.datas || raw?.datas || [];
  let pv = null;
  const tryVars = ["pvPower","pv1Power","pv2Power","generationPower","acPower"];
  if(Array.isArray(datas)){
    for(const v of tryVars){
      const item = datas.find((d:any)=> (d.variable||'').toLowerCase() === v.toLowerCase());
      if(item && typeof item.value !== 'undefined'){
        const unit = (item.unit||'').toLowerCase();
        const n = Number(item.value);
        pv = unit==='kw' ? Math.round(n*1000) : Math.round(n);
        break;
      }
    }
  }
  return { pvNowW: pv, raw };
}

export function parseHistoryDay(raw:any){
  // Find 'generation' and 'feedin' arrays of length 24 with unit kWh
  const result = raw?.result || raw?.data || raw;
  let gen:any=null, exp:any=null;
  const datas = Array.isArray(result) ? result : result?.datas || result?.data || result;
  function pick(varName:string){
    if(Array.isArray(datas)){
      for(const d of datas){
        const v = (d.variable||d.name||'').toLowerCase();
        if(v.includes(varName)){
          return { variable: varName, unit: (d.unit||'kWh'), values: Array.isArray(d.values)?d.values.map((x:any)=>Number(x)||0):[] };
        }
      }
    }
    return null;
  }
  gen = pick("generation") || pick("eday") || pick("dayenergy") || pick("yield") || pick("production");
  exp = pick("feedin") || pick("gridexport") || pick("export");
  return { generation: gen, export: exp };
}
