'use client';

import { useEffect, useRef, useState } from 'react';
import { trackTipEvent } from '@/lib/tip/analytics';
import { TIP_MAX_DOLLARS, TIP_MIN_DOLLARS } from '@/lib/tip/constants';
import { sfx } from '@/lib/sfx';
import styles from './tip.module.css';
import TipAmountPicker from './TipAmountPicker';
import TipCheckout from './TipCheckout';
import TipError from './TipError';

type Stage = 'select' | 'pay' | 'error';

/**
 * Leave /tip for the main site's normal opening screen. Only ever called after
 * a confirmed payment (the Pay button, or a redirect-method return) — visiting
 * /tip on its own never triggers this.
 */
function enterSite() {
  // Relative — resolves to chxndler.world/ in production, localhost in dev.
  window.location.assign('/');
}

export default function TipExperience() {
  const [stage, setStage] = useState<Stage>('select');
  const [amountCents, setAmountCents] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const firedView = useRef(false);

  // Shared UI SFX bus for this flow. Also clear any leftover "paid" flag from an
  // earlier build so it can never auto-redirect a plain /tip visit.
  useEffect(() => {
    sfx.setEnabled(true);
    sfx.preload(['click', 'card-ding']).catch(() => {});
    try {
      sessionStorage.removeItem('chx_tip_paid');
    } catch {}
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
