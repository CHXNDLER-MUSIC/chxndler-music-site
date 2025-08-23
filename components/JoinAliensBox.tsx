"use client";
import React from "react";

/**
 * Simple email/phone capture box. Replace the form action with your Apps Script URL when ready.
 */
export default function JoinAliensBox() {
  return (
    <form
      method="POST"
      action="#"
      className="h-full w-full rounded-2xl bg-black/35 backdrop-blur-md p-4 glow cockpit-glow flex flex-col gap-2"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="font-semibold text-sm tracking-wide">Join the ALIENS</div>
      <input
        type="email"
        name="email"
        placeholder="Email"
        className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none"
        required
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone (optional)"
        className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        className="mt-auto rounded-lg px-3 py-2 bg-white/10 hover:bg-white/20 transition text-sm glow"
        aria-label="Join"
      >
        Join
      </button>
    </form>
  );
}
