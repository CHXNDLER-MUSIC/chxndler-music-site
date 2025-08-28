"use client";
import React from "react";

type Rect = { top:number; left:number; width:number; height:number };
type ResponsiveRect = Rect & {
  minWidth?: number;
  maxWidth?: number;
  orientation?: "portrait" | "landscape";
};

export function Slot({
  rect,
  rects,
  children,
  className = "",
  z = 30,
  debug = false,
}: {
  rect?: Rect;
  rects?: ResponsiveRect[];
  children: React.ReactNode;
  className?: string;
  z?: number;
  debug?: boolean;
}) {
  // Use stable SSR-safe defaults to avoid hydration mismatch
  const [vw, setVw] = React.useState<number>(1200);
  const [vh, setVh] = React.useState<number>(800);
  const lastW = React.useRef<number>(vw);

  React.useEffect(() => {
    const vv = (typeof window !== 'undefined' && (window as any).visualViewport) ? (window as any).visualViewport : null;
    const onWindow = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Update only if width changed (avoid iOS toolbar height jitter)
      if (Math.abs(w - lastW.current) >= 1) {
        lastW.current = w;
        setVw(w); setVh(h);
      }
    };
    const onVV = () => {
      const w = (window as any).visualViewport?.width ?? window.innerWidth;
      const h = (window as any).visualViewport?.height ?? window.innerHeight;
      if (Math.abs(w - lastW.current) >= 1) {
        lastW.current = w;
        setVw(w); setVh(h);
      }
    };
    window.addEventListener("resize", onWindow);
    if ((window as any).visualViewport) (window as any).visualViewport.addEventListener("resize", onVV);
    // Initialize to actual values once on mount
    onVV();
    return () => {
      window.removeEventListener("resize", onWindow);
      if ((window as any).visualViewport) (window as any).visualViewport.removeEventListener("resize", onVV);
    };
  }, []);

  let r: Rect | undefined = rect;
  if (rects && rects.length) {
    const isPortrait = vh >= vw;
    const oriented = rects.filter(rx => (
      (rx.minWidth === undefined || vw >= rx.minWidth) &&
      (rx.maxWidth === undefined || vw <= rx.maxWidth) &&
      (rx.orientation ? (rx.orientation === (isPortrait ? "portrait" : "landscape")) : true)
    ));
    const match = oriented[0];
    if (match) r = match;
    else r = rects[rects.length - 1];
  }
  if (!r) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    top: `${r.top}svh`,
    left: `${r.left}vw`,
    width: `${r.width}vw`,
    height: `${r.height}svh`,
    zIndex: z,
  };
  return (
    <div style={style} className={`${debug ? "debug-slot" : ""} ${className}`}>
      {debug ? (
        <div style={{ position:"absolute", top:2, left:2, fontSize:10, padding:"2px 4px", background:"rgba(0,0,0,.4)", border:"1px dashed rgba(255,255,255,.4)", borderRadius:4 }}>
          <div>vw:{vw.toFixed(0)} vh:{vh.toFixed(0)}</div>
          <div>{`top:${r.top}svh left:${r.left}vw w:${r.width}vw h:${r.height}svh`}</div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
