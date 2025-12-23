"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/app/providers/AuthProvider";

export type ElementOfDay = "heart" | "water" | "lightning" | "darkness" | null;

interface ClaimRPCResponse {
  ok?: boolean;
  already_claimed?: boolean;
  day?: string;
  element?: string;
  reward_key?: string | null;
  intention_of_day?: string | null;
}

export interface ElementOfDayClaimState {
  loading: boolean;
  element: ElementOfDay;
  rewardKey: string | null;
  intention: string | null;
  relicLabel: string | null;
  relicImageUrl: string | null;
  isClaimed: boolean;
  error: string | null;
  claim: () => Promise<ClaimRPCResponse | null>;
  refetch: () => Promise<void>;
}

function normalizeElement(s: string | null | undefined): ElementOfDay {
  const v = String(s || "").toLowerCase();
  if (["heart", "water", "lightning", "darkness"].includes(v)) return v as ElementOfDay;
  return null;
}

export function useElementOfDayClaim(): ElementOfDayClaimState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [element, setElement] = useState<ElementOfDay>(null);
  const [rewardKey, setRewardKey] = useState<string | null>(null);
  const [intention, setIntention] = useState<string | null>(null);
  const [relicLabel, setRelicLabel] = useState<string | null>(null);
  const [relicImageUrl, setRelicImageUrl] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store the server date to ensure consistency
  const [serverDate, setServerDate] = useState<string | null>(null);

  // Key based on user and server date (if available)
  const todayKey = useMemo(() => `${user?.id || "anon"}:${serverDate || "init"}`, [user?.id, serverDate]);
  const lastFetchRef = useRef<string | null>(null);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch today's element from server API (uses server time in America/New_York)
      const res = await fetch("/api/element-of-day");
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();

      if (data.error) {
        console.warn("useElementOfDayClaim: API error:", data.error);
        setElement(null);
        setRewardKey(null);
        setIntention(null);
        setRelicLabel(null);
        setRelicImageUrl(null);
        setServerDate(null);
      } else {
        const normalized = normalizeElement(data.element);
        setElement(normalized);
        setRewardKey(data.relicKey ?? null);
        setIntention(data.intentionOfDay ?? null);
        setRelicLabel(data.relicLabel ?? null);
        setRelicImageUrl(data.relicImageUrl ?? null);
        setServerDate(data.serverDate);
        console.log('[useElementOfDayClaim] Fetched data:', { element: normalized, intention: data.intentionOfDay, relicLabel: data.relicLabel });
      }

      // Check claim status for this user using server date
      const dateToCheck = data.serverDate;
      if (user?.id && dateToCheck) {
        const { count, error: claimErr } = await supabaseBrowser
          .from("user_element_claims")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("day", dateToCheck);

        if (claimErr) {
          console.warn("useElementOfDayClaim: user_element_claims fetch error:", claimErr.message);
          setIsClaimed(false);
        } else {
          setIsClaimed((count ?? 0) > 0);
        }
      } else {
        setIsClaimed(false);
      }
    } catch (err) {
      console.error("useElementOfDayClaim: fetch error", err);
      setError("Failed to load daily element");
      setElement(null);
      setRewardKey(null);
      setIntention(null);
      setIsClaimed(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // Initial fetch
    if (lastFetchRef.current === null) {
      lastFetchRef.current = "init";
      fetchToday();
      return;
    }
    // Re-fetch when user changes (but only if we already fetched once)
    if (lastFetchRef.current !== todayKey && serverDate) {
      lastFetchRef.current = todayKey;
      fetchToday();
    }
  }, [todayKey, fetchToday, serverDate]);

  const claim = useCallback(async (): Promise<ClaimRPCResponse | null> => {
    setError(null);
    try {
      // Call the provided RPC which decides today's element and claim
      const { data, error: rpcErr } = await supabaseBrowser.rpc<ClaimRPCResponse>(
        "claim_element_of_day_reward"
      );

      if (rpcErr) {
        console.error("useElementOfDayClaim: claim RPC error", rpcErr);
        setError("Couldn't claim reward");
        return null;
      }

      const resp = data as ClaimRPCResponse;
      const normalized = normalizeElement(resp?.element);
      if (typeof resp?.ok !== "undefined") {
        // Update local state from RPC response
        if (resp.ok || resp.already_claimed) {
          setIsClaimed(true);
        }
        if (typeof resp.reward_key !== "undefined") setRewardKey(resp.reward_key ?? null);
        if (typeof resp.intention_of_day !== "undefined") setIntention(resp.intention_of_day ?? null);
        if (normalized) setElement(normalized);
      }

      return resp ?? null;
    } catch (err) {
      console.error("useElementOfDayClaim: claim error", err);
      setError("Couldn't claim reward");
      return null;
    }
  }, []);

  return {
    loading,
    element,
    rewardKey,
    intention,
    relicLabel,
    relicImageUrl,
    isClaimed,
    error,
    claim,
    refetch: fetchToday,
  };
}

