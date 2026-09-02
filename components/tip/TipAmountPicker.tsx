'use client';

import { useMemo, useState } from 'react';
import { trackTipEvent } from '@/lib/tip/analytics';
import { TIP_MAX_DOLLARS, TIP_MIN_DOLLARS, TIP_PRESETS_CENTS } from '@/lib/tip/constants';
import { sfx } from '@/lib/sfx';
import styles from './tip.module.css';

type Selection = { kind: 'preset'; dollars: number } | { kind: 'custom' } | null;

function validateCustom(raw: string): { dollars?: number; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: '' };
  if (!/^\d{1,4}$/.test(trimmed)) return { error: 'Whole dollar amounts only.' };
  const n = Number(trimmed);
  if (n < TIP_MIN_DOLLARS) return { error: `Minimum tip is $${TIP_MIN_DOLLARS}.` };
  if (n > TIP_MAX_DOLLARS) return { error: `Maximum tip is $${TIP_MAX_DOLLARS}.` };
  return { dollars: n, error: '' };
}

export default function TipAmountPicker({
  busy,
  onContinue,
}: {
  busy: boolean;
  onContinue: (amountDollars: number) => void;
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [customRaw, setCustomRaw] = useState('');
  const [touched, setTouched] = useState(false);

  const custom = useMemo(() => validateCustom(customRaw), [customRaw]);

  const resolvedDollars =
    selection?.kind === 'preset'
      ? selection.dollars
      : selection?.kind === 'custom'
        ? custom.dollars
        : undefined;

  const showError = touched && selection?.kind === 'custom' && !!custom.error;

  const handlePreset = (cents: number) => {
    void sfx.play('click', 0.5);
    const dollars = cents / 100;
    setSelection({ kind: 'preset', dollars });
    setTouched(false);
    void trackTipEvent('amount_selected', { amountCents: cents });
  };

  const handleOther = () => {
    void sfx.play('click', 0.5);
    setSelection({ kind: 'custom' });
    void trackTipEvent('other_amount_selected');
  };

  const handleSubmit = () => {
    if (busy) return;
    void sfx.play('click', 0.5);
    if (selection?.kind === 'custom') {
      setTouched(true);
      if (!custom.dollars) return;
      void trackTipEvent('amount_selected', { amountCents: custom.dollars * 100 });
      onContinue(custom.dollars);
      return;
    }
    if (resolvedDollars) onContinue(resolvedDollars);
  };

  return (
    <div className={styles.shell}>
      <img className={styles.titleIcon} src="/elements/merch.webp" alt="" aria-hidden="true" />
      <h1 className={styles.title}>Tip CHXNDLER ♡</h1>
      <p className={styles.subtitle}>help me keep making music</p>

      <div className={styles.grid}>
        {TIP_PRESETS_CENTS.map((cents) => {
          const dollars = cents / 100;
          const selected =
            selection?.kind === 'preset' && selection.dollars === dollars;
          return (
            <button
              key={cents}
              type="button"
              className={`${styles.preset} ${selected ? styles.presetSelected : ''}`}
              aria-pressed={selected}
              onClick={() => handlePreset(cents)}
            >
              ${dollars}
            </button>
          );
        })}

        <button
          type="button"
          className={`${styles.other} ${selection?.kind === 'custom' ? styles.otherSelected : ''}`}
          aria-pressed={selection?.kind === 'custom'}
          onClick={handleOther}
        >
          Other Amount
        </button>

        {selection?.kind === 'custom' && (
          <div className={styles.customWrap}>
            <span className={styles.customCurrency}>$</span>
            <input
              className={styles.customInput}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              placeholder="0"
              maxLength={4}
              value={customRaw}
              onChange={(e) => {
                setCustomRaw(e.target.value.replace(/[^\d]/g, ''));
                setTouched(true);
              }}
              aria-label="Custom tip amount in US dollars"
            />
          </div>
        )}

        <p className={styles.fieldError}>{showError ? custom.error : ''}</p>
      </div>

      <button
        type="button"
        className={styles.primary}
        disabled={busy || !resolvedDollars}
        onClick={handleSubmit}
      >
        {busy ? 'One sec…' : resolvedDollars ? `Tip $${resolvedDollars}` : 'Choose an amount'}
      </button>
    </div>
  );
}
