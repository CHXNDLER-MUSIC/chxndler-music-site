import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import React, { Suspense } from 'react';

type IrlRow = {
  title: string | null;
  location: string | null;
  date: string; // timestamptz
  cost: string | null;
  directions: string | null;
  tickets_url: string | null;
};

function formatDate(dateIso: string) {
  const d = new Date(dateIso);
  const md = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(d);
  const tm = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);
  return `${md} • ${tm}`;
}

export async function NextIrlSignal() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op for render path
        },
      },
    }
  );

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('irl_shows')
    .select('title, location, date, cost, directions, tickets_url')
    .gte('date', nowIso)
    .order('date', { ascending: true })
    .limit(1);

  if (error) {
    return (
      <div style={{
        border: '1px solid rgba(255, 85, 85, 0.45)',
        background: 'linear-gradient(180deg, rgba(60,0,0,0.35), rgba(0,0,0,0.6))',
        color: 'rgba(255,255,255,0.85)',
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 0 18px rgba(255,0,0,0.15)'
      }}>
        Unable to load IRL SIGNAL
      </div>
    );
  }

  const row: IrlRow | undefined = Array.isArray(data) && data.length > 0 ? (data[0] as IrlRow) : undefined;

  if (!row) {
    return (
      <div style={{
        border: '1px dashed rgba(0,255,255,0.35)',
        background: 'radial-gradient(100% 60% at 50% 0%, rgba(0,255,255,0.08) 0%, rgba(0,0,0,0) 70%)',
        color: 'rgba(255,255,255,0.85)',
        borderRadius: 12,
        padding: 14,
        textAlign: 'center',
      }}>
        No upcoming IRL SIGNAL
      </div>
    );
  }

  const title = row.title || row.location || 'IRL Signal';
  const when = formatDate(row.date);
  const cost = row.cost || '';
  const directions = row.directions || '';
  const tickets = row.tickets_url || '';

  return (
    <div style={{
      width: '100%',
      border: '1px solid rgba(0,255,255,0.35)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 0 18px rgba(0,255,255,0.18)'
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        background: 'linear-gradient(90deg, rgba(252,84,175,0.12), rgba(0,255,255,0.12))',
        borderBottom: '1px solid rgba(0,255,255,0.25)'
      }}>
        <div style={{
          fontFamily: "'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',monospace",
          letterSpacing: '0.18em',
          fontSize: 11,
          color: '#FC54AF',
          textShadow: '0 0 10px rgba(252,84,175,0.9)'
        }}>
          ● NEXT IRL SIGNAL
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 12, background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
              </svg>
            </span>
            <strong style={{ color: '#fff', letterSpacing: '0.04em' }}>Title:</strong>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</span>
          </div>
          {row.location && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                  <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
                </svg>
              </span>
              <strong style={{ color: '#fff', letterSpacing: '0.04em' }}>Location:</strong>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>{row.location}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.6"/>
                <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </span>
            <strong style={{ color: '#fff', letterSpacing: '0.04em' }}>When:</strong>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{when}</span>
          </div>
          {cost && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.6"/>
                  <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </span>
              <strong style={{ color: '#fff', letterSpacing: '0.04em' }}>Cost:</strong>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>{cost}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 7, border: '1px solid #FC54AF',
                  background: 'rgba(252,84,175,0.10)', color: '#FC54AF',
                  textDecoration: 'none', fontWeight: 700, padding: '6px 10px',
                  fontSize: 12,
                  boxShadow: '0 0 10px rgba(252,84,175,0.25)'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                    <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
                  </svg>
                  <span>Get Directions</span>
                </span>
              </a>
            )}
            {tickets && (
              <a
                href={tickets}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 7, border: '1px solid #F2EF1D',
                  background: 'rgba(242,239,29,0.10)', color: '#F2EF1D',
                  textDecoration: 'none', fontWeight: 700, padding: '6px 10px',
                  fontSize: 12,
                  boxShadow: '0 0 10px rgba(242,239,29,0.25)'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.6"/>
                    <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  <span>Get Tickets</span>
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NextIrlSignalSkeleton() {
  return (
    <div style={{
      width: '100%',
      border: '1px solid rgba(0,255,255,0.2)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 0 14px rgba(0,255,255,0.12)'
    }}>
      <div style={{ padding: '8px 12px', background: 'linear-gradient(90deg, rgba(252,84,175,0.10), rgba(0,255,255,0.10))', borderBottom: '1px solid rgba(0,255,255,0.2)' }}>
        <div style={{ height: 12, width: 150, background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
      </div>
      <div style={{ padding: 12, background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6))' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2,3].map((k) => (
            <div key={k} style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <div style={{ height: 28, width: 120, background: 'rgba(255,255,255,0.08)', borderRadius: 7 }} />
            <div style={{ height: 28, width: 120, background: 'rgba(255,255,255,0.08)', borderRadius: 7 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Convenience default export for easy Suspense usage
export default function NextIrlSignalWithSuspense() {
  return (
    <Suspense fallback={<NextIrlSignalSkeleton />}> 
      {/* @ts-expect-error Async Server Component */}
      <NextIrlSignal />
    </Suspense>
  );
}

