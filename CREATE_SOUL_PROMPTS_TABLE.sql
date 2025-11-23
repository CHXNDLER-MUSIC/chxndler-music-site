-- Soul prompts table for storing spiritual reflections and intentions
create table if not exists public.soul_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_type text not null check (prompt_type in ('intention', 'reflection')),
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists soul_prompts_type_element_idx
  on public.soul_prompts (prompt_type, element);

-- Enable RLS for soul_prompts
alter table public.soul_prompts enable row level security;

-- Allow anonymous users to read soul prompts (they're meant to be public)
create policy "allow_soul_prompts_select_anon"
  on public.soul_prompts for select to anon
  using (true);

-- Allow authenticated users to read soul prompts
create policy "allow_soul_prompts_select_authenticated"
  on public.soul_prompts for select to authenticated
  using (true);

-- ================================================
--                 HEART INTENTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('intention', 'heart', 'What is one gentle way I can show myself love today?'),
('intention', 'heart', 'How can I lead with softness instead of fear?'),
('intention', 'heart', 'What part of my heart needs warmth right now?'),
('intention', 'heart', 'Where can I practice patience with myself today?'),
('intention', 'heart', 'How can I open my heart without losing my boundaries?'),
('intention', 'heart', 'Who in my life needs to feel appreciated today?'),
('intention', 'heart', 'What does loving myself look like in small actions?'),
('intention', 'heart', 'How can I choose compassion over judgment today?'),
('intention', 'heart', 'Where can I allow myself to feel joy?'),
('intention', 'heart', 'What truth in my heart wants to be spoken today?'),
('intention', 'heart', 'Where can I be kinder to myself right now?'),
('intention', 'heart', 'How can I create a moment of emotional safety?'),
('intention', 'heart', 'What would my heart choose if it had no fear?');

-- ================================================
--                 HEART REFLECTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('reflection', 'heart', 'Where did love show up for me today?'),
('reflection', 'heart', 'Did I speak to myself with kindness today?'),
('reflection', 'heart', 'What emotion sat closest to my chest today?'),
('reflection', 'heart', 'What moment felt like warmth to me today?'),
('reflection', 'heart', 'Where did my heart feel protected or exposed?'),
('reflection', 'heart', 'What love did I give freely today?'),
('reflection', 'heart', 'What made my heart feel heavy or light today?'),
('reflection', 'heart', 'Did I let myself feel what I needed to feel?'),
('reflection', 'heart', 'Where did I practice compassion today?'),
('reflection', 'heart', 'What did my heart whisper to me today?'),
('reflection', 'heart', 'Where did I choose connection over avoidance?'),
('reflection', 'heart', 'What healed me today, even a little?');

-- ================================================
--                 WATER INTENTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('intention', 'water', 'How can I let my emotions move instead of holding them back?'),
('intention', 'water', 'What would it look like to flow instead of force today?'),
('intention', 'water', 'Where can I allow softness into my day?'),
('intention', 'water', 'How can I meet myself with honesty and fluidity?'),
('intention', 'water', 'What emotional truth wants to surface today?'),
('intention', 'water', 'Where can I surrender control and trust the current?'),
('intention', 'water', 'How can I create calm within myself today?'),
('intention', 'water', 'What am I resisting that I could instead allow?'),
('intention', 'water', 'Where can I bring gentleness into a tense part of my life?'),
('intention', 'water', 'What emotion deserves attention instead of avoidance?'),
('intention', 'water', 'How can I nurture my inner world today?'),
('intention', 'water', 'What does emotional balance look like for me today?'),
('intention', 'water', 'How can I let go of something small today?');

-- ================================================
--                 WATER REFLECTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('reflection', 'water', 'What emotions flowed through me today?'),
('reflection', 'water', 'Where did I resist what I should have allowed?'),
('reflection', 'water', 'What helped me feel calm today?'),
('reflection', 'water', 'Where did I feel emotionally supported?'),
('reflection', 'water', 'What truth surfaced for me today?'),
('reflection', 'water', 'What did I release today, big or small?'),
('reflection', 'water', 'Where did I feel emotionally stuck today?'),
('reflection', 'water', 'What moment today felt like a gentle wave?'),
('reflection', 'water', 'Where did I feel overwhelmed, and why?'),
('reflection', 'water', 'What helped me reconnect with myself today?'),
('reflection', 'water', 'Did I allow myself to feel honestly today?'),
('reflection', 'water', 'Where did I find clarity in my emotions today?');

-- ================================================
--                 LIGHTNING INTENTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('intention', 'lightning', 'Where can I channel my energy with purpose today?'),
('intention', 'lightning', 'What bold action can I take to ignite momentum?'),
('intention', 'lightning', 'What idea sparks excitement in me right now?'),
('intention', 'lightning', 'How can I stand confidently in my truth today?'),
('intention', 'lightning', 'Where can I create movement instead of waiting?'),
('intention', 'lightning', 'What energizes me that I can lean into today?'),
('intention', 'lightning', 'How can I act with clarity and intention?'),
('intention', 'lightning', 'What fear is asking to be challenged today?'),
('intention', 'lightning', 'Where can I choose action over hesitation?'),
('intention', 'lightning', 'What power within me wants expression today?'),
('intention', 'lightning', 'How can I share my creative spark with the world?'),
('intention', 'lightning', 'What boundary do I need to enforce today?'),
('intention', 'lightning', 'Where can I take initiative and lead myself?');

-- ================================================
--                 LIGHTNING REFLECTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('reflection', 'lightning', 'Where did I feel a spark of energy today?'),
('reflection', 'lightning', 'What action made me feel powerful today?'),
('reflection', 'lightning', 'Where did I hesitate when I wanted to move forward?'),
('reflection', 'lightning', 'What drained my energy today?'),
('reflection', 'lightning', 'What inspired me today?'),
('reflection', 'lightning', 'Where did I act boldly, even in small ways?'),
('reflection', 'lightning', 'What idea lit something up inside me today?'),
('reflection', 'lightning', 'Where did I stand confidently in my truth?'),
('reflection', 'lightning', 'What challenge did I face with courage today?'),
('reflection', 'lightning', 'Where did I surprise myself with my strength?'),
('reflection', 'lightning', 'What energized me most today?'),
('reflection', 'lightning', 'What power did I reclaim today?');

-- ================================================
--                 DARKNESS INTENTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('intention', 'darkness', 'What truth is quietly asking to be acknowledged today?'),
('intention', 'darkness', 'Where can I slow down and listen more deeply?'),
('intention', 'darkness', 'What fear is ready to be softened?'),
('intention', 'darkness', 'How can I create stillness in my mind today?'),
('intention', 'darkness', 'What part of me needs gentle protection right now?'),
('intention', 'darkness', 'What boundary do I need to reinforce for my own peace?'),
('intention', 'darkness', 'Where can I embrace mystery instead of fighting it?'),
('intention', 'darkness', 'What part of my inner world wants exploration?'),
('intention', 'darkness', 'How can I honor my need for rest or solitude today?'),
('intention', 'darkness', 'How can I move with intention instead of reaction?'),
('intention', 'darkness', 'Where can I choose depth over distraction?'),
('intention', 'darkness', 'What internal signal have I been ignoring?'),
('intention', 'darkness', 'What would it look like to trust the unknown today?');

-- ================================================
--                 DARKNESS REFLECTIONS
-- ================================================
insert into soul_prompts (prompt_type, element, text) values
('reflection', 'darkness', 'What did silence teach me today?'),
('reflection', 'darkness', 'Where did I face discomfort or uncertainty?'),
('reflection', 'darkness', 'What truth did I uncover about myself today?'),
('reflection', 'darkness', 'Where did I feel the need to protect my energy?'),
('reflection', 'darkness', 'What shadow emotion surfaced for me today?'),
('reflection', 'darkness', 'Where did I feel grounded today?'),
('reflection', 'darkness', 'What pattern or habit did I notice?'),
('reflection', 'darkness', 'Where did I practice healthy boundaries today?'),
('reflection', 'darkness', 'What fear did I gently confront today?'),
('reflection', 'darkness', 'Where did I choose honesty with myself?'),
('reflection', 'darkness', 'What did the quiet parts of my mind reveal?'),
('reflection', 'darkness', 'What part of me is ready for healing or release?');