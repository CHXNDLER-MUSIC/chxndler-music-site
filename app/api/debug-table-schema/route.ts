import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    
    // Get table structure
    const { data, error } = await admin
      .rpc('get_table_columns', { table_name: 'profiles' })
      .catch(async () => {
        // Fallback: try to get info from information_schema
        return await admin
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'profiles')
          .eq('table_schema', 'public');
      });

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to get table schema', 
        details: error 
      }, { status: 500 });
    }

    return NextResponse.json({
      schema: data,
      message: 'Table schema for profiles'
    });

  } catch (error: any) {
    console.error('Debug table schema error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}