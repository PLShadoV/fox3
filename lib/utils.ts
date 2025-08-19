export function ymd(d: Date){ return d.toISOString().slice(0,10); }
export function addDays(dateStr: string, days:number){
  const d = new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+days); return ymd(d);
}
export function eachDay(from:string, to:string){
  const list:string[]=[]; let cur=from;
  while(cur<=to){ list.push(cur); cur = addDays(cur,1); }
  return list;
}
