import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { completeBonusQuestWithClient, getBonusQuestsForUserWithClient } from '@/lib/bonusQuests';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questKey } = body;

    if (!questKey) {
      return NextResponse.json(
        { error: 'Quest key is required' },
        { status: 400 }
      );
    }

    // Get auth token from cookies for proper server-side authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required to complete quests' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult?.user) {
      return NextResponse.json(
        { error: 'Authentication required to complete quests' },
        { status: 401 }
      );
    }

    const userId = userResult.user.id;

    // Get user's bonus quests to find the quest to complete
    const userQuests = await getBonusQuestsForUserWithClient(supabase, userId);
    const questToComplete = userQuests.find(quest => quest.quest_key === questKey);

    if (!questToComplete) {
      return NextResponse.json(
        { error: 'Quest not found or not available' },
        { status: 404 }
      );
    }

    // Allow the quest to be attempted even if can_complete is false
    // The completeBonusQuest function will handle daily limits gracefully

    // Complete the quest using the bonus quest system with authenticated client
    const result = await completeBonusQuestWithClient(supabase, userId, questToComplete);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Force profile refresh event to update UI with new heartcoin balance
    if (process.env.NODE_ENV !== "production") console.log(`✅ Bonus quest '${questKey}' completed successfully for user ${userId}`, { rewards: result.rewards });

    return NextResponse.json({
      success: true,
      status: result.message === 'Quest already completed today!' ? 'already_completed_today' : 'completed_today',
      message: result.message,
      rewards: result.rewards,
      shouldRefreshProfile: true
    });

  } catch (error) {
    console.error('Error completing bonus quest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}