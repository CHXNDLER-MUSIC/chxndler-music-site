"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLocalDateString } from "@/utils/dateHelpers";
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
  const [isClaimed, setIsClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = useMemo(() => `${user?.id || "anon"}:${getLocalDateString()}`, [user?.id]);
  const lastFetchRef = useRef<string | null>(null);

  const fetchToday = useCallback(async () => {
    const today = getLocalDateString();
    setLoading(true);
    setError(null);
    try {
      // Fetch today's element row
      const { data: eod, error: eodErr } = await supabaseBrowser
        .from("element_of_day")
        .select("day, element, relic_key, intention_of_day")
        .eq("day", today)
        .maybeSingle();

      if (eodErr) {
        console.warn("useElementOfDayClaim: element_of_day fetch error:", eodErr.message);
        setElement(null);
        setRewardKey(null);
        setIntention(null);
      } else {
        const normalized = normalizeElement(eod?.element);
        setElement(normalized);
        setRewardKey(eod?.relic_key ?? null);
        setIntention(eod?.intention_of_day ?? null);
      }

      // Check claim status for this user and day
      if (user?.id) {
        const { count, error: claimErr } = await supabaseBrowser
          .from("user_element_claims")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("day", today);

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
    if (lastFetchRef.current === todayKey) return;
    lastFetchRef.current = todayKey;
    fetchToday();
  }, [todayKey, fetchToday]);

  const claim = useCallback(async (): Promise<ClaimRPCResponse | null> => {
    setError(null);
    try {
      // Call the provided RPC which decides today's element and claim
      const { data, error: rpcErr } = await supabaseBrowser.rpc<ClaimRPCResponse>(
        "claim_element_of_day_reward"
      );

      if (rpcErr) {
        console.error("useElementOfDayClaim: claim RPC error", rpcErr);
        setError("Couldn’t claim reward");
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
      setError("Couldn’t claim reward");
      return null;
    }
  }, []);

  return {
    loading,
    element,
    rewardKey,
    intention,
    isClaimed,
    error,
    claim,
    refetch: fetchToday,
  };
}

