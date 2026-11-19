"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const destinations = [
  { label: "HEARTVERSE", href: "/", logo: "/elements/logo.webp", alt: "CHXNDLER Heartverse logo" },
  { label: "COLLAB", href: "/collab", logo: "/elements/alien.webp", alt: "CHXNDLER alien logo" },
  { label: "CHXNDLER STUDIO", href: "/studio", logo: "/elements/chxndler-studio.png", alt: "CHXNDLER Studio logo" },
] as const;

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
    <button type="button" aria-label="Open CHXNDLER navigation" title="CHXNDLER navigation" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)} className="flex h-12 w-14 items-center justify-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fd52af]">
      <Image src="/icons/chxndler-192.webp" alt="" width={40} height={40} className="object-contain" priority />
    </button>
    {open && <div role="menu" aria-label="CHXNDLER destinations" className="absolute left-1/2 top-full z-40 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#141419] p-2 shadow-2xl shadow-black/50">
      {destinations.map(item => <Link key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/75 transition hover:bg-white/[.06] hover:text-white">
        <span className="grid h-11 w-11 shrink-0 place-items-center p-1"><Image src={item.logo} alt={item.alt} width={40} height={40} className="h-9 w-9 object-contain" /></span>
        <span>{item.label}</span>
        <span className="ml-auto text-xs text-white/30" aria-hidden="true">↗</span>
      </Link>)}
    </div>}
  </div>;
}
