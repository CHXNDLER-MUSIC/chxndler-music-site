"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "../../lib/supabaseClient";

type ApiError = { error: string };

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const canSave = useMemo(() => !saving && (name.length > 0 || avatarUrl.length > 0), [saving, name, avatarUrl]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        if (res.status === 401) {
          router.push("/signin");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiError | null;
          throw new Error(body?.error || `Failed to load profile (${res.status})`);
        }
        const data = (await res.json()) as Profile;
        if (!mounted) return;
        setName(data.name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, avatar_url: avatarUrl }),
      });
      if (res.status === 401) {
        router.push("/signin");
        return;
      }
      const body = (await res.json().catch(() => null)) as Profile | ApiError | null;
      if (!res.ok) {
        throw new Error((body as ApiError | null)?.error || `Failed to save (${res.status})`);
      }
      setMessage("Profile saved");
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
      // auto-clear message after a moment
      setTimeout(() => setMessage(null), 2000);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <img 
          src="/elements/start.webp" 
          alt="Element Icon" 
          className="w-8 h-8 object-contain"
        />
        <h1 className="text-2xl font-semibold flex-1 text-center">Your Profile</h1>
        <div className="w-8 h-8"></div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading profile…</div>
      ) : (
        <form onSubmit={onSave} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">
              Avatar URL
            </label>
            <input
              id="avatar_url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
