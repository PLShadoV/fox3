export const metadata = { title: "FoxESS × RCE Dashboard" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            try{
              var m = localStorage.getItem('theme');
              if(!m){ document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark'); }
              else if(m==='dark'){ document.documentElement.classList.add('dark'); }
            }catch(e){ document.documentElement.classList.add('dark'); }
          })();
        `}} />
      </head>
      <body>
        <style jsx global>{`
          :root {
            --bg: #0b1220;
            --panel: rgba(255,255,255,0.06);
            --panel-strong: rgba(255,255,255,0.12);
            --border: rgba(255,255,255,0.12);
            --text: #e8f0ff;
            --muted: #a9b7d0;
            --accent: #6aa9ff;
            --accent-2: #3ad0ff;
            --good: #4ade80;
            --warn: #fbbf24;
            --bad: #f87171;
          }
          html:not(.dark) {
            --bg: #f5f7fb;
            --panel: rgba(16,30,60,0.06);
            --panel-strong: rgba(16,30,60,0.12);
            --border: rgba(0,0,0,0.08);
            --text: #121a2a;
            --muted: #47556f;
            --accent: #1166ff;
            --accent-2: #0cb4da;
          }
          * { box-sizing: border-box; }
          body { margin: 0; background: radial-gradient(1200px 800px at 80% -10%, rgba(106,169,255,0.12), transparent), var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
          a { color: var(--accent); text-decoration: none; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .hstack { display: flex; gap: 8px; align-items: center; }
          .spacer { flex: 1; }
          .glass { background: linear-gradient(180deg, var(--panel), rgba(255,255,255,0.02)); border: 1px solid var(--border); border-radius: 16px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
          .chip { padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--panel); color: var(--text); cursor: pointer; transition: 160ms;
                  font-weight: 600; }
          .chip.active { background: linear-gradient(180deg, rgba(106,169,255,0.22), rgba(61,106,255,0.18)); border-color: rgba(106,169,255,0.4); }
          .chip.link:hover { filter: brightness(1.2); }
          .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; background: var(--panel); padding: 2px 6px; border-radius: 6px; border: 1px solid var(--border); }
          .section-title { font-weight: 800; font-size: 18px; color: var(--muted); letter-spacing: .3px; }
          .grid-tiles { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
          @media (max-width: 900px){ .grid-tiles { grid-template-columns: 1fr; } }
          .tile { padding: 18px 20px; display: grid; grid-template-rows: auto auto; gap: 8px; }
          .tile .title { font-size: 14px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
          .tile .value { font-size: 30px; font-weight: 900; letter-spacing: .5px; }
          .tile .sub { font-size: 12px; color: var(--muted); }
          table.table { width: 100%; border-collapse: collapse; }
          table.table th, table.table td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
          table.table thead th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
          table.table tbody tr:hover { background: rgba(255,255,255,0.035); }
          input[type="date"], select { background: var(--panel); color: var(--text); border: 1px solid var(--border); padding: 8px 10px; border-radius: 10px; }
          button.primary { background: linear-gradient(180deg, var(--accent), var(--accent-2)); color: white; border: none; padding: 10px 14px; border-radius: 12px; font-weight: 800; cursor: pointer; }
          .error { border:1px solid var(--bad); color: var(--bad); padding: 10px 12px; border-radius: 12px; background: rgba(248,113,113,0.08); }
          .notice { color: var(--warn); }
        `}/>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
