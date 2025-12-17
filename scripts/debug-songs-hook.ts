import { createClient } from '@supabase/supabase-js';
import { SONG_ELEMENT_MAPPING } from '../data/songElements';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugSongsHook() {
  console.log('🔍 Debugging songs hook logic...\n');
  
  try {
    // Fetch songs like the hook does
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      return;
    }

    console.log(`✅ Fetched ${data?.length || 0} songs from Supabase`);
    
    if (!data || data.length === 0) {
      console.log('❌ No songs found in database');
      return;
    }

    console.log('\n📊 Raw song data sample:');
    console.log(JSON.stringify(data[0], null, 2));

    // Process songs like the hook does
    const songsWithElements = data.map(song => {
      let element;
      
      if (song.element && ['heart', 'water', 'lightning', 'darkness'].includes(song.element.toLowerCase())) {
        element = song.element.toLowerCase();
      } else {
        element = SONG_ELEMENT_MAPPING[song.slug] || 'heart';
      }
      
      return {
        ...song,
        element
      };
    });

    // Group by element
    const songsByElement = songsWithElements.reduce((acc, song) => {
      const element = song.element;
      if (!acc[element]) {
        acc[element] = [];
      }
      acc[element].push(song);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n📈 Songs by element:');
    Object.entries(songsByElement).forEach(([element, songs]) => {
      const releasedCount = songs.filter(s => s.is_released).length;
      const unreleasedCount = songs.filter(s => !s.is_released).length;
      console.log(`${element}: ${songs.length} total (${releasedCount} released, ${unreleasedCount} unreleased)`);
    });

    console.log('\n🎯 Sample songs by element:');
    Object.entries(songsByElement).forEach(([element, songs]) => {
      console.log(`\n${element.toUpperCase()}:`);
      songs.slice(0, 3).forEach(song => {
        console.log(`  - ${song.title} (${song.is_released ? 'Released' : 'Unreleased'})`);
      });
    });

  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

debugSongsHook();