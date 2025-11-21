import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { redeemSecretPhrase } from '@/lib/redeemSecretPhrase';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ 
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return NextResponse.json({ 
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication failed' 
      }, { status: 401 });
    }

    const user = userResult.user;
    const body = await req.json();
    
    const { context, phrase } = body;

    // Validate input
    if (!context || !phrase) {
      return NextResponse.json({ 
        status: 'error',
        code: 'INVALID_INPUT',
        message: 'Context and phrase are required' 
      }, { status: 400 });
    }

    if (typeof context !== 'string' || typeof phrase !== 'string') {
      return NextResponse.json({ 
        status: 'error',
        code: 'INVALID_INPUT',
        message: 'Context and phrase must be strings' 
      }, { status: 400 });
    }

    // Call the redemption logic
    const result = await redeemSecretPhrase({
      supabase,
      userId: user.id,
      context: context.trim(),
      phrase: phrase.trim()
    });

    // Return appropriate status code based on result
    if (result.status === 'success') {
      return NextResponse.json(result, { status: 200 });
    } else {
      // Map error codes to HTTP status codes
      const statusCode = result.code === 'NO_ACTIVE_PHRASE' || result.code === 'ALREADY_REDEEMED' 
        ? 400 
        : result.code === 'INVALID_INPUT' 
        ? 400 
        : 500;
      
      return NextResponse.json(result, { status: statusCode });
    }

  } catch (error) {
    console.error('Secret phrase redemption API error:', error);
    return NextResponse.json({ 
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Something glitched in the Heartverse. Try again in a moment.' 
    }, { status: 500 });
  }
}