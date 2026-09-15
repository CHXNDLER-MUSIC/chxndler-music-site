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
      className="border-t border-white/10 px-[6vw] sm:px-[8vw] py-[3rem] sm:py-[3.5rem]"
      style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}
    >
      <div className="max-w-[75rem] mx-auto flex flex-col sm:flex-row items-center justify-center gap-[1.25rem] sm:gap-[2.5rem] text-center">
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
      </div>
    </footer>
  );
}
