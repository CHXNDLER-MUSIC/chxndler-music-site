"use client";

import React from "react";
import { scrollToSection } from "./scrollTo";
import { STUDIO_BG_ALT } from "./identity";

const LINKS: Array<{ id: string; label: string }> = [
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "start-a-project", label: "Start a Project" },
];

export default function StudioFooter() {
  const year = new Date().getFullYear();

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <footer
      className="border-t border-white/10 px-[6vw] sm:px-[8vw] py-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-[1.25rem] text-center sm:text-left"
      style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}
    >
      <p className="text-[0.8125rem] font-bold tracking-[0.2em] uppercase text-white/70">CHXNDLER STUDIO</p>

      <nav aria-label="Studio sections" className="flex flex-wrap items-center justify-center gap-x-[1.5rem] gap-y-[0.5rem]">
        {LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={go(link.id)}
            className="text-[0.75rem] font-semibold tracking-[0.1em] uppercase text-white/45 hover:text-white transition-colors duration-200"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <p className="text-[0.6875rem] text-white/30">© {year} CHXNDLER STUDIO</p>
    </footer>
  );
}
