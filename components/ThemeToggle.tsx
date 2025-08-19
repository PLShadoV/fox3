'use client';

export default function ThemeToggle(){
  return (
    <button
      className="chip"
      onClick={() => {
        const el = document.documentElement;
        const dark = el.classList.toggle('dark');
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
      }}
      aria-label="Przełącz motyw"
    >
      🌓 Motyw
    </button>
  );
}
