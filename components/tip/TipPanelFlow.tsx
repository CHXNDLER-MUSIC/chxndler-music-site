'use client';

import { useEffect, useRef, useState } from 'react';
import { trackTipEvent } from '@/lib/tip/analytics';
import { TIP_MAX_DOLLARS, TIP_MIN_DOLLARS } from '@/lib/tip/constants';
import { sfx } from '@/lib/sfx';
import styles from './tip.module.css';
import TipAmountPicker from './TipAmountPicker';
import TipCheckout from './TipCheckout';
import TipError from './TipError';

type Stage = 'select' | 'pay' | 'error' | 'thanks';

/**
 * The /tip flow embedded in the in-site SUPPORT THE HEARTVERSE panel.
 * Same picker, Stripe checkout, Venmo and analytics as TipExperience, but a
 * confirmed payment shows a thank-you in place instead of reloading "/", so
 * whatever the visitor is listening to keeps playing.
 */
export default function TipPanelFlow({ onClose }: { onClose?: () => void }) {
  const [stage, setStage] = useState<Stage>('select');
  const [amountCents, setAmountCents] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const firedView = useRef(false);

  useEffect(() => {
    if (firedView.current) return;
    firedView.current = true;
    void trackTipEvent('tip_page_view', { metadata: { surface: 'heartverse_panel' } });
  }, []);

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

  const handlePaid = () => {
    try { void sfx.play('card-ding', 0.7); } catch {}
    setStage('thanks');
  };

  return (
    <div className={styles.embed}>
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

      {stage === 'thanks' && (
        <div className={styles.shell}>
          <h2 className={styles.title}>Thank you ♡</h2>
          <p className={styles.subtitle}>your signal keeps the music going</p>
          {onClose && (
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                try { void sfx.play('click', 0.5); } catch {}
                onClose();
              }}
            >
              Back to the Heartverse
            </button>
          )}
        </div>
      )}
    </div>
  );
}
