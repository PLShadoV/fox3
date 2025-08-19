export function fmtHour(i:number){
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
}
