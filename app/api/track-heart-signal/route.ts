import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { email, source = 'welcome_home_modal' } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    
    // Track the heart signal in our invitations table
    // This is an anonymous heart signal, so inviter_id is null
    const { data: invitation, error: invitationError } = await admin
      .from('invitations')
      .insert({
        inviter_id: null, // Anonymous invitation from welcome modal
        recipient_email: email,
        status: 'sent',
        heart_link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.chxndler-music.com'}/auth/callback`,
        personal_message: `Welcome to the Heartverse! You've received a heart signal.`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Failed to track heart signal:', invitationError);
      // Don't fail the request if tracking fails
    }

    console.log('Heart signal tracked for email:', email, 'Source:', source);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Heart signal tracked successfully',
      invitation_id: invitation?.id
    });

  } catch (error: any) {
    console.error('Track heart signal error:', error);
    return NextResponse.json(
      { error: 'Failed to track heart signal' }, 
      { status: 500 }
    );
  }
}