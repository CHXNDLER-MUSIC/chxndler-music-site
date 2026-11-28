"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const options = [
  { value: "chxndler_session", label: "Request to record with CHXNDLER", accent: true },
  { value: "independent", label: "Recording independently", accent: false },
] as const;

export default function RecordingArrangementSelect({ id, name, value, onChange, disabled = false, className }: { id: string; name?: string; value: string; onChange: (value: string) => void; disabled?: boolean; className: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex(option => option.value === value);

  useEffect(() => {
    setOpen(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, selectedIndex]);

  function select(optionValue: string) {
    setOpen(false);
    onChange(optionValue);
    triggerRef.current?.focus();
  }

  function moveFocus(index: number, delta: number) {
    optionRefs.current[(index + delta + options.length) % options.length]?.focus();
  }

  const selected = options.find(option => option.value === value);
  return <div ref={rootRef} className="relative">
    {name && <input type="hidden" name={name} value={value}/>}
    <button ref={triggerRef} id={id} type="button" role="combobox" aria-label="Recording arrangement" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-required="true" disabled={disabled} onClick={() => setOpen(current => !current)} onKeyDown={event => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        if (!open) setOpen(true);
      }
    }} className={`${className} flex items-center justify-between gap-3 text-left disabled:opacity-50`}>
      <span className={value ? "text-white" : "text-white/45"}>{selected?.accent ? <>Request to record with <span className="text-[#FD52AF]">CHXNDLER</span></> : selected?.label || (value === "other" ? "Previously saved arrangement" : "Select agreed arrangement")}</span>
      <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-white/65 transition-transform ${open ? "rotate-180" : ""}`}/>
    </button>
    {open && <div id={`${id}-options`} role="listbox" aria-label="Recording arrangement options" className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[160] overflow-hidden rounded-xl border border-white/15 bg-black py-1 shadow-[0_16px_42px_rgba(0,0,0,.75)]">
      {options.map((option, index) => <button key={option.value} ref={element => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={value === option.value} onClick={() => select(option.value)} onKeyDown={event => {
        if (event.key === "ArrowDown") { event.preventDefault(); moveFocus(index, 1); }
        if (event.key === "ArrowUp") { event.preventDefault(); moveFocus(index, -1); }
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
      }} className="flex w-full items-center px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/[.08] focus-visible:bg-white/[.08] focus-visible:outline-none">
        <span className="w-5 text-[#FD52AF]">{value === option.value ? "✓" : ""}</span>{option.accent ? <>Request to record with <span className="ml-1 text-[#FD52AF]">CHXNDLER</span></> : option.label}
      </button>)}
    </div>}
  </div>;
}
