'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle(){
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  useEffect(()=>{
    const saved = (typeof window!=='undefined' && window.localStorage.getItem('theme')) as 'dark'|'light'|null;
    if(saved){ setTheme(saved); document.documentElement.setAttribute('data-theme', saved); }
  },[]);
  function toggle(){
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if(typeof window!=='undefined'){
      window.localStorage.setItem('theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
  }
  return <button onClick={toggle} className={'toggle '+(theme==='light'?'active':'')}>{theme==='dark'?'Ciemny':'Jasny'}</button>
}
