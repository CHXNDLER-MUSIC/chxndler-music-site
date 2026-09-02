'use client';

import styles from './tip.module.css';
import TipVenmoButton from './TipVenmoButton';

export default function TipError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.shell}>
      <h1 className={styles.errorTitle}>Signal Lost</h1>
      <p className={styles.errorBody}>
        {message || 'Something interrupted the payment. Your card was not charged.'}
      </p>
      <button type="button" className={styles.primary} onClick={onRetry}>
        Try Again
      </button>
      <div className={styles.divider}>or</div>
      <TipVenmoButton />
    </div>
  );
}
