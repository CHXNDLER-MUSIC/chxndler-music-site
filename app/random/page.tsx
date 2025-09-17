"use client";
import { useEffect, useState } from "react";

export default function RandomPage() {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRandom() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/random', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setValue(json?.value ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRandom(); }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Random Number (localhost)</h1>
        {loading ? (
          <div>Loading…</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          <div className="text-4xl font-mono" title="Fresh each request">
            {value}
          </div>
        )}
        <div>
          <button
            onClick={fetchRandom}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
          >
            New Random
          </button>
        </div>
        <p className="text-white/70 text-sm">API: GET /api/random</p>
      </div>
    </main>
  );
}

