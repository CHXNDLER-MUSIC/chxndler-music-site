'use client';

import { DEFAULT_CAMPAIGN, DEFAULT_SOURCE } from './constants';
import { browserFromUA, deviceCategoryFromUA, type DeviceCategory } from './device';

const STORAGE_KEY = 'chx_tip_session';

export type TipSession = {
  id: string;
  source: string;
  campaign: string;
  referrer: string;
  device: DeviceCategory;
  browser: string;
};

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `ts_${crypto.randomUUID()}`;
    }
  } catch {}
  return `ts_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeTag(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 120);
  // QR sign / campaign identifiers only — keep it URL-ish and boring.
  if (!/^[\w .:/@-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Returns a stable anonymous session for this browser. The first call on a
 * visit locks in source/campaign (from the URL, or sensible defaults) so they
 * survive the whole flow, even after the URL is cleaned up.
 */
export function getTipSession(): TipSession {
  if (typeof window === 'undefined') {
    return {
      id: 'ts_ssr',
      source: DEFAULT_SOURCE,
      campaign: DEFAULT_CAMPAIGN,
      referrer: '',
      device: 'desktop',
      browser: 'Other',
    };
  }

  const ua = navigator.userAgent || '';
  const params = new URLSearchParams(window.location.search);
  const urlSource = sanitizeTag(params.get('source'));
  const urlCampaign = sanitizeTag(params.get('campaign'));

  let stored: Partial<TipSession> | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<TipSession>;
  } catch {}

  const session: TipSession = {
    id: stored?.id || makeId(),
    // A source/campaign already captured for this session wins over a later
    // bare visit, but an explicit URL param on this load can still set it.
    source: stored?.source || urlSource || DEFAULT_SOURCE,
    campaign: stored?.campaign || urlCampaign || DEFAULT_CAMPAIGN,
    referrer: stored?.referrer || (document.referrer || ''),
    device: deviceCategoryFromUA(ua),
    browser: browserFromUA(ua),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}

  return session;
}
