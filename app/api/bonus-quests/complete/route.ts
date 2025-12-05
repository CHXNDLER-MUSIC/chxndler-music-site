import { NextResponse } from 'next/server';
import { completeBonusQuest, getBonusQuestsForUser } from '@/lib/bonusQuests';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questKey } = body;

    if (!questKey) {
      return NextResponse.json(
        { error: 'Quest key is required' },
        { status: 400 }
      );
    }

    // Get current session to get user ID
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to complete quests' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's bonus quests to find the quest to complete
    const userQuests = await getBonusQuestsForUser(userId);
    const questToComplete = userQuests.find(quest => quest.quest_key === questKey);

    if (!questToComplete) {
      return NextResponse.json(
        { error: 'Quest not found or not available' },
        { status: 404 }
      );
    }

    if (!questToComplete.can_complete) {
      return NextResponse.json(
        { error: 'Quest cannot be completed' },
        { status: 400 }
      );
    }

    // Complete the quest using the bonus quest system
    const result = await completeBonusQuest(userId, questToComplete);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      rewards: result.rewards
    });

  } catch (error) {
    console.error('Error completing bonus quest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}