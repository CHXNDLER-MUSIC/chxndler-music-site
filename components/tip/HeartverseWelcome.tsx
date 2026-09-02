'use client';

import { useEffect, useRef, useState } from 'react';
import { trackTipEvent } from '@/lib/tip/analytics';
import { HOMEPAGE_WARP_FLAG } from '@/lib/tip/constants';
import { sfx } from '@/lib/sfx';
import StartButton from '@/components/StartButton';
import styles from './tip.module.css';

/**
 * Post-payment warp screen. Shows automatically the instant a tip is confirmed
 * (TipExperience switches to the 'heartverse' stage) — no intermediate button
 * to start the transition.
 *
 * Background: the site's real light-speed clip (/skies/lightspeed.mp4, the same
 * asset the homepage warp uses) + warp.mp3 via the shared SFX bus.
 * Focal element: the exact homepage blue circular START button (StartButton).
 *
 * Clicking START arms the homepage's existing warp flag and hard-navigates to
 * "/", where DashboardApp reads the flag on mount and runs the real
 * handleStartClick() warp/entry sequence into the main site. It never routes
 * back into /tip.
 */
export default function HeartverseWelcome() {
  const [leaving, setLeaving] = useState(false);
  const firedView = useRef(false);

  useEffect(() => {
    if (firedView.current) return;
    firedView.current = true;
    void trackTipEvent('heartverse_welcome_viewed');
    void sfx.play('warp', 0.6);
  }, []);

  const handleStart = async () => {
    if (leaving) return;
    setLeaving(true);

    // Record intent, but never let a slow beacon hold the door shut.
    await Promise.race([
      trackTipEvent('heartverse_enter_clicked'),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);

    try {
      // Same mechanism the auth callback uses: DashboardApp reads this on mount
      // and fires the real homepage START warp.
      sessionStorage.setItem(HOMEPAGE_WARP_FLAG, '1');
    } catch {}

    // Hard navigation so DashboardApp mounts fresh and picks up the flag.
    window.location.assign('/');
  };

  return (
    <div className={styles.warpScreen}>
      <video
        className={styles.warpVideo}
        src="/skies/lightspeed.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className={styles.warpVignette} aria-hidden="true" />

      <div className={styles.warpContent}>
        <h1 className={styles.hvWelcome}>
          Welcome to the
          <br />
          Heartverse
        </h1>
        <StartButton
          onClick={handleStart}
          size={150}
          ariaLabel="Enter the Heartverse"
        />
      </div>
    </div>
  );
}
