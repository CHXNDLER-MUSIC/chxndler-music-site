import { NextResponse } from 'next/server';

function pad(n: number) { return String(n).padStart(2, '0'); }

function toUTC(dt: Date) {
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
}

function icsEscape(input: string) {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const titleRaw = url.searchParams.get('title') || '';
  const locationRaw = url.searchParams.get('location') || '';
  const dateIso = url.searchParams.get('date');
  const costRaw = url.searchParams.get('cost') || '';
  const durationMin = Math.max(0, parseInt(url.searchParams.get('durationMin') || '150', 10) || 150);

  if (!dateIso) {
    return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
  }

  const start = new Date(dateIso);
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 });
  }
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const venue = titleRaw || locationRaw || 'IRL Signal';
  const summary = `CHXNDLER LIVE at ${venue}`;
  const cost = costRaw || 'Free';
  const description = [
    'Aliens… welcome to the Heartverse 👽',
    `I’m playing live at ${venue}.`,
    'Songs about love, feeling lost, and finding your community.',
    'Come be part of it.',
    `🎟 ${cost}`,
  ].join('\n');

  const dtstamp = toUTC(new Date());
  const DTSTART = toUTC(start);
  const DTEND = toUTC(end);

  const uid = `irl-${start.getTime()}-${Math.random().toString(36).slice(2)}@chxndler.world`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//chxndler.world//IRL SIGNAL//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${DTSTART}`,
    `DTEND:${DTEND}`,
    `SUMMARY:${icsEscape(summary)}`,
    locationRaw ? `LOCATION:${icsEscape(locationRaw)}` : '',
    `DESCRIPTION:${icsEscape(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Starting Now',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const filenameSafeVenue = venue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'show';
  const res = new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="chxndler-${filenameSafeVenue}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
  return res;
}
