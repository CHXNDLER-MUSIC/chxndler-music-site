'use client';

import { useEffect, useRef, useState } from 'react';
import { trackTipEvent } from '@/lib/tip/analytics';
import {
  HOMEPAGE_WARP_FLAG,
  TIP_PAID_FLAG,
  TIP_MAX_DOLLARS,
  TIP_MIN_DOLLARS,
} from '@/lib/tip/constants';
import { sfx } from '@/lib/sfx';
import styles from './tip.module.css';
import TipAmountPicker from './TipAmountPicker';
import TipCheckout from './TipCheckout';
import TipError from './TipError';

type Stage = 'select' | 'pay' | 'error';

function tipAlreadyPaid(): boolean {
  try {
    return sessionStorage.getItem(TIP_PAID_FLAG) === '1';
  } catch {
    return false;
  }
}

/**
 * The moment a tip is confirmed we leave /tip entirely and hand the visitor to
 * the main site. HOMEPAGE_WARP_FLAG makes DashboardApp run its own warp/entry
 * sequence on arrival, so it feels like being transported in — no button, no
 * intermediate screen. TIP_PAID_FLAG guards against a Back/refresh dropping
 * anyone back into the tipping flow.
 */
function enterSite() {
  try {
    sessionStorage.setItem(TIP_PAID_FLAG, '1');
    sessionStorage.setItem(HOMEPAGE_WARP_FLAG, '1');
  } catch {}
  // Relative — resolves to chxndler.world/ in production, localhost in dev.
  window.location.assign('/');
}

export default function TipExperience() {
  const [stage, setStage] = useState<Stage>('select');
  const [amountCents, setAmountCents] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [redirecting, setRedirecting] = useState(
    () => typeof window !== 'undefined' && tipAlreadyPaid(),
  );
  const firedView = useRef(false);

  // Shared UI SFX bus for this flow.
  useEffect(() => {
    sfx.setEnabled(true);
    sfx.preload(['click', 'card-ding']).catch(() => {});
  }, []);

  // Already paid this tab session → don't render the flow, just go to the site.
  useEffect(() => {
    if (tipAlreadyPaid()) enterSite();
  }, []);

  // First-party page view + resilience for redirect-based payment methods that
  // bounce back to /tip with Stripe's status params.
  useEffect(() => {
    if (firedView.current) return;
    firedView.current = true;

    void trackTipEvent('tip_page_view');

    try {
      const params = new URLSearchParams(window.location.search);
      const redirectStatus = params.get('redirect_status');
      const returnedPi = params.get('payment_intent');

      if (returnedPi && redirectStatus === 'succeeded') {
        void trackTipEvent('payment_completed', {
          provider: 'stripe',
          stripePaymentIntentId: returnedPi,
          metadata: { via: 'redirect_return' },
        });
        setRedirecting(true);
        enterSite();
        return;
      }

      if (returnedPi || redirectStatus) {
        window.history.replaceState({}, '', '/tip');
      }
    } catch {}
  }, []);

  const handlePaid = () => {
    void trackTipEvent('heartverse_enter_clicked', { metadata: { via: 'auto_redirect' } });
    setRedirecting(true);
    enterSite();
  };

  const handleContinue = (amountDollars: number) => {
    if (tipAlreadyPaid()) {
      setRedirecting(true);
      enterSite();
      return;
    }
    const dollars = Math.round(amountDollars);
    if (!Number.isFinite(dollars) || dollars < TIP_MIN_DOLLARS || dollars > TIP_MAX_DOLLARS) {
      return;
    }
    setErrorMessage('');
    setAmountCents(dollars * 100);
    setStage('pay');
  };

  const resetToSelect = () => {
    setAmountCents(0);
    setErrorMessage('');
    setStage('select');
  };

  if (redirecting) {
    return (
      <div className={styles.root}>
        <div className={styles.stars} aria-hidden="true" />
        <p className={styles.redirectNote}>Entering the Heartverse…</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.stars} aria-hidden="true" />

      {stage === 'select' && (
        <TipAmountPicker busy={false} onContinue={handleContinue} />
      )}

      {stage === 'pay' && amountCents > 0 && (
        <TipCheckout
          amountCents={amountCents}
          onSuccess={handlePaid}
          onError={(message) => {
            setErrorMessage(message);
            setStage('error');
          }}
          onBack={resetToSelect}
        />
      )}

      {stage === 'error' && (
        <TipError message={errorMessage} onRetry={resetToSelect} />
      )}
    </div>
  );
}
