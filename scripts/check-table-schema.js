require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('\n=== Checking businesses table schema ===\n');

  // Get one business to see what columns exist
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching businesses:', error);
    return;
  }

  if (businesses && businesses.length > 0) {
    console.log('Current columns in businesses table:');
    console.log(Object.keys(businesses[0]).sort());
  } else {
    console.log('No businesses found in table');
  }

  console.log('\n=== Required columns by /api/my-business ===');
  const requiredCols = [
    'id',
    'business_name',
    'slug',
    'primary_color',
    'google_review_url',
    'facebook_review_url',
    'skip_template_choice',
    'tier',
    'interested_in_tier',
    'notify_on_launch',
    'launch_discount_eligible',
    'owner_email',
    'user_id'
  ];
  console.log(requiredCols.sort());

  if (businesses && businesses.length > 0) {
    const existingCols = Object.keys(businesses[0]);
    const missing = requiredCols.filter(col => !existingCols.includes(col));

    if (missing.length > 0) {
      console.log('\n⚠️  MISSING COLUMNS:');
      missing.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✓ All required columns exist');
    }
  }
}

checkSchema().then(() => {
  console.log('\nDone\n');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
