// Compact data source for in-person (IRL) shows
// Add upcoming events here. Keep the array sorted by date (soonest first)
// or leave unsorted—`getNextIrlShow` finds the nearest future event.

export type IrlShow = {
  // ISO date string. Prefer full date (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  // If time is omitted, it is treated as local midnight.
  date: string;
  // Venue or event name (keep short for mobile)
  venue: string;
  // Optional title override for lists (e.g., 'Open Mic (Hosted by CHXNDLER)')
  title?: string;
  // City, ST or concise location label
  location?: string;
  // Optional signal type label for UI (e.g. 'LIVE SHOW', 'MEETUP')
  signalType?: string;
  // Optional custom date text for display (e.g. '4/23/26')
  displayDate?: string;
  // Optional custom time text for display (e.g. '7–9 PM')
  timeLabel?: string;
  // Optional CTA URL for more details or tickets
  url?: string;
};

export const irlShows: IrlShow[] = [
  // Added by request
  {
    date: '2026-04-23T19:00:00-04:00',
    venue: 'Denizen Open Mic',
    title: 'Open Mic (Hosted by CHXNDLER)',
    location: '123 Melrose St, Brooklyn, NY 11206',
    signalType: 'FREE SHOW',
    displayDate: '4/23/26',
    timeLabel: '7–9 PM',
  },
  {
    date: '2026-03-27T18:00:00-04:00',
    venue: 'Bethesda Terrace Arcade',
    location: 'Central Park, NYC',
    signalType: 'FREE SHOW',
    displayDate: '3/27/26',
    timeLabel: '6–7 PM',
  },
];

/** Returns the nearest future IRL show (>= now), or null if none. */
export function getNextIrlShow(now: Date = new Date()): (IrlShow & { dateObj: Date }) | null {
  const nowMs = now.getTime();
  let best: (IrlShow & { dateObj: Date }) | null = null;

  for (const ev of irlShows) {
    const d = new Date(ev.date);
    if (isNaN(d.getTime())) continue;
    const ms = d.getTime();
    if (ms >= nowMs) {
      if (!best || ms < best.dateObj.getTime()) {
        best = { ...ev, dateObj: d };
      }
    }
  }

  return best;
}
