"use client";

// The "LET'S TALK" scheduler, embedded directly in the CTA section's own
// page flow — no fixed-position overlay, no dark backdrop. Clicking the
// button expands this panel in place (the section grows taller), keeping the
// visitor on the pitch page without ever covering it. Same Cal.com
// embed/config as the standalone /book route (kept around for
// direct/shareable links, e.g. from an email).
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Cal, { getCalApi } from "@calcom/embed-react";

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK || "chxndler-studio/song";

type BookingResult = {
  startTime: string | null;
  meetingUrl: string | null;
};

/** Cal.com's `bookingSuccessful` embed event payload isn't strictly typed by
 * the SDK — pull out only the fields we can find, defensively. */
function readBookingResult(detail: unknown): BookingResult {
  const d = (detail as any)?.data ?? {};
  const booking = d?.booking ?? {};
  const startTime =
    typeof d?.date === "string" ? d.date : typeof booking?.startTime === "string" ? booking.startTime : null;
  const meetingUrl =
    typeof booking?.metadata?.videoCallUrl === "string"
      ? booking.metadata.videoCallUrl
      : typeof booking?.location === "string" && /^https?:\/\//.test(booking.location)
        ? booking.location
        : null;
  return { startTime, meetingUrl };
}

export default function BookingInline({
  open,
  brandName,
  brandSlug,
  accentColor,
}: {
  open: boolean;
  brandName: string | null;
  brandSlug: string | null;
  accentColor: string;
}) {
  const reduceMotion = useReducedMotion();
  const [booking, setBooking] = useState<BookingResult | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let cal: Awaited<ReturnType<typeof getCalApi>> | null = null;
    const onBookingSuccessful = (e: Event) => setBooking(readBookingResult((e as CustomEvent).detail));

    (async function configureCal() {
      const api = await getCalApi({});
      if (cancelled) return;
      cal = api;
      cal("ui", {
        theme: "light",
        hideEventTypeDetails: true,
        layout: "month_view",
        styles: { branding: { brandColor: accentColor } },
      });
      cal("on", { action: "bookingSuccessful", callback: onBookingSuccessful });
    })();

    // Each open registers a fresh listener on the Cal.com embed's own
    // long-lived action-manager singleton — without this, reopening the
    // panel would stack another "bookingSuccessful" handler every time
    // instead of replacing it.
    return () => {
      cancelled = true;
      cal?.("off", { action: "bookingSuccessful", callback: onBookingSuccessful });
    };
  }, [open, accentColor]);

  const dateLabel =
    booking?.startTime && !isNaN(new Date(booking.startTime).getTime())
      ? new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date(booking.startTime))
      : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full overflow-hidden"
        >
          <div
            className="mt-[2.5rem] w-full max-w-[64rem] mx-auto rounded-[1.375rem] overflow-hidden text-left"
            style={{ backgroundColor: "#ffffff", color: "#111111", boxShadow: "0 1.875rem 5rem -1.875rem rgba(17,17,17,0.4)" }}
          >
            {booking ? (
              <div className="min-h-[25rem] flex flex-col justify-center px-[2rem] sm:px-[3rem] py-[3rem]">
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full mb-[1.5rem]"
                  style={{ backgroundColor: `${accentColor}1a` }}
                >
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M1.5 7L6.5 12L16.5 1.5"
                      stroke={accentColor}
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-[0.75rem] font-semibold tracking-[0.3em] uppercase mb-[1rem]" style={{ color: accentColor }}>
                  {brandName ? `CHXNDLER × ${brandName.toUpperCase()}` : "CHXNDLER STUDIO"}
                </p>
                <h2 className="font-bold leading-[1.05] tracking-tight text-[1.75rem] sm:text-[2.25rem]">
                  YOU'RE BOOKED. CAN'T WAIT TO TALK.
                </h2>
                <p className="mt-[1rem] text-[1rem] leading-relaxed opacity-75">
                  Check your inbox for the calendar invite and video-call details.
                </p>
                {dateLabel && <p className="mt-[1.5rem] text-[1rem] font-semibold">{dateLabel}</p>}
                {booking.meetingUrl && (
                  <div className="mt-[2rem]">
                    <a
                      href={booking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full px-[1.75rem] py-[0.9rem] text-[0.8125rem] font-bold tracking-[0.08em] uppercase text-white transition-transform hover:scale-[1.03] active:scale-95"
                      style={{ backgroundColor: accentColor }}
                    >
                      Join Meeting
                    </a>
                  </div>
                )}
              </div>
            ) : (
              // No max-height/scroll clamp here on purpose: at this width
              // Cal renders its calendar-left/times-right layout, which is
              // naturally short — clamping height was only ever masking the
              // narrow-container stacked layout, not fixing it.
              <div className="w-full">
                <Cal
                  calLink={CAL_LINK}
                  style={{ width: "100%" }}
                  config={
                    brandName
                      ? { theme: "light", notes: `Referred from CHXNDLER brand pitch: ${brandName} (${brandSlug})` }
                      : { theme: "light" }
                  }
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
