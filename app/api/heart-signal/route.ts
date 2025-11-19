import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { message, anonymous } = await req.json();
    
    // If anonymous heart signal, just return success
    if (anonymous) {
      console.log('Anonymous heart signal sent:', message || 'Anonymous heart signal');
      return NextResponse.json({ 
        success: true, 
        message: 'Anonymous heart signal sent to the Heartverse!' 
      });
    }

    // For authenticated users, check token and potentially update their profile
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      // Allow anonymous heart signals
      return NextResponse.json({ 
        success: true, 
        message: 'Heart signal sent to the Heartverse!' 
      });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      // Allow anonymous heart signals even if auth fails
      return NextResponse.json({ 
        success: true, 
        message: 'Heart signal sent to the Heartverse!' 
      });
    }

    const user = userResult.user;
    
    // Optional: Create a heart_signals table to track signals
    // For now, we'll just log and potentially add a heart to their profile
    console.log(`Heart signal from user ${user.id}:`, message || 'Heart signal');
    
    // Optional: Add a heart to the user's profile
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('hearts')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        await admin
          .from('profiles')
          .update({ 
            hearts: (profile.hearts || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    } catch (e) {
      console.log('Could not update hearts for user:', e);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Heart signal sent and heart added to your profile!' 
    });

  } catch (error: any) {
    console.error('Heart signal error:', error);
    return NextResponse.json(
      { error: 'Failed to send heart signal' }, 
      { status: 500 }
    );
  }
}