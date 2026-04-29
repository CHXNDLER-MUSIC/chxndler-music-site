"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type AuthStatus =
  | { state: "idle" }
  | { state: "processing"; message?: string }
  | { state: "success" }
  | { state: "error"; message: string };

function parseHashParams(hash: string) {
  // hash like: #access_token=...&refresh_token=...&type=recovery
  const out = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const access_token = out.get("access_token");
  const refresh_token = out.get("refresh_token");
  return { access_token, refresh_token };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthStatus>({ state: "idle" });

  const nextPath = useMemo(() => {
    // Prefer explicit next param; fallback to dashboard
    return searchParams.get("next") || "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setStatus({ state: "processing", message: "Finalizing sign-in..." });

        // 1) If the URL contains hash tokens (implicit), consume them purely on client
        const { access_token, refresh_token } = parseHashParams(window.location.hash || "");
        if (access_token && refresh_token) {
          const { data, error } = await supabaseBrowser.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
          if (!data?.session) throw new Error("No session returned after setSession");
          // Clean the URL to remove the fragment
          if (!cancelled) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
          if (!cancelled) setStatus({ state: "success" });
          if (!cancelled) {
            try { sessionStorage.setItem('chx_login_warp', '1'); } catch {}
            router.replace(nextPath || "/");
          }
          return;
        }

        // 2) Otherwise, handle the PKCE code flow from query string
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!data?.session) throw new Error("No session returned after code exchange");
          if (!cancelled) setStatus({ state: "success" });
          if (!cancelled) {
            try { sessionStorage.setItem('chx_login_warp', '1'); } catch {}
            router.replace(nextPath || "/");
          }
          return;
        }

        // 3) Nothing to process
        setStatus({ state: "error", message: "Missing auth parameters in URL." });
      } catch (e: any) {
        const msg = e?.message || "Authentication failed";
        setStatus({ state: "error", message: msg });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, nextPath]);

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="relative rounded-2xl p-6 backdrop-blur-md border border-white/20 bg-white/5">
        <h1 className="text-xl font-semibold text-white mb-2">Signing you in…</h1>
        {status.state === "processing" && (
          <p className="text-white/80 text-sm">{status.message || "Please wait a moment."}</p>
        )}
        {status.state === "success" && (
          <p className="text-green-300 text-sm">Success! Redirecting…</p>
        )}
        {status.state === "error" && (
          <div className="text-red-300 text-sm">
            <p className="mb-2">{status.message}</p>
            <p>
              You can return to <a href="/login" className="underline">/login</a> and try again.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
