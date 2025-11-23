import { getSupabaseAdmin } from '@/lib/supabase-admin';

function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export async function ensureTodaySoulPrompt() {
  const admin = getSupabaseAdmin();
  const date = today();

  try {
    // 1. Check for an existing prompt for today
    const { data: existing, error: fetchError } = await admin
      .from('soul_daily_prompts')
      .select('*')
      .eq('prompt_date', date)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Soul fetch error:', fetchError);
      throw fetchError;
    }

    if (existing) {
      return existing;
    }

    // 2. Insert a new prompt
    const newPrompt = {
      prompt_date: date,
      element: 'heart',
      intention: 'Lead with softness, that is where the strongest magic lives.',
      reflection:
        'What does my heart need from me today to feel safe, open, and guided?',
    };

    const { data: inserted, error: insertError } = await admin
      .from('soul_daily_prompts')
      .insert(newPrompt)
      .select('*')
      .single();

    if (insertError) {
      console.error('Soul insert error:', insertError);
      throw insertError;
    }

    return inserted;
  } catch (error: any) {
    console.error('Error in ensureTodaySoulPrompt:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}
