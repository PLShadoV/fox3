'use client';
export default function StatTile({ title, value, subtitle }: {title:string; value:string; subtitle?:string}){
  return (
    <div className="glass stat">
      <div className="sub">{title}</div>
      <div className="value">{value}</div>
      {!!subtitle && <div className="hint">{subtitle}</div>}
    </div>
  )
}
