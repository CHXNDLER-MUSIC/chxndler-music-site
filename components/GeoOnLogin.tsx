"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function GeoOnLogin() {
  const handled = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN") return;
      if (!session?.user) return;
      if (handled.current) return;
      handled.current = true;

      try {
        // Check if the user already has location data
        const { data: profile } = await supabaseBrowser
          .from("profiles")
          .select("city, country")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.city || profile?.country) return;

        // Fetch geo data from Vercel headers
        const res = await fetch("/api/geo");
        if (!res.ok) return;
        const { city, country } = await res.json();

        if (!city && !country) return;

        await supabaseBrowser.rpc("update_profile_location", {
          p_city: city,
          p_country: country,
        });
      } catch {
        // Silently ignore — geo is best-effort
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
