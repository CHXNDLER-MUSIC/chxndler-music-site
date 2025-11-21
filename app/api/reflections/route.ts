import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userResult.user;

    // Get user's reflections
    const { data: reflections, error: reflectionsError } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (reflectionsError) {
      return NextResponse.json({ error: 'Failed to fetch reflections' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reflections: reflections || []
    });

  } catch (error) {
    console.error('Reflections fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userResult.user;
    const body = await req.json();
    
    const { question, category, response: userResponse, questionId } = body;

    // Validate input
    if (!question || !category || !userResponse || !questionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save reflection
    const { data: reflection, error: insertError } = await supabase
      .from('daily_reflections')
      .insert({
        user_id: user.id,
        question_id: questionId,
        question: question,
        category: category,
        user_response: userResponse,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save reflection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reflection saved successfully',
      reflection
    });

  } catch (error) {
    console.error('Reflection save error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}