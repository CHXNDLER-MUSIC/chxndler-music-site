"use client";
import React from "react";

export default function CompositeTool() {
  const [bg, setBg] = React.useState("/cockpit/cockpit.png");
  const [overlay, setOverlay] = React.useState("/generated/hud-ocean-girl-1920x1080.png");
  const [w, setW] = React.useState(1920);
  const [h, setH] = React.useState(1080);
  const canvasRef = React.useRef(null);

  function draw() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const ib = new Image(); const io = new Image();
    ib.crossOrigin = "anonymous"; io.crossOrigin = "anonymous";
    let loaded = 0;
    const tryDraw = () => {
      loaded += 1;
      if (loaded < 2) return;
      c.width = w; c.height = h;
      ctx.clearRect(0,0,w,h);
      // Fit background to canvas maintaining aspect
      ctx.drawImage(ib, 0, 0, w, h);
      // Overlay is assumed to be same aspect; draw with alpha
      ctx.drawImage(io, 0, 0, w, h);
    };
    ib.onload = tryDraw; io.onload = tryDraw;
    ib.src = bg; io.src = overlay;
  }

  React.useEffect(() => { draw(); /* eslint-disable-next-line */ }, [bg, overlay, w, h]);

  function download() {
    const c = canvasRef.current; if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "cockpit-hud-composite.png";
    a.click();
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <h1 className="text-lg mb-3">Composite Cockpit + HUD Overlay</h1>
      <div className="flex gap-4 flex-wrap items-end mb-3">
        <label className="block">Background URL
          <input className="block bg-zinc-900 border border-white/20 rounded px-2 py-1 w-[420px]" value={bg} onChange={e=>setBg(e.target.value)} />
        </label>
        <label className="block">Overlay URL
          <input className="block bg-zinc-900 border border-white/20 rounded px-2 py-1 w-[420px]" value={overlay} onChange={e=>setOverlay(e.target.value)} />
        </label>
        <label className="block">Width
          <input type="number" className="block bg-zinc-900 border border-white/20 rounded px-2 py-1 w-[120px]" value={w} onChange={e=>setW(Number(e.target.value)||1920)} />
        </label>
        <label className="block">Height
          <input type="number" className="block bg-zinc-900 border border-white/20 rounded px-2 py-1 w-[120px]" value={h} onChange={e=>setH(Number(e.target.value)||1080)} />
        </label>
        <button onClick={draw} className="rounded px-3 py-2 bg-white/10 border border-white/20">Redraw</button>
        <button onClick={download} className="rounded px-3 py-2 bg-white/10 border border-white/20">Download PNG</button>
      </div>
      <div className="overflow-auto">
        <canvas ref={canvasRef} style={{ maxWidth: "100%", border: "1px solid rgba(255,255,255,.2)", background: "#000" }} />
      </div>
      <p className="opacity-70 text-sm mt-3">Tip: Use a transparent PNG overlay generated via <code>npm run gen:hud</code>. For 4K, set size to 3840×2160 and match canvas width/height.</p>
    </main>
  );
}

