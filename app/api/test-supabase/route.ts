import { NextResponse } from 'next/server';
import { supabaseBrowser } from '@/lib/supabase-browser';

export async function GET() {
  try {
    // Test if profiles table exists
    const { data: profilesTest, error: profilesError } = await supabaseBrowser
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    // Test if orders table exists
    const { data: ordersTest, error: ordersError } = await supabaseBrowser
      .from('orders')
      .select('count', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      connection: 'OK',
      tables: {
        profiles: profilesError ? {
          exists: false,
          error: {
            message: profilesError.message,
            code: profilesError.code,
            details: profilesError.details,
            hint: profilesError.hint
          }
        } : {
          exists: true,
          count: profilesTest
        },
        orders: ordersError ? {
          exists: false,
          error: {
            message: ordersError.message,
            code: ordersError.code,
            details: ordersError.details,
            hint: ordersError.hint
          }
        } : {
          exists: true,
          count: ordersTest
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Exception occurred',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}