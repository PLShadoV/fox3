'use client';
import React from 'react';

export default function ThemeToggle(){
  const [dark, setDark] = React.useState(true);
  React.useEffect(()=>{
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  },[dark]);
  return (
    <button className="chip" onClick={()=>setDark(d=>!d)}>
      {dark ? '🌙 Ciemny' : '☀️ Jasny'}
    </button>
  );
}
