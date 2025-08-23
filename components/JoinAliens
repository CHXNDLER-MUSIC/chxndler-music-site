"use client";

import { useState } from "react";
import { Send } from "lucide-react";

/**
 * JoinAliens
 * - Posts { email, phone } as JSON to your Google Apps Script Web App
 * - Uses NEXT_PUBLIC_SHEET_URL from env
 * - Permissive phone input (type="text") to avoid pattern errors
 * - Small UX niceties: loading state, inline errors, success reset
 */

export default function JoinAliens({
  className = "",
  card = true,           // set false if you only want the bare form (no glass card)
  compact = false,       // set true for a tighter mobile-friendly card
}) {
  const SHEET_URL = process.env.NEXT_PUBLIC_SHEET_URL; // must end with /exec
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");            // "", "loading", "ok", "error"
  const [msg, setMsg] = useState("");                  // human message

  const disabled = status === "loading";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!SHEET_URL) {
      setStatus("error");
      setMsg("Missing NEXT_PUBLIC_SHEET_URL.");
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("error");
      setMsg("Please enter a valid email.");
      return;
    }

    setStatus("loading");
    setMsg("Beaming to the mothership…");

    // Apps Script expects JSON; your script should return { result: "success" }
    try {
      const res = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });

      // Handle non-2xx
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Try to parse JSON; tolerate plain text "success" too.
      let data = null;
      try { data = await res.json(); } catch { /* ignore */ }

      if (data?.result === "success" || /success/i.test(String(data ?? ""))) {
        setStatus("ok");
        setMsg("Thanks, you’re in! 🚀");
        // optional: clear fields after a short beat
        setTimeout(() => {
          setEmail("");
          setPhone("");
          setStatus("");
          setMsg("");
        }, 1800);
      } else {
        throw new Error(
          typeof data === "string" ? data : "Unexpected response."
        );
      }
    } catch (err) {
      setStatus("error");
      setMsg(err?.message || "Something went wrong. Try again.");
    }
  }

  const Card = ({ children }) => (
    <div
      className={`rounded-2xl border border-white/12 bg-white/7 backdrop-blur-md text-white ${compact ? "p-3" : "p-4"} shadow-[0_0_40px_rgba(56,182,255,.18),inset_0_0_40px_rgba(252,84,175,.15)] ${className}`}
      style={{
        boxShadow:
          "0 0 40px rgba(56,182,255,.18), inset 0 0 40px rgba(252,84,175,.15)",
      }}
    >
      {children}
    </div>
  );

  const Form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wider opacity-80">
        Join the Aliens
      </div>

      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={disabled}
        required
        className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40 border border-white/10 focus:border-white/25"
      />

      {/* permissive input to avoid “expected pattern” issues */}
      <input
        type="text"
        placeholder="phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={disabled}
        className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40 border border-white/10 focus:border-white/25"
      />

      <button
        type="submit"
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-black transition
          ${disabled ? "bg-white/60" : "bg-white/90 hover:bg-white"}`}
      >
        <Send size={16} />
        {status === "loading" ? "Sending…" : "Join"}
      </button>

      {msg && (
        <div
          className={`text-xs ${
            status === "error" ? "text-red-300" : "text-white/80"
          }`}
        >
          {msg}
        </div>
      )}

      {/* tiny footer for debugging */}
      {!SHEET_URL && (
        <div className="mt-1 text-[10px] text-red-300">
          Env var NEXT_PUBLIC_SHEET_URL is missing.
        </div>
      )}
    </form>
  );

  return card ? <Card>{Form}</Card> : Form;
}
