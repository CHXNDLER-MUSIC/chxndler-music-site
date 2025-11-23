-- Add sort_order column to soul_prompts table for ordered prompt cycling
ALTER TABLE public.soul_prompts 
ADD COLUMN sort_order integer;

-- Update existing prompts with sort_order based on the order they appear in the original table
-- HEART INTENTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'What is one gentle way I can show myself love today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'How can I lead with softness instead of fear?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'What part of my heart needs warmth right now?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'Where can I practice patience with myself today?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'How can I open my heart without losing my boundaries?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'Who in my life needs to feel appreciated today?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'What does loving myself look like in small actions?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'How can I choose compassion over judgment today?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'Where can I allow myself to feel joy?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'What truth in my heart wants to be spoken today?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'Where can I be kinder to myself right now?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'How can I create a moment of emotional safety?';
UPDATE soul_prompts SET sort_order = 13 WHERE prompt_type = 'intention' AND element = 'heart' AND text = 'What would my heart choose if it had no fear?';

-- HEART REFLECTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'Where did love show up for me today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'Did I speak to myself with kindness today?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'What emotion sat closest to my chest today?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'What moment felt like warmth to me today?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'Where did my heart feel protected or exposed?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'What love did I give freely today?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'What made my heart feel heavy or light today?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'Did I let myself feel what I needed to feel?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'Where did I practice compassion today?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'What did my heart whisper to me today?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'Where did I choose connection over avoidance?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'reflection' AND element = 'heart' AND text = 'What healed me today, even a little?';

-- WATER INTENTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'How can I let my emotions move instead of holding them back?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'What would it look like to flow instead of force today?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'Where can I allow softness into my day?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'How can I meet myself with honesty and fluidity?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'What emotional truth wants to surface today?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'Where can I surrender control and trust the current?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'How can I create calm within myself today?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'What am I resisting that I could instead allow?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'Where can I bring gentleness into a tense part of my life?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'What emotion deserves attention instead of avoidance?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'How can I nurture my inner world today?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'What does emotional balance look like for me today?';
UPDATE soul_prompts SET sort_order = 13 WHERE prompt_type = 'intention' AND element = 'water' AND text = 'How can I let go of something small today?';

-- WATER REFLECTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'What emotions flowed through me today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'Where did I resist what I should have allowed?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'What helped me feel calm today?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'Where did I feel emotionally supported?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'What truth surfaced for me today?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'What did I release today, big or small?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'Where did I feel emotionally stuck today?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'What moment today felt like a gentle wave?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'Where did I feel overwhelmed, and why?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'What helped me reconnect with myself today?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'Did I allow myself to feel honestly today?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'reflection' AND element = 'water' AND text = 'Where did I find clarity in my emotions today?';

-- LIGHTNING INTENTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'Where can I channel my energy with purpose today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'What bold action can I take to ignite momentum?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'What idea sparks excitement in me right now?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'How can I stand confidently in my truth today?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'Where can I create movement instead of waiting?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'What energizes me that I can lean into today?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'How can I act with clarity and intention?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'What fear is asking to be challenged today?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'Where can I choose action over hesitation?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'What power within me wants expression today?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'How can I share my creative spark with the world?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'What boundary do I need to enforce today?';
UPDATE soul_prompts SET sort_order = 13 WHERE prompt_type = 'intention' AND element = 'lightning' AND text = 'Where can I take initiative and lead myself?';

-- LIGHTNING REFLECTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'Where did I feel a spark of energy today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What action made me feel powerful today?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'Where did I hesitate when I wanted to move forward?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What drained my energy today?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What inspired me today?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'Where did I act boldly, even in small ways?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What idea lit something up inside me today?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'Where did I stand confidently in my truth?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What challenge did I face with courage today?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'Where did I surprise myself with my strength?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What energized me most today?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'reflection' AND element = 'lightning' AND text = 'What power did I reclaim today?';

-- DARKNESS INTENTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What truth is quietly asking to be acknowledged today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'Where can I slow down and listen more deeply?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What fear is ready to be softened?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'How can I create stillness in my mind today?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What part of me needs gentle protection right now?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What boundary do I need to reinforce for my own peace?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'Where can I embrace mystery instead of fighting it?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What part of my inner world wants exploration?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'How can I honor my need for rest or solitude today?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'How can I move with intention instead of reaction?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'Where can I choose depth over distraction?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What internal signal have I been ignoring?';
UPDATE soul_prompts SET sort_order = 13 WHERE prompt_type = 'intention' AND element = 'darkness' AND text = 'What would it look like to trust the unknown today?';

-- DARKNESS REFLECTIONS (starting from 1)
UPDATE soul_prompts SET sort_order = 1 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What did silence teach me today?';
UPDATE soul_prompts SET sort_order = 2 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'Where did I face discomfort or uncertainty?';
UPDATE soul_prompts SET sort_order = 3 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What truth did I uncover about myself today?';
UPDATE soul_prompts SET sort_order = 4 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'Where did I feel the need to protect my energy?';
UPDATE soul_prompts SET sort_order = 5 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What shadow emotion surfaced for me today?';
UPDATE soul_prompts SET sort_order = 6 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'Where did I feel grounded today?';
UPDATE soul_prompts SET sort_order = 7 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What pattern or habit did I notice?';
UPDATE soul_prompts SET sort_order = 8 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'Where did I practice healthy boundaries today?';
UPDATE soul_prompts SET sort_order = 9 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What fear did I gently confront today?';
UPDATE soul_prompts SET sort_order = 10 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'Where did I choose honesty with myself?';
UPDATE soul_prompts SET sort_order = 11 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What did the quiet parts of my mind reveal?';
UPDATE soul_prompts SET sort_order = 12 WHERE prompt_type = 'reflection' AND element = 'darkness' AND text = 'What part of me is ready for healing or release?';

-- Create index on sort_order for efficient ordering
CREATE INDEX IF NOT EXISTS soul_prompts_element_type_sort_idx
  ON public.soul_prompts (element, prompt_type, sort_order);