"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      await fetch('/auth/signout', { method: 'GET', cache: 'no-store' });
    } catch {}
    finally {
      // Redirect regardless of request outcome
      window.location.href = '/';
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-md bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-medium text-gray-800 border border-gray-200 shadow-sm hover:bg-white disabled:opacity-60"
      aria-label="Sign out"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

