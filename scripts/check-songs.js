const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSongs() {
  try {
    // Check songs table structure
    const { data, error } = await supabase.from('songs').select('*').limit(3)
    if (error) {
      console.error('Error:', error)
    } else {
      console.log('Songs table structure:')
      if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '))
        console.log('Sample data:')
        data.forEach((song, i) => {
          console.log(`Song ${i + 1}:`, JSON.stringify(song, null, 2))
        })
      } else {
        console.log('No songs found')
      }
    }
    
    // Check if there are planet-related tables
    console.log('\n--- Checking for planet-related tables ---')
    
    // Try song_planets table
    const { data: songPlanetsData, error: songPlanetsError } = await supabase.from('song_planets').select('*').limit(3)
    if (!songPlanetsError && songPlanetsData) {
      console.log('song_planets table found:')
      if (songPlanetsData.length > 0) {
        console.log('Columns:', Object.keys(songPlanetsData[0]).join(', '))
        console.log('Sample:', JSON.stringify(songPlanetsData[0], null, 2))
      }
    } else {
      console.log('No song_planets table found')
    }
    
    // Try elements table
    const { data: elementsData, error: elementsError } = await supabase.from('elements').select('*').limit(3)
    if (!elementsError && elementsData) {
      console.log('elements table found:')
      if (elementsData.length > 0) {
        console.log('Columns:', Object.keys(elementsData[0]).join(', '))
        console.log('Sample:', JSON.stringify(elementsData[0], null, 2))
      }
    } else {
      console.log('No elements table found')
    }

    // Try planets table 
    const { data: planetsData, error: planetsError } = await supabase.from('planets').select('*').limit(3)
    if (!planetsError && planetsData) {
      console.log('planets table found:')
      if (planetsData.length > 0) {
        console.log('Columns:', Object.keys(planetsData[0]).join(', '))
        console.log('Sample:', JSON.stringify(planetsData[0], null, 2))
      }
    } else {
      console.log('No planets table found')
    }
    
  } catch (error) {
    console.error('Script error:', error)
  }
}

checkSongs()