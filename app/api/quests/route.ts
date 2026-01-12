import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role key to bypass RLS for public quest viewing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Fetch all active quests
    const { data: quests, error: questsError } = await supabase
      .from('bonus_quests')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (questsError) {
      console.error('[API /quests] Error fetching quests:', questsError);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    if (!quests || quests.length === 0) {
      return NextResponse.json({ quests: [] });
    }

    // Fetch user completion data if userId provided
    let completionMap = new Map<string, { times_completed: number; last_completed_at: string | null }>();
    let todayCompletionSet = new Set<string>();

    if (userId) {
      // Fetch total completion counts
      const { data: completions } = await supabase
        .from('user_bonus_quests')
        .select('bonus_quest_id, times_completed, last_completed_at')
        .eq('user_id', userId);

      completions?.forEach(c => {
        completionMap.set(c.bonus_quest_id, {
          times_completed: c.times_completed,
          last_completed_at: c.last_completed_at
        });
      });

      // Fetch today's completions (using NY timezone for daily reset at midnight ET)
      // Calculate start of day in NY timezone, then convert to UTC for query
      const now = new Date();

      // Get current date in NY timezone
      const nyDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD format

      // Create start and end of day in NY timezone, then get UTC equivalents
      // We use a simple approach: query completions from the last 24 hours that fall on "today" in NY
      const startOfDayNY = new Date(`${nyDateStr}T00:00:00`);
      startOfDayNY.setTime(startOfDayNY.getTime() + (5 * 60 * 60 * 1000)); // Add 5 hours (EST offset, approximate)

      const { data: todayCompletions } = await supabase
        .from('user_bonus_quest_completions')
        .select('bonus_quest_id, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      // Filter to only completions that are "today" in NY timezone
      const todayCompletionsFiltered = todayCompletions?.filter(c => {
        const completedDate = new Date(c.completed_at).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        return completedDate === nyDateStr;
      }) || [];

      todayCompletionsFiltered.forEach(c => todayCompletionSet.add(c.bonus_quest_id));
    }

    // Transform quests with completion data
    const questsWithCompletion = quests.map(quest => {
      const completion = completionMap.get(quest.id);
      const timesCompleted = completion?.times_completed || 0;
      const completedToday = todayCompletionSet.has(quest.id) ? 1 : 0;

      const hasReachedDailyLimit = completedToday >= quest.max_times_per_day;
      const hasReachedTotalLimit = quest.max_total_completions !== null && timesCompleted >= quest.max_total_completions;
      const canComplete = !hasReachedDailyLimit && !hasReachedTotalLimit;

      return {
        ...quest,
        times_completed: timesCompleted,
        can_complete: canComplete,
        completed_today: completedToday
      };
    });

    return NextResponse.json({ quests: questsWithCompletion });

  } catch (error) {
    console.error('[API /quests] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
