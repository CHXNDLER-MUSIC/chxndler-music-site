"use client";

import React, { useState } from "react";

export default function JoinAliens() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      // TODO: replace with your real endpoint if you have one
      // await fetch("/api/join", { method: "POST", body: JSON.stringify({ email, phone }) });
      await new Promise((r) => setTimeout(r, 400));
      setEmail("");
      setPhone("");
      setStatus("ok");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full w-full flex-col gap-3" aria-label="Join the Aliens">
      {/* Email */}
      <label className="sr-only" htmlFor="join-email">Email</label>
      <div className="flex items-center gap-2 rounded-xl bg-black/35 backdrop-blur-md px-3 py-2 glow">
        <svg aria-hidden="true" className="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
        </svg>
        <input
          id="join-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-transparent outline-none placeholder-white/60"
        />
      </div>

      {/* Phone (optional) */}
      <label className="sr-only" htmlFor="join-phone">Phone (optional)</label>
      <div className="flex items-center gap-2 rounded-xl bg-black/35 backdrop-blur-md px-3 py-2 glow">
        <svg aria-hidden="true" className="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.1-.2c1.2.4 2.5.7 3.8.7a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C11.6 21 3 12.4 3 2a1 1 0 0 1 1-1h3.3a1 1 0 0 1 1 1c0 1.3.2 2.6.7 3.8a1 1 0 0 1-.2 1.1l-2.2 2.2Z" />
        </svg>
        <input
          id="join-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="w-full bg-transparent outline-none placeholder-white/60"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 rounded-2xl bg-white/15 px-4 py-2 text-center font-semibold tracking-wide backdrop-blur-md glow cockpit-glow hover:scale-[1.02] transition disabled:opacity-60"
      >
        {status === "loading" ? "Submitting…" : status === "ok" ? "Thanks!" : "SUBMIT"}
      </button>
    </form>
  );
}
