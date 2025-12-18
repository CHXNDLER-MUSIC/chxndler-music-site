const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOceanGirl() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Set active_from to start of today and active_to to end of year 2026 (long-lasting)
  const activeFrom = `${today}T00:00:00Z`;
  const activeTo = '2026-12-31T23:59:59.999Z';

  console.log('Updating "ocean girl" phrase...');
  console.log('Today:', today);
  console.log('Active from:', activeFrom);
  console.log('Active to:', activeTo);

  // Update the phrase to be active today (and for a long time)
  const { data, error } = await supabase
    .from('secret_phrases')
    .update({
      active_date: today,
      is_active: true,
      active_from: activeFrom,
      active_to: activeTo
    })
    .ilike('secret_phrase', 'ocean girl')
    .select();

  if (error) {
    console.error('Error updating:', error);
    process.exit(1);
  }

  console.log('\n✅ Updated successfully!');
  console.log('Updated row:', JSON.stringify(data, null, 2));

  // Verify the update
  const { data: verify } = await supabase
    .from('secret_phrases')
    .select('*')
    .ilike('secret_phrase', 'ocean girl');

  console.log('\nVerification:', JSON.stringify(verify, null, 2));
}

updateOceanGirl().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
