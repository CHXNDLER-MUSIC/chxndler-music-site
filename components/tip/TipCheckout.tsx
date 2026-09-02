'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { trackTipEvent } from '@/lib/tip/analytics';
import { getTipSession } from '@/lib/tip/session';
import { sfx } from '@/lib/sfx';
import styles from './tip.module.css';
import TipVenmoButton from './TipVenmoButton';

type FetchMethod = 'card' | 'cashapp' | 'link' | 'express';
type StripeChip = 'card' | 'cashapp' | 'link';
type Choice = StripeChip | 'venmo';

const CHIPS: { key: Choice; label: string }[] = [
  { key: 'card', label: 'Card' },
  { key: 'venmo', label: 'Venmo' },
  // Cash App and Link tabs removed for now.
];

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

const APPEARANCE: StripeElementsOptions['appearance'] = {
  theme: 'night',
  variables: {
    colorPrimary: '#fc54af',
    colorBackground: '#0a0320',
    colorText: '#ffffff',
    borderRadius: '12px',
    fontFamily: 'InterLocal, system-ui, sans-serif',
  },
};

function formatUsd(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

type SecretResult =
  | { ok: true; clientSecret: string; paymentIntentId: string }
  | { ok: false; error: string };

async function requestSecret(
  method: FetchMethod,
  amountCents: number,
): Promise<SecretResult> {
  let session: ReturnType<typeof getTipSession> | null = null;
  try {
    session = getTipSession();
  } catch {
    session = null;
  }
  try {
    const res = await fetch('/api/tip/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        amountDollars: Math.round(amountCents / 100),
        method,
        sessionId: session?.id ?? 'ts_unknown',
        source: session?.source ?? 'direct',
        campaign: session?.campaign ?? 'none',
      }),
    });
    const data = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (res.ok && typeof data?.clientSecret === 'string') {
      return {
        ok: true,
        clientSecret: data.clientSecret,
        paymentIntentId: String(data.paymentIntentId ?? ''),
      };
    }
    const serverMsg = typeof data?.error === 'string' ? data.error : '';
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[tip] create-payment-intent failed', res.status, data);
    }
    return {
      ok: false,
      error: serverMsg || `Payment setup failed (${res.status}). Please try again.`,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[tip] create-payment-intent network error', err);
    }
    return { ok: false, error: 'network' };
  }
}

/** Requests a client secret, retrying once on a transient network failure. */
async function fetchSecret(
  method: FetchMethod,
  amountCents: number,
): Promise<SecretResult> {
  const first = await requestSecret(method, amountCents);
  if (first.ok || first.error !== 'network') return first;
  await new Promise((r) => setTimeout(r, 900));
  const second = await requestSecret(method, amountCents);
  if (second.ok) return second;
  return {
    ok: false,
    error:
      second.error === 'network'
        ? 'We couldn’t reach the payment service. Check your connection and try again, or use Venmo.'
        : second.error,
  };
}

/* -------------------------------------------------------------------------- */

function ExpressPanel({
  paymentIntentId,
  onSuccess,
  onError,
}: {
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (m: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [available, setAvailable] = useState<boolean | null>(null);

  const confirm = async () => {
    if (!stripe || !elements) return;
    void trackTipEvent('payment_started', {
      provider: 'stripe',
      stripePaymentIntentId: paymentIntentId,
      metadata: { method: 'wallet' },
    });
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/tip` },
      redirect: 'if_required',
    });
    if (error) {
      void trackTipEvent('payment_failed', {
        provider: 'stripe',
        stripePaymentIntentId: paymentIntentId,
        metadata: { code: error.code ?? null, type: error.type, method: 'wallet' },
      });
      onError('That payment could not be completed. Your card was not charged.');
      return;
    }
    if (
      paymentIntent &&
      (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')
    ) {
      void trackTipEvent('payment_completed', {
        provider: 'stripe',
        amountCents: paymentIntent.amount,
        stripePaymentIntentId: paymentIntent.id,
        metadata: { method: 'wallet' },
      });
      onSuccess();
    }
  };

  return (
    <div
      className={styles.expressHost}
      style={available === false ? { display: 'none' } : undefined}
    >
      <ExpressCheckoutElement
        onReady={(e) => {
          const pm = e.availablePaymentMethods;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[tip] ExpressCheckout availablePaymentMethods:', pm);
          }
          setAvailable(!!pm && (pm.applePay || pm.googlePay));
        }}
        onConfirm={confirm}
        options={{
          buttonHeight: 50,
          paymentMethods: {
            applePay: 'auto',
            googlePay: 'auto',
            link: 'never',
            paypal: 'never',
            amazonPay: 'never',
            klarna: 'never',
          },
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MethodPanel({
  method,
  amountCents,
  paymentIntentId,
  onSuccess,
  onError,
}: {
  method: StripeChip;
  amountCents: number;
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (m: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const confirm = async () => {
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setInlineError('');
    void sfx.play('card-ding', 0.6);
    void trackTipEvent('payment_started', {
      provider: 'stripe',
      stripePaymentIntentId: paymentIntentId,
      metadata: { method },
    });

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/tip` },
      redirect: 'if_required',
    });

    if (error) {
      setSubmitting(false);
      const msg =
        error.type === 'card_error' || error.type === 'validation_error'
          ? error.message || 'That payment could not be completed.'
          : '';
      void trackTipEvent('payment_failed', {
        provider: 'stripe',
        stripePaymentIntentId: paymentIntentId,
        metadata: { code: error.code ?? null, type: error.type, method },
      });
      if (msg) setInlineError(msg);
      else onError('That payment could not be completed. Your card was not charged.');
      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')
    ) {
      void trackTipEvent('payment_completed', {
        provider: 'stripe',
        amountCents: paymentIntent.amount,
        stripePaymentIntentId: paymentIntent.id,
        metadata: { method },
      });
      onSuccess();
      return;
    }

    setSubmitting(false);
    setInlineError('Payment not completed. Please try again.');
  };

  return (
    <div className={styles.methodPanel}>
      <PaymentElement
        options={{
          layout: 'tabs',
          ...(method === 'link' ? { paymentMethodOrder: ['link', 'card'] } : {}),
        }}
      />
      {inlineError ? <p className={styles.fieldError}>{inlineError}</p> : null}
      <button
        type="button"
        className={styles.primary}
        disabled={!stripe || !elements || submitting}
        onClick={confirm}
      >
        {submitting ? 'Processing…' : `Pay ${formatUsd(amountCents)}`}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const CARD_ELEMENT_STYLE = {
  base: {
    color: '#ffffff',
    fontFamily: 'InterLocal, system-ui, sans-serif',
    fontSize: '18px',
    fontSmoothing: 'antialiased',
    iconColor: '#fc54af',
    '::placeholder': { color: 'rgba(255,255,255,0.4)' },
  },
  invalid: { color: '#ffd0e6', iconColor: '#ffd0e6' },
} as const;

/**
 * Card panel using the SPLIT card elements (number / expiry / CVC) plus a plain
 * ZIP input. Each field gets its own labelled box with room to breathe, so the
 * expiry and ZIP are easy to read on a phone — unlike the cramped single-line
 * CardElement. Still no method switcher, so no "Bank" tab can ever appear.
 */
function CardPanel({
  amountCents,
  clientSecret,
  paymentIntentId,
  onSuccess,
  onError,
}: {
  amountCents: number;
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (m: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [numberReady, setNumberReady] = useState(false);
  const [zip, setZip] = useState('');
  const [inlineError, setInlineError] = useState('');

  const confirm = async () => {
    if (!stripe || !elements || submitting) return;
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;
    setSubmitting(true);
    setInlineError('');
    void sfx.play('card-ding', 0.6);
    void trackTipEvent('payment_started', {
      provider: 'stripe',
      stripePaymentIntentId: paymentIntentId,
      metadata: { method: 'card' },
    });

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: { address: { postal_code: zip.trim() || undefined } },
      },
    });

    if (error) {
      setSubmitting(false);
      void trackTipEvent('payment_failed', {
        provider: 'stripe',
        stripePaymentIntentId: paymentIntentId,
        metadata: { code: error.code ?? null, type: error.type, method: 'card' },
      });
      setInlineError(error.message || 'That payment could not be completed.');
      return;
    }
    if (
      paymentIntent &&
      (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')
    ) {
      void trackTipEvent('payment_completed', {
        provider: 'stripe',
        amountCents: paymentIntent.amount,
        stripePaymentIntentId: paymentIntent.id,
        metadata: { method: 'card' },
      });
      onSuccess();
      return;
    }
    setSubmitting(false);
    setInlineError('Payment not completed. Please try again.');
  };

  const onFieldChange = (e: { error?: { message?: string } }) =>
    setInlineError(e.error?.message ?? '');

  return (
    <div className={styles.methodPanel}>
      <label className={styles.cardGroup}>
        <span className={styles.cardLabel}>Card number</span>
        <div className={styles.cardField}>
          <CardNumberElement
            onReady={() => setNumberReady(true)}
            onChange={onFieldChange}
            options={{ style: CARD_ELEMENT_STYLE, placeholder: '1234 1234 1234 1234' }}
          />
        </div>
      </label>

      <div className={styles.cardRow}>
        <label className={styles.cardGroup}>
          <span className={styles.cardLabel}>Expiry date</span>
          <div className={styles.cardField}>
            <CardExpiryElement onChange={onFieldChange} options={{ style: CARD_ELEMENT_STYLE }} />
          </div>
        </label>
        <label className={styles.cardGroup}>
          <span className={styles.cardLabel}>CVC</span>
          <div className={styles.cardField}>
            <CardCvcElement onChange={onFieldChange} options={{ style: CARD_ELEMENT_STYLE }} />
          </div>
        </label>
      </div>

      <label className={styles.cardGroup}>
        <span className={styles.cardLabel}>ZIP code</span>
        <input
          className={styles.cardZip}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          placeholder="12345"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/[^\d-]/g, ''))}
        />
      </label>

      {inlineError ? <p className={styles.fieldError}>{inlineError}</p> : null}
      <button
        type="button"
        className={styles.primary}
        disabled={!stripe || !numberReady || submitting}
        onClick={confirm}
      >
        {submitting ? 'Processing…' : `Pay ${formatUsd(amountCents)}`}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function TipCheckout({
  amountCents,
  onSuccess,
  onError,
  onBack,
}: {
  amountCents: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  onBack: () => void;
}) {
  const promise = useMemo(getStripePromise, []);
  // No method selected yet — nothing highlighted when the checkout screen opens.
  const [choice, setChoice] = useState<Choice | null>(null);
  const [secrets, setSecrets] = useState<Partial<Record<FetchMethod, string>>>({});
  const [piIds, setPiIds] = useState<Partial<Record<FetchMethod, string>>>({});
  const [loading, setLoading] = useState<FetchMethod | null>('card');
  const bailedRef = useRef(false);

  const ensureSecret = useCallback(
    async (method: FetchMethod): Promise<string | null> => {
      if (secrets[method]) return secrets[method]!;
      setLoading(method);
      const r = await fetchSecret(method, amountCents);
      setLoading((cur) => (cur === method ? null : cur));
      if (!r.ok) {
        // Only the initial card load bounces to the full error screen; a failed
        // secondary chip just leaves that panel empty.
        if (method === 'card' && !bailedRef.current) {
          bailedRef.current = true;
          void trackTipEvent('tip_error', { metadata: { where: 'create-payment-intent' } });
          onError(
            r.error && r.error !== 'network'
              ? r.error
              : 'The payment form could not load. Please try again or use Venmo.',
          );
        }
        return null;
      }
      setSecrets((s) => ({ ...s, [method]: r.clientSecret }));
      setPiIds((p) => ({ ...p, [method]: r.paymentIntentId }));
      return r.clientSecret;
    },
    [amountCents, secrets, onError],
  );

  // On mount: a wallet intent for the Apple/Google Pay button, and the card
  // intent for the default panel.
  useEffect(() => {
    void ensureSecret('express');
    void ensureSecret('card');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (c: Choice) => {
    void sfx.play('click', 0.5);
    setChoice(c);
    if (c !== 'venmo') await ensureSecret(c);
  };

  const cardSecret = secrets.card;
  const expressSecret = secrets.express;
  const activeSecret =
    choice && choice !== 'venmo' ? secrets[choice] : undefined;

  return (
    <div className={styles.shell}>
      <div className={styles.checkoutCard}>
        <div className={styles.amountBlock}>
          <p className={styles.amountLine}>
            <span>{formatUsd(amountCents)}</span>
          </p>
          <p className={styles.amountCaption}>Tip to CHXNDLER</p>
        </div>

        {/* Apple Pay / Google Pay — first option. Stripe only renders these on a
            device/browser that actually has the wallet (real iPhone Safari with
            a Wallet card for Apple Pay; Android Chrome for Google Pay). */}
        {expressSecret && piIds.express && (
          <Elements
            stripe={promise}
            options={{ clientSecret: expressSecret, appearance: APPEARANCE }}
          >
            <ExpressPanel
              paymentIntentId={piIds.express}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Elements>
        )}

        <div className={styles.divider}>or</div>

        {/* Method choices */}
        <div className={styles.chipRow}>
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`${styles.chip} ${choice === c.key ? styles.chipActive : ''}`}
              aria-pressed={choice === c.key}
              onClick={() => void pick(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Active method panel — nothing until a chip is chosen */}
        {choice === 'venmo' ? (
          <div className={styles.venmoPanel}>
            <TipVenmoButton
              amountDollars={Math.round(amountCents / 100)}
              note="One alien to another ♡"
            />
          </div>
        ) : choice === 'card' ? (
          cardSecret && piIds.card ? (
            <Elements stripe={promise}>
              <CardPanel
                amountCents={amountCents}
                clientSecret={cardSecret}
                paymentIntentId={piIds.card}
                onSuccess={onSuccess}
                onError={onError}
              />
            </Elements>
          ) : (
            <div className={styles.methodLoading}>
              <span className={styles.spinner} aria-label="Loading" />
            </div>
          )
        ) : choice && activeSecret && piIds[choice] ? (
          <Elements
            key={choice}
            stripe={promise}
            options={{ clientSecret: activeSecret, appearance: APPEARANCE }}
          >
            <MethodPanel
              method={choice}
              amountCents={amountCents}
              paymentIntentId={piIds[choice]!}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Elements>
        ) : choice && loading === choice ? (
          <div className={styles.methodLoading}>
            <span className={styles.spinner} aria-label="Loading" />
          </div>
        ) : null}

        <button type="button" className={styles.back} onClick={onBack}>
          ← change amount
        </button>
      </div>
    </div>
  );
}
