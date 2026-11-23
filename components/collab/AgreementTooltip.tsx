"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";

type Point = { top: number; left: number; placement: "top" | "bottom" };
export default function AgreementTooltip({ label, text, className = "" }: { label: string; text: string; className?: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<Point | null>(null);
  function position() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(288, window.innerWidth - 24), height = popup.current?.offsetHeight || 88;
    const placement = rect.bottom + height + 12 > window.innerHeight && rect.top > height + 12 ? "top" : "bottom";
    setPoint({ placement, top: placement === "top" ? Math.max(12, rect.top - height - 8) : Math.min(window.innerHeight - height - 12, rect.bottom + 8), left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) });
  }
  function show() {
    if (timer.current) clearTimeout(timer.current);
    window.dispatchEvent(new CustomEvent("agreement-tooltip-open", { detail: id }));
    setOpen(true);
  }
  function deferClose() { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180); }
  useEffect(() => {
    const closeOther = (event: Event) => { if ((event as CustomEvent).detail !== id) setOpen(false); };
    const outside = (event: MouseEvent) => { const target = event.target as Node; if (!trigger.current?.contains(target) && !popup.current?.contains(target)) setOpen(false); };
    const keys = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("agreement-tooltip-open", closeOther);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", keys);
    return () => { window.removeEventListener("agreement-tooltip-open", closeOther); document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", keys); if (timer.current) clearTimeout(timer.current); };
  }, [id]);
  useEffect(() => { if (!open) return; position(); const update = () => position(); window.addEventListener("resize", update); window.addEventListener("scroll", update, true); return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); }; }, [open]);
  return <><button ref={trigger} type="button" aria-label={`${label} information`} aria-expanded={open} aria-describedby={open ? `tip-${id}` : undefined} onClick={show} onFocus={show} onMouseEnter={show} onMouseLeave={deferClose} className={`ml-1 inline-flex align-middle rounded-full text-[#FD52AF] outline-none focus-visible:ring-2 focus-visible:ring-[#FD52AF] ${className}`}><CircleHelp aria-hidden="true" className="h-3.5 w-3.5"/></button>{open && typeof document !== "undefined" && createPortal(<div ref={popup} id={`tip-${id}`} role="tooltip" onMouseEnter={() => { if (timer.current) clearTimeout(timer.current); }} onMouseLeave={deferClose} className="fixed z-[300] w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-white/10 bg-[#202025] p-3 text-[11px] leading-5 text-white/85 shadow-2xl" style={point ? { top: point.top, left: point.left } : { top: 12, left: 12 }}>{text}</div>, document.body)}</>;
}
