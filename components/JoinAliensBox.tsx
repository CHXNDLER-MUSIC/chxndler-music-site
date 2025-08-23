"use client";
import React, { useState } from "react";
import { track } from "@/lib/analytics";

/** Accepts any input (email and/or phone). Always “succeeds”; posts to Apps Script. */
export default function JoinAliensBox() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle"|"sending"|"ok">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    track("join_submit_attempt", { email_len: email.length, phone_len: phone.length });

    try {
      await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      setState("ok");
      setEmail(""); setPhone("");
      track("join_submit_ok");
    } catch {
      setState("ok"); // UX: still OK
      track("join_submit_fail_hide");
    }
  }

  return (
    <form onSubmit={onSubmit} className="hud-card h-full w-full flex flex-col gap-2">
      <div className="font-semibold text-sm tracking-wide">Join the ALIENS</div>
      <input
        type="text" value={email} onChange={(e)=>setEmail(e.target.value)}
        placeholder="Email (or leave blank)" className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none"
      />
      <input
        type="text" value={phone} onChange={(e)=>setPhone(e.target.value)}
        placeholder="Phone (optional)" className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none"
      />
      <button type="submit" disabled={state==="sending"} className="hud-btn disabled:opacity-50 mt-auto">Join</button>
      {state==="ok"  && <div className="text-emerald-300 text-xs">Thanks! You’re on the list.</div>}
    </form>
  );
}
