#!/usr/bin/env bash
set -euo pipefail

echo "=== CHXNDLER Supabase Analytics Setup ==="
echo ""

if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this from your Next.js project root (where package.json is)."
  exit 1
fi

echo "Please provide your Supabase project credentials:"
echo "(Get these from: https://supabase.com/dashboard/project/your-project/settings/api)"
echo ""

read -p "🔗 Supabase URL (https://xxxx.supabase.co): " SB_URL
read -p "🔑 Supabase anon key: " SB_ANON
read -p "🔐 Supabase service_role key (server only): " SB_SERVICE

echo ""
echo "📝 Updating .env.local..."

# Create or update .env.local
touch .env.local

# Function to update or add environment variable
update_env_var() {
  local var_name="$1"
  local var_value="$2"
  
  if grep -q "^${var_name}=" .env.local 2>/dev/null; then
    # Variable exists, update it
    sed -i.bak "s|^${var_name}=.*|${var_name}=${var_value}|" .env.local
    echo "  ✓ Updated ${var_name}"
  else
    # Variable doesn't exist, add it
    echo "${var_name}=${var_value}" >> .env.local
    echo "  ✓ Added ${var_name}"
  fi
}

update_env_var "NEXT_PUBLIC_SUPABASE_URL" "${SB_URL}"
update_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${SB_ANON}"
update_env_var "SUPABASE_SERVICE_ROLE" "${SB_SERVICE}"

echo ""
echo "📦 Installing @supabase/supabase-js..."
npm install @supabase/supabase-js

echo ""
echo "📁 Creating directory structure..."
mkdir -p lib app/api/track

echo ""
echo "📄 Creating Supabase client files..."

# Create lib/supabase-browser.ts
cat > lib/supabase-browser.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
EOF

# Create lib/supabase-admin.ts
cat > lib/supabase-admin.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  { auth: { persistSession: false } }
);
EOF

# Create lib/analytics.ts
cat > lib/analytics.ts << 'EOF'
const KEY = 'chx_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11 as any).replace(/[018]/g, (c: string) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    );
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function track(
  event_type: string,
  data: { page?: string; referrer?: string; song_slug?: string; payload?: any } = {}
) {
  if (typeof window === 'undefined') return;

  const session_id = getOrCreateSessionId();
  const page = data.page || window.location.pathname + window.location.search;
  const referrer = data.referrer || document.referrer || '';

  fetch('/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      session_id,
      event_type,
      page,
      referrer,
      song_slug: data.song_slug,
      payload: data.payload ?? null,
    }),
  }).catch(() => {});
}

export function trackPageView() {
  track('page_view');
}

// Music-specific tracking functions
export function trackSongSelected(song_slug: string, song_title?: string) {
  track('song_selected', { 
    song_slug, 
    payload: { song_title } 
  });
}

export function trackCoverArtClicked(song_slug: string, song_title?: string) {
  track('cover_art_clicked', { 
    song_slug, 
    payload: { song_title } 
  });
}

export function trackSongHovered(song_slug: string, hover_method?: string) {
  track('song_hovered', { 
    song_slug, 
    payload: { hover_method } 
  });
}

export function trackMusicStarted() {
  track('music_started');
}
EOF

# Create app/api/track/route.ts
cat > app/api/track/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

type Body = {
  session_id: string;
  event_type: string;
  page?: string;
  referrer?: string;
  song_slug?: string;
  payload?: Record<string, any>;
  user_agent?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.session_id || !body?.event_type) {
      return NextResponse.json({ error: 'Missing session_id or event_type' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.ip || '0.0.0.0';
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const user_agent = body.user_agent || req.headers.get('user-agent') || 'unknown';

    const { error: rpcError } = await supabaseAdmin.rpc('touch_session', {
      p_session_id: body.session_id,
      p_user_agent: user_agent,
      p_ip_hash: ip_hash,
    });
    if (rpcError) console.error('touch_session error:', rpcError);

    const { error } = await supabaseAdmin
      .from('analytics.events')
      .insert({
        session_id: body.session_id,
        event_type: body.event_type,
        page: body.page?.slice(0, 512),
        referrer: body.referrer?.slice(0, 512),
        song_slug: body.song_slug?.slice(0, 128),
        payload: body.payload ?? null,
      });

    if (error) {
      console.error('Insert event error:', error);
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
EOF

# Create SUPABASE_SETUP.sql
cat > SUPABASE_SETUP.sql << 'EOF'
create schema if not exists analytics;

create table if not exists analytics.sessions (
  session_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

create table if not exists analytics.events (
  id bigserial primary key,
  happened_at timestamptz not null default now(),
  session_id uuid not null,
  event_type text not null check (length(event_type) <= 64),
  page text,
  referrer text,
  song_slug text,
  payload jsonb,
  constraint fk_session
    foreign key (session_id) references analytics.sessions(session_id) on delete cascade
);

create table if not exists analytics.songs (
  slug text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_happened_at on analytics.events (happened_at desc);
create index if not exists idx_events_session on analytics.events (session_id);
create index if not exists idx_events_event_type on analytics.events (event_type);
create index if not exists idx_events_song_slug on analytics.events (song_slug);

alter table analytics.sessions enable row level security;
alter table analytics.events enable row level security;

create policy "allow_insert_sessions_anon"
  on analytics.sessions for insert to anon with check (true);
create policy "deny_select_sessions_anon"
  on analytics.sessions for select to anon using (false);

create policy "allow_insert_events_anon"
  on analytics.events for insert to anon with check (true);
create policy "deny_select_events_anon"
  on analytics.events for select to anon using (false);

create or replace function analytics.touch_session(p_session_id uuid, p_user_agent text, p_ip_hash text)
returns void
language plpgsql
security definer
as $$
begin
  insert into analytics.sessions (session_id, user_agent, ip_hash)
  values (p_session_id, p_user_agent, p_ip_hash)
  on conflict (session_id) do update
    set last_seen = now(),
        user_agent = coalesce(excluded.user_agent, analytics.sessions.user_agent),
        ip_hash = coalesce(excluded.ip_hash, analytics.sessions.ip_hash);
end;
$$;

create or replace view analytics.v_events_7d as
select *
from analytics.events
where happened_at >= now() - interval '7 days';

-- Helpful views for analytics queries
create or replace view analytics.v_song_stats as
select 
  song_slug,
  count(*) as total_events,
  count(distinct session_id) as unique_sessions,
  count(*) filter (where event_type = 'song_selected') as selections,
  count(*) filter (where event_type = 'cover_art_clicked') as cover_clicks,
  count(*) filter (where event_type = 'song_hovered') as hovers
from analytics.events 
where song_slug is not null
group by song_slug
order by total_events desc;

create or replace view analytics.v_daily_stats as
select 
  date(happened_at) as date,
  count(*) as total_events,
  count(distinct session_id) as unique_sessions,
  count(*) filter (where event_type = 'page_view') as page_views,
  count(*) filter (where event_type = 'song_selected') as song_selections
from analytics.events
group by date(happened_at)
order by date desc;
EOF

echo "  ✓ lib/supabase-browser.ts"
echo "  ✓ lib/supabase-admin.ts" 
echo "  ✓ lib/analytics.ts"
echo "  ✓ app/api/track/route.ts"
echo "  ✓ SUPABASE_SETUP.sql"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. 🗃️  Setup Database:"
echo "   - Open your Supabase Dashboard: ${SB_URL/https:\/\//https://supabase.com/dashboard/project/}"
echo "   - Go to SQL Editor"
echo "   - Copy and paste the contents of SUPABASE_SETUP.sql"
echo "   - Click 'Run' to create the database schema"
echo ""
echo "2. 🧪 Test Analytics:"
echo "   - Start your app: npm run dev"
echo "   - Add tracking to any component:"
echo ""
echo "   import { trackPageView, trackSongSelected } from '@/lib/analytics';"
echo "   import { useEffect } from 'react';"
echo ""
echo "   export default function MyComponent() {"
echo "     useEffect(() => trackPageView(), []);"
echo "     return <button onClick={() => trackSongSelected('song-slug')}>Track Me</button>;"
echo "   }"
echo ""
echo "3. 📊 View Data:"
echo "   - Check Supabase Dashboard > Table Editor > analytics schema"
echo "   - Query examples:"
echo "     SELECT * FROM analytics.v_song_stats;"
echo "     SELECT * FROM analytics.v_daily_stats;"
echo ""
echo "🔒 Your analytics data is now stored securely in Supabase and won't reset on deployments!"