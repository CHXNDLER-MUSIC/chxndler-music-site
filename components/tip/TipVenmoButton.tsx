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

/**
 * Secondary payment option. Config (label / URL / handle / enabled) lives in the
 * Supabase `tip_payment_methods` table. A click is only ever recorded as a
 * click — it never marks the visitor as having tipped.
 */
export default function TipVenmoButton() {
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

  const onClick = () => {
    void sfx.play('click', 0.5);
    void trackTipEvent('venmo_clicked', { provider: 'venmo' });
  };

  return (
    <a
      className={styles.venmo}
      href={method.public_url}
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
