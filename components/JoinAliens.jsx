"use client";

import React, { useState } from "react";

export default function JoinAliens() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      // TODO: replace with your real endpoint
      await new Promise((r) => setTimeout(r, 300));
      setEmail("");
      setPhone("");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full w-full flex-col gap-3">
      <label className="sr-only" htmlFor="join-email">Email</label>
      <input
        id="join-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-xl bg-black/35 backdrop-blur-md px-3 py-2 glow placeholder-white/60 outline-none"
      />

      <label className="sr-only" htmlFor="join-phone">Phone (optional)</label>
      <input
        id="join-phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        className="w-full rounded-xl bg-black/35 backdrop-blur-md px-3 py-2 glow placeholder-white/60 outline-none"
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 rounded-2xl bg-white/15 px-4 py-2 font-semibold tracking-wide backdrop-blur-md glow cockpit-glow hover:scale-[1.02] transition disabled:opacity-60"
      >
        {status === "loading" ? "Submitting..." : status === "ok" ? "Thanks!" : "SUBMIT"}
      </button>
    </form>
  );
}
