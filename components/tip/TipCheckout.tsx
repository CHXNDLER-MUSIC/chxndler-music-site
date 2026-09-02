'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import {
  CardElement,
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

type StripeMethod = 'card' | 'cashapp' | 'link';
type Choice = StripeMethod | 'venmo';

const CHIPS: { key: Choice; label: string }[] = [
  { key: 'cashapp', label: 'Cash App' },
  { key: 'card', label: 'Card' },
  { key: 'link', label: 'Link' },
  { key: 'venmo', label: 'Venmo' },
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

async function fetchSecret(
  method: StripeMethod,
  amountCents: number,
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  try {
    const s = getTipSession();
    const res = await fetch('/api/tip/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountDollars: Math.round(amountCents / 100),
        method,
        sessionId: s.id,
        source: s.source,
        campaign: s.campaign,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.clientSecret) return null;
    return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
  } catch {
    return null;
  }
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
          setAvailable(!!pm && (pm.applePay || pm.googlePay));
        }}
        onConfirm={confirm}
        options={{
          buttonHeight: 48,
          layout: { maxColumns: 2, maxRows: 1, overflow: 'never' },
          paymentMethods: {
            applePay: 'auto',
            googlePay: 'auto',
            link: 'never',
            paypal: 'never',
            amazonPay: 'never',
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
  method: StripeMethod;
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

/**
 * Card panel using the classic CardElement (not PaymentElement). CardElement
 * renders ONLY the card number / expiry / CVC fields — it has no method
 * switcher, so it can never show a "Bank" tab or a Link box, regardless of what
 * the PaymentIntent's payment_method_types happen to be.
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
  const [ready, setReady] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const confirm = async () => {
    if (!stripe || !elements || submitting) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setSubmitting(true);
    setInlineError('');
    void sfx.play('card-ding', 0.6);
    void trackTipEvent('payment_started', {
      provider: 'stripe',
      stripePaymentIntentId: paymentIntentId,
      metadata: { method: 'card' },
    });

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
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

  return (
    <div className={styles.methodPanel}>
      <div className={styles.cardField}>
        <CardElement
          onReady={() => setReady(true)}
          onChange={(e) => setInlineError(e.error?.message ?? '')}
          options={{
            hidePostalCode: false,
            style: {
              base: {
                color: '#ffffff',
                fontFamily: 'InterLocal, system-ui, sans-serif',
                fontSize: '16px',
                iconColor: '#fc54af',
                '::placeholder': { color: 'rgba(255,255,255,0.4)' },
              },
              invalid: { color: '#ffd0e6', iconColor: '#ffd0e6' },
            },
          }}
        />
      </div>
      {inlineError ? <p className={styles.fieldError}>{inlineError}</p> : null}
      <button
        type="button"
        className={styles.primary}
        disabled={!stripe || !ready || submitting}
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
  const [choice, setChoice] = useState<Choice>('card');
  const [secrets, setSecrets] = useState<Partial<Record<StripeMethod, string>>>({});
  const [piIds, setPiIds] = useState<Partial<Record<StripeMethod, string>>>({});
  const [loading, setLoading] = useState<StripeMethod | null>('card');
  const bailedRef = useRef(false);

  const ensureSecret = useCallback(
    async (method: StripeMethod): Promise<string | null> => {
      if (secrets[method]) return secrets[method]!;
      setLoading(method);
      const r = await fetchSecret(method, amountCents);
      setLoading(null);
      if (!r) {
        if (method === 'card' && !bailedRef.current) {
          bailedRef.current = true;
          onError('The payment form could not load. Please try again or use Venmo.');
        }
        return null;
      }
      setSecrets((s) => ({ ...s, [method]: r.clientSecret }));
      setPiIds((p) => ({ ...p, [method]: r.paymentIntentId }));
      return r.clientSecret;
    },
    [amountCents, secrets, onError],
  );

  // Card secret up front — it feeds both Apple/Google Pay and the default panel.
  useEffect(() => {
    void ensureSecret('card');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (c: Choice) => {
    void sfx.play('click', 0.5);
    setChoice(c);
    if (c !== 'venmo') await ensureSecret(c);
  };

  const cardSecret = secrets.card;
  const activeSecret = choice !== 'venmo' ? secrets[choice] : undefined;

  return (
    <div className={styles.shell}>
      <div className={styles.checkoutCard}>
        <div className={styles.amountBlock}>
          <p className={styles.amountLine}>
            <span>{formatUsd(amountCents)}</span>
          </p>
          <p className={styles.amountCaption}>Tip to CHXNDLER</p>
        </div>

        {/* Apple Pay / Google Pay — first option, only rendered by Stripe on a
            device/browser that actually has a wallet. */}
        {cardSecret && piIds.card && (
          <Elements
            stripe={promise}
            options={{ clientSecret: cardSecret, appearance: APPEARANCE }}
          >
            <ExpressPanel
              paymentIntentId={piIds.card}
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

        {/* Active method panel */}
        {choice === 'venmo' ? (
          <div className={styles.venmoPanel}>
            <TipVenmoButton />
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
        ) : activeSecret && piIds[choice] ? (
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
        ) : loading === choice ? (
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
