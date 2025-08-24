// /components/JoinAliens.jsx
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
      // If you have a real endpoint, replace this with a fetch to it:
      // await fetch(process.env.NEXT_PUBLIC_JOIN_ENDPOINT, { method: "POST", body: JSON.stringify({ email, phone }) });

      // Simulate ok for now so the UI works without errors
      await new Promise((r) => setTimeout(r, 400));
      setStatus("ok");
      setEmail("");
      setPhone("");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full w-full flex-col gap-3"
      aria-label="Join the Aliens"
    >
      {/* Email field */}
      <label className="sr-only" htmlFor="join-email">Email</label>
      <div className="flex items-center gap-2 rounded-xl bg-black/35 backdrop-blur-md px-3 py-2 glow">
        {/* inline mail icon (no external library) */}
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

      {/* Phone field (optional) */}
      <label className="sr-only" htmlFor="join-phone">Phone (optional)</label>
      <div className="flex items-center gap-2 rounded-xl bg-black/35 backdrop-blur-md px-3 py-2 glow">
        {/* inline phone icon */}
        <svg aria-hidden="true" className="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="currentColor"
