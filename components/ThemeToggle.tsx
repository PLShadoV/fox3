'use client';
export default function ThemeToggle(){
  function toggle(){
    const el = document.documentElement;
    const dark = el.classList.toggle('dark');
    try{ localStorage.setItem('theme', dark ? 'dark' : 'light'); }catch{}
  }
  return <button className="chip" onClick={toggle}>Tryb: jasny/ciemny</button>;
}
