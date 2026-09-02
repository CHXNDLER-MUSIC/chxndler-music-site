'use client';

import { useEffect, useState } from 'react';
import { trackTipEvent } from '@/lib/tip/analytics';
import { sfx } from '@/lib/sfx';
import styles from './tip.module.css';

type Method = {
  provider: string;
  button_label: string;
  public_url: string;
  display_handle: string | null;
};

/** Pull the Venmo username from the stored profile URL or the display handle. */
function venmoUsername(m: Method): string | null {
  const fromHandle = m.display_handle?.replace(/^@/, '').trim();
  if (fromHandle) return fromHandle;
  try {
    const parts = new URL(m.public_url).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

/**
 * Secondary payment option. Config (label / URL / handle / enabled) lives in the
 * Supabase `tip_payment_methods` table. When an amount + note are passed, the
 * link opens Venmo with the payment pre-filled. A click is only ever recorded
 * as a click — it never marks the visitor as having tipped.
 */
export default function TipVenmoButton({
  amountDollars,
  note,
}: {
  amountDollars?: number;
  note?: string;
}) {
  const [method, setMethod] = useState<Method | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tip/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const venmo = (data?.methods as Method[] | undefined)?.find(
          (m) => m.provider === 'venmo',
        );
        setMethod(venmo ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!method?.public_url) return null;

  const username = venmoUsername(method);
  const amountOk =
    typeof amountDollars === 'number' && Number.isFinite(amountDollars) && amountDollars > 0;

  let href = method.public_url;
  if (username && amountOk) {
    const params = new URLSearchParams({
      txn: 'pay',
      amount: String(Math.round(amountDollars!)),
    });
    if (note) params.set('note', note);
    href = `https://venmo.com/${encodeURIComponent(username)}?${params.toString()}`;
  }

  const onClick = () => {
    void sfx.play('click', 0.5);
    void trackTipEvent('venmo_clicked', {
      provider: 'venmo',
      amountCents: amountOk ? Math.round(amountDollars!) * 100 : undefined,
    });
  };

  return (
    <a
      className={styles.venmo}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
    >
      {method.button_label || 'VENMO'}
      {method.display_handle ? (
        <span className={styles.venmoHandle}>{method.display_handle}</span>
      ) : null}
    </a>
  );
}
