import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    
    // Get recent profiles
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (profilesError) {
      return NextResponse.json({ 
        error: 'Failed to fetch profiles', 
        details: profilesError 
      }, { status: 500 });
    }

    // Get recent auth users
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ 
        error: 'Failed to fetch auth users', 
        details: authError 
      }, { status: 500 });
    }

    // Get recent invitations
    const { data: invitations, error: invitationsError } = await admin
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      profiles: profiles || [],
      authUsers: authUsers.users.map(u => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        created_at: u.created_at
      })),
      invitations: invitations || [],
      summary: {
        totalProfiles: profiles?.length || 0,
        totalAuthUsers: authUsers.users.length,
        totalInvitations: invitations?.length || 0,
        latestProfileCreated: profiles?.[0]?.created_at,
        latestUserSignedUp: authUsers.users[0]?.created_at
      }
    });

  } catch (error: any) {
    console.error('Debug profiles error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}