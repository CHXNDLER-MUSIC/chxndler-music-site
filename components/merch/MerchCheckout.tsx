'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import {
  AddressElement,
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { sfx } from '@/lib/sfx';
import { MERCH_MAX_QTY } from '@/lib/merch/constants';
import styles from '@/components/tip/tip.module.css';

/**
 * In-site card checkout for a physical merch item — replaces sending buyers to
 * the item's Stripe Payment Link. Same card fields as the tip flow.
 *
 *   details → Apple Pay / Google Pay (wallet sheet collects address + email,
 *             tax re-quoted live), or quantity, receipt email, shipping address
 *   pay     → subtotal + sales tax (Stripe Tax) + total, card number / expiry / CVC / ZIP
 *   done    → thank-you
 *
 * Prices and tax come from /api/merch/checkout; the order is recorded by the
 * Stripe webhook once the payment succeeds.
 */

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

// Compact sizing so the checkout fits the merch display (Stripe draws the
// address fields in its own frame, so they're sized here, not in CSS)
const ELEMENTS_OPTIONS: StripeElementsOptions = {
  appearance: {
    theme: 'night',
    // Labels sit inside each box (and float up when typing) — no separate label rows
    labels: 'floating',
    variables: {
      colorPrimary: '#fc54af',
      colorBackground: '#0a0320',
      colorText: '#ffffff',
      borderRadius: '10px',
      fontFamily: 'InterLocal, system-ui, sans-serif',
      fontSizeBase: '13px',
      spacingUnit: '2px',
      spacingGridRow: '6px',
      spacingGridColumn: '6px',
    },
  },
};

const CARD_ELEMENT_STYLE = {
  base: {
    color: '#ffffff',
    fontFamily: 'InterLocal, system-ui, sans-serif',
    fontSize: '15px',
    fontSmoothing: 'antialiased',
    iconColor: '#fc54af',
    '::placeholder': { color: 'rgba(255,255,255,0.4)' },
  },
  invalid: { color: '#ffd0e6', iconColor: '#ffd0e6' },
} as const;

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export type MerchCheckoutItem = {
  id: string;
  name: string;
  priceUsd: number;
  image?: string | null;
};

type Quote = {
  clientSecret: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  name: string;
  postalCode: string;
};

const FREE_SHIPPING = { id: 'free', displayName: 'Free shipping', amount: 0 };

/**
 * Apple Pay / Google Pay. The wallet sheet collects the shipping address and
 * email; sales tax is re-quoted each time the address changes. Lives in its own
 * Elements group (deferred-intent mode) so the card form's empty AddressElement
 * is never validated when a wallet pays. Hidden when no wallet is available.
 */
function WalletPanel({
  item,
  quantity,
  color,
  onPaid,
  onError,
}: {
  item: MerchCheckoutItem;
  quantity: number;
  color?: string | null;
  onPaid: (email: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [available, setAvailable] = useState<boolean | null>(null);
  const unitCents = Math.round(item.priceUsd * 100);
  const subtotalCents = unitCents * quantity;
  const approvedTotalRef = useRef<number | null>(null);
  const label = `${item.name}${quantity > 1 ? ` ×${quantity}` : ''}`;

  // Quantity changed on the page → wallet amount follows (tax re-quoted in the sheet)
  useEffect(() => {
    approvedTotalRef.current = null;
    elements?.update({ amount: subtotalCents });
  }, [elements, subtotalCents]);

  return (
    <div style={available === false ? { display: 'none' } : { width: '100%' }}>
      <ExpressCheckoutElement
        onReady={(e) => {
          const pm = e.availablePaymentMethods;
          setAvailable(!!pm && (!!pm.applePay || !!pm.googlePay));
        }}
        onClick={(e) => {
          try { void sfx.play('click', 0.5); } catch {}
          e.resolve({ lineItems: [{ name: label, amount: subtotalCents }] });
        }}
        onShippingAddressChange={async (e) => {
          try {
            const res = await fetch('/api/merch/checkout/quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({ merchItemId: item.id, quantity, address: e.address }),
            });
            const q = await res.json().catch(() => ({}));
            if (!res.ok || typeof q?.totalCents !== 'number') return e.reject();
            approvedTotalRef.current = q.totalCents;
            elements?.update({ amount: q.totalCents });
            e.resolve({
              lineItems: [
                { name: label, amount: q.subtotalCents },
                { name: 'Sales tax', amount: q.taxCents },
              ],
              shippingRates: [FREE_SHIPPING],
            });
          } catch {
            e.reject();
          }
        }}
        onConfirm={async (e) => {
          if (!stripe || !elements) return e.paymentFailed({ reason: 'fail' });
          const ship = e.shippingAddress;
          const email = e.billingDetails?.email || '';
          const { error: submitError } = await elements.submit();
          if (submitError) return e.paymentFailed({ reason: 'fail' });

          const res = await fetch('/api/merch/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
              merchItemId: item.id,
              quantity,
              color: color || null,
              email,
              name: ship?.name || e.billingDetails?.name || '',
              phone: e.billingDetails?.phone || undefined,
              address: ship?.address ? { ...ship.address, line2: ship.address.line2 || undefined } : null,
              expectedTotalCents: approvedTotalRef.current,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || typeof data?.clientSecret !== 'string') {
            e.paymentFailed({ reason: 'fail' });
            onError(typeof data?.error === 'string' ? data.error : 'Checkout setup failed. Please try again.');
            return;
          }

          const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret: data.clientSecret,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
          });
          if (error) {
            onError(error.message || 'That payment could not be completed. You were not charged.');
            return;
          }
          if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
            onPaid(email);
          }
        }}
        options={{
          buttonHeight: 40,
          emailRequired: true,
          shippingAddressRequired: true,
          shippingRates: [FREE_SHIPPING],
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
      {available ? (
        <div className={styles.divider} style={{ marginTop: '0.75rem' }}>
          <span>or pay with card</span>
        </div>
      ) : null}
    </div>
  );
}

function CheckoutFlow({
  item,
  color,
  defaultEmail,
  onClose,
}: {
  item: MerchCheckoutItem;
  color?: string | null;
  defaultEmail?: string | null;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const stripePromiseForWallet = useMemo(getStripePromise, []);
  const [stage, setStage] = useState<'details' | 'pay' | 'done'>('details');
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState(defaultEmail || '');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unitCents = Math.round(item.priceUsd * 100);

  const click = () => { try { void sfx.play('click', 0.5); } catch {} };

  const continueToPay = async () => {
    if (!elements || busy) return;
    click();
    setError('');
    const addressEl = elements.getElement(AddressElement);
    const result = addressEl ? await addressEl.getValue() : null;
    if (!result?.complete) {
      setError('Please complete your shipping address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email for your receipt.');
      return;
    }
    setBusy(true);
    try {
      const { name, address, phone } = result.value;
      const res = await fetch('/api/merch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          merchItemId: item.id,
          quantity,
          color: color || null,
          email: email.trim(),
          name,
          phone: phone || undefined,
          address: { ...address, line2: address.line2 || undefined },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.clientSecret !== 'string') {
        setError(typeof data?.error === 'string' ? data.error : 'Checkout setup failed. Please try again.');
        return;
      }
      setQuote({
        clientSecret: data.clientSecret,
        subtotalCents: data.subtotalCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
        name,
        postalCode: address.postal_code,
      });
      setZip(address.country === 'US' ? address.postal_code : '');
      setStage('pay');
    } catch {
      setError('We couldn’t reach the payment service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!stripe || !elements || !quote || busy) return;
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;
    setBusy(true);
    setError('');
    try { void sfx.play('card-ding', 0.6); } catch {}
    const { error: payError, paymentIntent } = await stripe.confirmCardPayment(quote.clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: quote.name,
          email: email.trim(),
          address: { postal_code: zip.trim() || undefined },
        },
      },
    });
    setBusy(false);
    if (payError) {
      setError(payError.message || 'That payment could not be completed. Your card was not charged.');
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      setStage('done');
      return;
    }
    setError('Payment not completed. Please try again.');
  };

  const onCardChange = (e: { error?: { message?: string } }) => setError(e.error?.message ?? '');

  const walletOptions = useMemo<StripeElementsOptions>(
    () => ({ appearance: ELEMENTS_OPTIONS.appearance, mode: 'payment', amount: unitCents, currency: 'usd' }),
    [unitCents],
  );

  if (stage === 'done') {
    return (
      <div className={styles.shell}>
        <h2 className={styles.title}>Order placed ♡</h2>
        <p className={styles.subtitle}>
          {item.name}{quantity > 1 ? ` ×${quantity}` : ''} is on its way.
          {email ? <><br />Your receipt is headed to {email.trim()}.</> : null}
        </p>
        <button type="button" className={styles.primary} onClick={() => { click(); onClose(); }}>
          Back to the Heartverse
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.amountBlock}>
        <p className={styles.amountCaption}>
          {item.name}{color ? ` · ${color}` : ''}
        </p>
        <p className={styles.amountLine}>{usd(stage === 'pay' && quote ? quote.totalCents : unitCents * quantity)}</p>
      </div>

      {/* Details — kept mounted (hidden) while paying so Back keeps the address */}
      <div style={{ display: stage === 'details' ? 'contents' : 'none' }}>
        <Elements stripe={stripePromiseForWallet} options={walletOptions}>
          <WalletPanel
            item={item}
            quantity={quantity}
            color={color}
            onPaid={(walletEmail) => { if (walletEmail) setEmail(walletEmail); setStage('done'); }}
            onError={setError}
          />
        </Elements>

        <div className={styles.cardGroup}>
          <span className={styles.cardLabel}>Quantity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className={styles.back}
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => { click(); setQuantity((q) => Math.max(1, q - 1)); }}
            >
              −
            </button>
            <span style={{ minWidth: '1.5rem', textAlign: 'center', fontWeight: 700 }}>{quantity}</span>
            <button
              type="button"
              className={styles.back}
              aria-label="Increase quantity"
              disabled={quantity >= MERCH_MAX_QTY}
              onClick={() => { click(); setQuantity((q) => Math.min(MERCH_MAX_QTY, q + 1)); }}
            >
              +
            </button>
          </div>
        </div>

        <label className={styles.cardGroup}>
          <span className={styles.cardLabel}>Email for receipt</span>
          <input
            className={styles.cardZip}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <div className={styles.cardGroup} style={{ textAlign: 'left' }}>
          <span className={styles.cardLabel}>Shipping address</span>
          <AddressElement options={{ mode: 'shipping' }} />
        </div>

        {stage === 'details' && error ? <p className={styles.fieldError}>{error}</p> : null}
        <button type="button" className={styles.primary} disabled={!elements || busy} onClick={continueToPay}>
          {busy ? 'One sec…' : 'Continue to payment'}
        </button>
      </div>

      {stage === 'pay' && quote ? (
        <div className={styles.methodPanel}>
          <div className={styles.cardGroup} style={{ gap: '0.2rem' }}>
            <span className={styles.cardLabel}>Subtotal: {usd(quote.subtotalCents)}</span>
            <span className={styles.cardLabel}>Sales tax: {usd(quote.taxCents)}</span>
            <span className={styles.cardLabel}>Shipping: Free</span>
          </div>

          <label className={styles.cardGroup}>
            <span className={styles.cardLabel}>Card number</span>
            <div className={styles.cardField}>
              <CardNumberElement onChange={onCardChange} options={{ style: CARD_ELEMENT_STYLE, placeholder: '1234 1234 1234 1234' }} />
            </div>
          </label>
          <div className={styles.cardRow}>
            <label className={styles.cardGroup}>
              <span className={styles.cardLabel}>Expiry date</span>
              <div className={styles.cardField}>
                <CardExpiryElement onChange={onCardChange} options={{ style: CARD_ELEMENT_STYLE }} />
              </div>
            </label>
            <label className={styles.cardGroup}>
              <span className={styles.cardLabel}>CVC</span>
              <div className={styles.cardField}>
                <CardCvcElement onChange={onCardChange} options={{ style: CARD_ELEMENT_STYLE }} />
              </div>
            </label>
          </div>
          <label className={styles.cardGroup}>
            <span className={styles.cardLabel}>Billing ZIP code</span>
            <input
              className={styles.cardZip}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={10}
              placeholder="12345"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^\dA-Za-z -]/g, ''))}
            />
          </label>

          {error ? <p className={styles.fieldError}>{error}</p> : null}
          <button type="button" className={styles.primary} disabled={!stripe || busy} onClick={pay}>
            {busy ? 'Processing…' : `Pay ${usd(quote.totalCents)}`}
          </button>
          <button
            type="button"
            className={styles.back}
            disabled={busy}
            onClick={() => { click(); setError(''); setStage('details'); }}
          >
            ← Edit order details
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MerchCheckout(props: {
  item: MerchCheckoutItem;
  color?: string | null;
  defaultEmail?: string | null;
  onClose: () => void;
}) {
  const promise = useMemo(getStripePromise, []);
  return (
    <div className={`${styles.embed} ${styles.merchCompact}`}>
      <Elements stripe={promise} options={ELEMENTS_OPTIONS}>
        <CheckoutFlow {...props} />
      </Elements>
    </div>
  );
}
