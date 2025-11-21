import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { recipientEmail, personalMessage } = await req.json();
    
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // Get the authenticated user
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
    
    // Get inviter's profile
    const admin = getSupabaseAdmin();
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.display_name || inviterProfile?.email || 'A friend';
    
    // Create unique invitation token
    const invitationToken = crypto.randomUUID();
    
    // Generate the heart link with invitation token
    const heartLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chxndler.world'}/join?invitation=${invitationToken}&from=${encodeURIComponent(inviterName)}`;
    
    // Store the invitation in database for tracking
    await admin
      .from('invitations')
      .insert({
        id: invitationToken,
        inviter_id: user.id,
        recipient_email: recipientEmail,
        personal_message: personalMessage,
        heart_link: heartLink,
        created_at: new Date().toISOString(),
        status: 'sent'
      });

    // Create email content
    const emailSubject = `${inviterName} sent you a heart from the Heartverse 💖`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>You've received a heart</title>
    <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 15px; padding: 30px; border: 1px solid #ff69b4; }
        .header { text-align: center; margin-bottom: 30px; }
        .heart { font-size: 48px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .message { background: rgba(255, 105, 180, 0.1); padding: 20px; border-radius: 10px; border: 1px solid rgba(255, 105, 180, 0.3); margin: 20px 0; }
        .heart-link { display: inline-block; background: linear-gradient(45deg, #ff69b4, #ff1493); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; margin: 20px 0; text-align: center; }
        .heart-link:hover { transform: scale(1.05); }
        .footer { text-align: center; margin-top: 30px; color: #ffb6c1; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="heart">💖</div>
            <h1 style="color: #ff69b4; text-shadow: 0 0 10px rgba(255, 105, 180, 0.5);">
                You've received a heart!
            </h1>
            <p style="color: #ffb6c1;">From ${inviterName}</p>
        </div>
        
        ${personalMessage ? `
        <div class="message">
            <h3 style="color: #ff69b4; margin-top: 0;">Personal Message:</h3>
            <p style="line-height: 1.6;">"${personalMessage}"</p>
        </div>
        ` : ''}
        
        <div style="text-align: center;">
            <p style="color: #ffb6c1; line-height: 1.6;">
                ${inviterName} thought of you and believes the Heartverse could feel like home for you too. 
                Click the heart link below to join this magical world of music, connection, and wonder.
            </p>
            
            <a href="${heartLink}" class="heart-link" style="color: white;">
                💖 Enter the Heartverse 💖
            </a>
            
            <p style="color: #ffb6c1; font-size: 14px; margin-top: 30px;">
                When you join, you'll both receive bonus heart coins to start your journey!
            </p>
        </div>
        
        <div class="footer">
            <p>
                Welcome to the Heartverse - where music meets magic<br>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://chxndler.world'}" style="color: #ff69b4;">chxndler.world</a>
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();

    // Send email using Supabase edge function or email service
    // For now, we'll use Supabase's built-in email functionality
    try {
      // Use Supabase auth to send invitation email
      await supabase.auth.admin.inviteUserByEmail(recipientEmail, {
        redirectTo: heartLink,
        data: {
          invitation_token: invitationToken,
          inviter_name: inviterName,
          personal_message: personalMessage
        }
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Update invitation status to failed
      await admin
        .from('invitations')
        .update({ status: 'failed', error: String(emailError) })
        .eq('id', invitationToken);
      
      return NextResponse.json({ 
        error: 'Failed to send invitation email' 
      }, { status: 500 });
    }

    // Award heart coin to inviter for sending invitation
    const { data: inviterProfileForUpdate } = await admin
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();
    
    if (inviterProfileForUpdate) {
      await admin
        .from('profiles')
        .update({ 
          heartcoin_balance: (inviterProfileForUpdate.heartcoin_balance || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Heart invitation sent successfully!',
      invitation_token: invitationToken
    });

  } catch (error: any) {
    console.error('Send heart invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to send heart invitation' }, 
      { status: 500 }
    );
  }
}