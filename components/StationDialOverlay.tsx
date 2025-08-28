"use client";
import React, { useMemo, useRef, useState } from "react";

export default function StationDialOverlay({
  count,
  index,
  onChange,
  pos,
}: {
  count: number;
  index: number;
  onChange: (idx:number)=>void;
  pos: { rightVw?: number; bottomVh?: number; topVh?: number; leftVw?: number; sizePx?: number; tilt?: string };
}) {
  const STEP = useMemo(() => 360 / Math.max(count, 1), [count]);
  const angle = (index * STEP) % 360;
  const dialRef = useRef<HTMLDivElement|null>(null);
  const [dragging, setDragging] = useState(false);

  function normalize(a:number){ a = a % 360; if (a < 0) a += 360; return a; }
  function degreesFromCenter(x:number, y:number, cx:number, cy:number){
    const rad = Math.atan2(y - cy, x - cx);
    const degFromRightCCW = (rad * 180) / Math.PI;
    const degFromUpCW = (450 - degFromRightCCW) % 360;
    return normalize(degFromUpCW);
  }

  function onWheel(e: React.WheelEvent){ if (count <= 0) return; onChange((index + (e.deltaY > 0 ? 1 : -1) + count) % count); }
  function onPointerDown(e: React.PointerEvent){
    setDragging(true);
    try { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); } catch {}
  }
  function onPointerMove(e: React.PointerEvent){
    if (!(e.buttons & 1)) return;
    const el = dialRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const deg = degreesFromCenter(e.clientX, e.clientY, cx, cy);
    if (count > 0) {
      const snappedIndex = Math.round(deg / STEP) % count;
      if (snappedIndex !== index) onChange(snappedIndex);
    }
  }
  function onPointerUp(e: React.PointerEvent){ setDragging(false); try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {} }

  const size = pos.sizePx ?? 80;
  const stylePos: React.CSSProperties = {
    position: "fixed",
    right: pos.rightVw !== undefined ? `${pos.rightVw}vw` : undefined,
    left:  pos.leftVw  !== undefined ? `${pos.leftVw}vw`  : undefined,
    bottom:pos.bottomVh!== undefined ? `${pos.bottomVh}vh`: undefined,
    top:   pos.topVh   !== undefined ? `${pos.topVh}vh`   : undefined,
    width: size, height: size, zIndex: 80,
    transform: pos.tilt ?? "perspective(1100px) rotateX(8deg)",
    pointerEvents: "auto",
  };

  return (
    <div style={stylePos} className="dial-wrap" aria-label="Station dial">
      <div
        ref={dialRef}
        className={`dial ${dragging ? 'drag' : ''}`}
        title="Channel changer (drag, scroll, swipe, ←/→, 1-9)"
        onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      >
        <div className="dial-pointer" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} />
      </div>
      <style jsx>{`
        .dial{ width:100%; height:100%; border-radius:9999px; position:relative; cursor:grab;
          background: radial-gradient(60% 60% at 50% 45%, rgba(255,240,140,.65), rgba(255,220,60,.28) 55%, rgba(255,200,0,.12) 70%, rgba(10,10,10,0) 85%), url('/knobs/channel-knob.svg') center/cover no-repeat;
          box-shadow: 
            0 12px 34px rgba(0,0,0,.65),
            0 0 26px rgba(255,230,90,.65),
            0 0 56px rgba(255,230,90,.45),
            0 0 88px rgba(255,230,90,.35),
            inset 0 16px 28px rgba(255,255,255,.08),
            inset 0 -14px 20px rgba(0,0,0,.72);
        }
        .dial::after{
          content: ""; position:absolute; inset:-18%; border-radius:9999px; pointer-events:none;
          background: radial-gradient(60% 60% at 50% 45%, rgba(255,232,70,.35), rgba(255,232,70,0) 70%);
          filter: blur(10px);
        }
        .dial:hover{ box-shadow: 
            0 14px 36px rgba(0,0,0,.7),
            0 0 34px rgba(255,240,120,.8),
            0 0 72px rgba(255,240,120,.55),
            0 0 108px rgba(255,240,120,.45),
            inset 0 18px 30px rgba(255,255,255,.10),
            inset 0 -16px 22px rgba(0,0,0,.75);
        }
        .dial.drag{ cursor:grabbing; }
        .dial-pointer{ position:absolute; left:50%; top:6px; width:6px; height:22px; border-radius:3px; transform-origin:50% 28px;
          background: linear-gradient(180deg, #fff2a0, #ffd245);
          box-shadow: 0 0 12px rgba(255,230,90,.9), 0 0 22px rgba(255,230,90,.6), 0 0 40px rgba(255,230,90,.45);
        }
      `}</style>
    </div>
  );
}
