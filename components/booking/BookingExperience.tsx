"use client";

import React, { useEffect, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK || "chxndler-studio/song";
const DEFAULT_ACCENT = "#FC54AF"; // same generic CHXNDLER default used across brand-pitch fallbacks
const PAGE_BG = "#F8F7F4";

type BookingResult = {
  /** ISO start time, straight from Cal.com's own event payload — never computed by us. */
  startTime: string | null;
  durationMinutes: number | null;
  meetingUrl: string | null;
};

/** Cal.com's `bookingSuccessful` embed event payload isn't strictly typed by
 * the SDK — pull out only the fields we can find, defensively, rather than
 * assume a fixed shape (and never invent a value that isn't actually there). */
function readBookingResult(detail: unknown): BookingResult {
  const d = (detail as any)?.data ?? {};
  const booking = d?.booking ?? {};

  const startTime =
    typeof d?.date === "string"
      ? d.date
      : typeof booking?.startTime === "string"
        ? booking.startTime
        : null;

  const durationMinutes = typeof d?.duration === "number" ? d.duration : null;

  const meetingUrl =
    typeof booking?.metadata?.videoCallUrl === "string"
      ? booking.metadata.videoCallUrl
      : typeof booking?.location === "string" && /^https?:\/\//.test(booking.location)
        ? booking.location
        : null;

  return { startTime, durationMinutes, meetingUrl };
}

export default function BookingExperience({
  brandName,
  brandSlug,
  accentColor,
}: {
  brandName: string | null;
  brandSlug: string | null;
  accentColor: string | null;
}) {
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const accent = accentColor || DEFAULT_ACCENT;

  useEffect(() => {
    // globals.css hardcodes `html, body { background: #020016 }` (the dark
    // Heartverse site canvas). Because <html> itself has an explicit
    // background, the browser paints ITS color for the scrollable canvas —
    // overriding body alone isn't enough. The Cal.com iframe also resizes
    // itself dynamically (its final height isn't knowable from our own
    // CSS), so the safest fix is both root elements rather than trying to
    // out-guess the iframe's layout. Restored on unmount.
    const previousHtmlBg = document.documentElement.style.backgroundColor;
    const previousBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = PAGE_BG;
    document.body.style.backgroundColor = PAGE_BG;
    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBg;
      document.body.style.backgroundColor = previousBodyBg;
    };
  }, []);

  useEffect(() => {
    (async function configureCal() {
      const cal = await getCalApi({});
      cal("ui", {
        theme: "light",
        hideEventTypeDetails: true,
        layout: "month_view",
        styles: { branding: { brandColor: accent } },
      });
      cal("on", {
        action: "bookingSuccessful",
        callback: (e) => setBooking(readBookingResult((e as CustomEvent).detail)),
      });
    })();
    // Only the accent color can meaningfully change between mounts (a
    // different brand); the embed itself is keyed by CAL_LINK, which is
    // static configuration, not per-request state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent]);

  const eyebrow = brandName ? `CHXNDLER × ${brandName.toUpperCase()}` : "CHXNDLER STUDIO";
  const backHref = brandSlug ? `/brands/${brandSlug}` : "/";

  return (
    <div
      className="min-h-[100svh] w-full overflow-x-hidden flex items-center justify-center px-[20px] sm:px-[24px] xl:px-[40px] py-[48px]"
      style={{ backgroundColor: PAGE_BG, color: "#111111" }}
    >
      <div className="w-full max-w-[1280px] mx-auto grid grid-cols-1 xl:grid-cols-[38%_62%] gap-y-[48px] xl:gap-x-[72px] items-center">
        {/* LEFT — intro, always present, never fights for space with the scheduler */}
        <div className="flex flex-col justify-center">
          <div className="max-w-[28rem]">
            <p
              className="text-[0.75rem] sm:text-[0.8125rem] font-semibold tracking-[0.3em] uppercase mb-[1.5rem]"
              style={{ color: accent }}
            >
              {eyebrow}
            </p>

            <h1 className="font-bold leading-[1.05] tracking-tight text-[2.25rem] sm:text-[2.875rem] xl:text-[3.25rem]">
              LET'S MAKE SOMETHING
              <br />
              PEOPLE REMEMBER.
            </h1>

            <p className="mt-[1.5rem] text-[1.0625rem] leading-relaxed opacity-75">
              Pick a time that works for you. We'll talk through the idea, your brand, and where the song could go
              next.
            </p>

            <div className="mt-[2.5rem] flex flex-wrap items-center gap-[0.75rem] text-[0.75rem] font-semibold tracking-[0.2em] uppercase opacity-60">
              <span>30 min</span>
              <span aria-hidden="true">•</span>
              <span>Creative Intro Call</span>
              <span aria-hidden="true">•</span>
              <span>Video Call</span>
            </div>
          </div>
        </div>

        {/* RIGHT — the scheduling experience itself, or the confirmation state once booked */}
        <div className="relative w-full flex justify-center xl:justify-end">
          {/* extremely subtle brand-accent wash behind the card — barely noticeable */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-6 -inset-y-6 xl:-inset-16 opacity-[0.07] blur-3xl"
            style={{ background: `radial-gradient(closest-side, ${accent}, transparent 72%)` }}
          />

          <div
            className="relative w-full xl:max-w-[45rem] min-h-[37.5rem] rounded-[22px] border overflow-hidden flex flex-col"
            style={{
              backgroundColor: "#ffffff",
              borderColor: "rgba(17,17,17,0.08)",
              boxShadow: "0 30px 80px -30px rgba(17,17,17,0.18), 0 8px 24px -12px rgba(17,17,17,0.08)",
            }}
          >
            {booking ? (
              <BookingConfirmation booking={booking} brandName={brandName} accent={accent} backHref={backHref} />
            ) : (
              <div className="w-full h-full flex-1 min-h-[37.5rem]">
                <Cal
                  calLink={CAL_LINK}
                  style={{ width: "100%", height: "100%", minHeight: "37.5rem", overflow: "auto" }}
                  config={
                    brandName
                      ? { theme: "light", notes: `Referred from CHXNDLER brand pitch: ${brandName} (${brandSlug})` }
                      : { theme: "light" }
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingConfirmation({
  booking,
  brandName,
  accent,
  backHref,
}: {
  booking: BookingResult;
  brandName: string | null;
  accent: string;
  backHref: string;
}) {
  const startDate = booking.startTime ? new Date(booking.startTime) : null;
  const dateLabel =
    startDate && !isNaN(startDate.getTime())
      ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(startDate)
      : null;
  const timeLabel =
    startDate && !isNaN(startDate.getTime())
      ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(startDate)
      : null;

  return (
    <div className="flex-1 flex flex-col justify-center max-w-[28rem] mx-auto px-[2rem] sm:px-[3rem] py-[3rem]">
      <div
        aria-hidden="true"
        className="flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full mb-[1.5rem]"
        style={{ backgroundColor: `${accent}1a` }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1.5 7L6.5 12L16.5 1.5"
            stroke={accent}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="text-[0.75rem] font-semibold tracking-[0.3em] uppercase mb-[1rem]" style={{ color: accent }}>
        {brandName ? `CHXNDLER × ${brandName.toUpperCase()}` : "CHXNDLER STUDIO"}
      </p>
      <h2 className="font-bold leading-[1.05] tracking-tight text-[2.25rem] sm:text-[2.75rem]">
        YOU'RE BOOKED
        <br />
        CAN'T WAIT TO TALK.
      </h2>
      <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed opacity-75">
        Your meeting is confirmed. Check your inbox for the calendar invite and video-call details.
      </p>

      {(dateLabel || timeLabel) && (
        <div className="mt-[2.5rem] flex flex-col gap-[1rem]">
          {dateLabel && (
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-[0.2em] uppercase opacity-50">Date</p>
              <p className="text-[1.0625rem] font-semibold">{dateLabel}</p>
            </div>
          )}
          {timeLabel && (
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-[0.2em] uppercase opacity-50">Time</p>
              <p className="text-[1.0625rem] font-semibold">{timeLabel}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-[2.5rem] flex flex-wrap items-center gap-[1.5rem]">
        {booking.meetingUrl && (
          <a
            href={booking.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full px-[2rem] py-[1rem] text-[0.875rem] font-bold tracking-[0.08em] uppercase text-white transition-transform hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: accent }}
          >
            Join Meeting
          </a>
        )}
        <a
          href={backHref}
          className="text-[0.875rem] font-semibold tracking-[0.04em] uppercase underline underline-offset-4 opacity-70 hover:opacity-100 transition-opacity"
        >
          Back to CHXNDLER
        </a>
      </div>
    </div>
  );
}
