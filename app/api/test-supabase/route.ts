import { NextResponse } from 'next/server';
import { supabaseBrowser } from '@/lib/supabase-browser';

export async function GET() {
  try {
    // Test basic connection
    const { data: tables, error } = await supabaseBrowser
      .rpc('list_schemas');
      
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Connection failed',
        details: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      });
    }

    // Test if profiles table exists
    const { data: profilesTest, error: profilesError } = await supabaseBrowser
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      connection: 'OK',
      profilesTable: profilesError ? {
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