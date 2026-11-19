"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const destinations = [
  { label: "HEARTVERSE", href: "/", color: "#fd52af", icon: "heart" },
  { label: "COLLAB", href: "/collab", color: "#59c9ff", icon: "people" },
  { label: "CHXNDLER STUDIO", href: "/studio", color: "#ffc857", icon: "studio" },
] as const;

function DestinationIcon({ name }: { name: (typeof destinations)[number]["icon"] }) {
  if (name === "heart") return <svg className="destination-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>;
  if (name === "people") return <svg className="destination-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>;
  return <svg className="destination-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"/><circle cx="19" cy="6" r="1"/></svg>;
}

export default function BrandNavigation() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <div className="relative" ref={root}>
    <button type="button" aria-label="Open CHXNDLER navigation" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-left transition hover:border-[#fd52af]/40 hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fd52af]">
      <Image src="/icons/chxndler-192.webp" alt="CHXNDLER" width={34} height={34} className="rounded-lg" priority />
      <span className="text-xs font-black tracking-[.2em] text-white">CHXNDLER</span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className={`h-3 w-3 text-white/55 transition-transform ${open ? "rotate-180" : ""}`} fill="none"><path d="m3 6 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    {open && <div role="menu" aria-label="CHXNDLER destinations" className="absolute left-0 top-full z-40 mt-2 w-64 rounded-2xl border border-white/10 bg-[#141419] p-2 shadow-2xl shadow-black/50">
      <p className="px-3 pb-2 pt-1 text-[.6rem] font-black tracking-[.22em] text-white/35">YOUR WORLDS</p>
      {destinations.map(item => <Link key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/75 transition hover:bg-white/[.06] hover:text-white">
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: item.color, background: `${item.color}16` }}><DestinationIcon name={item.icon} /></span>
        <span>{item.label}</span>
        <span className="ml-auto text-xs text-white/30" aria-hidden="true">↗</span>
      </Link>)}
    </div>}
    <style jsx>{`.destination-icon{width:1.1rem;height:1.1rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}`}</style>
  </div>;
}
