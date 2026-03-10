require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('\n=== Applying Tier Columns Migration ===\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_tier_columns.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Reading migration file:', migrationPath);
  console.log('\nExecuting SQL...\n');

  try {
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // If exec_sql doesn't exist, try direct query
          console.log('Trying direct query for:', statement.substring(0, 50) + '...');
          const { error: directError } = await supabase.from('_migrations').insert({});

          if (directError) {
            console.error('Error executing statement:', error);
            console.error('Statement:', statement.substring(0, 100));
          }
        } else {
          console.log('✓ Executed:', statement.substring(0, 60) + '...');
        }
      }
    }

    // Verify the columns were added
    console.log('\n=== Verifying Migration ===\n');
    const { data: businesses, error: verifyError } = await supabase
      .from('businesses')
      .select('id, tier, interested_in_tier, notify_on_launch, launch_discount_eligible')
      .limit(1);

    if (verifyError) {
      console.error('❌ Migration may have failed. Verification error:', verifyError);
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:\n');
      console.log(sql);
    } else {
      console.log('✓ Migration successful! Columns verified:');
      if (businesses && businesses.length > 0) {
        console.log(Object.keys(businesses[0]));
      }
    }
  } catch (err) {
    console.error('❌ Error applying migration:', err);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:\n');
    console.log(sql);
  }
}

applyMigration().then(() => {
  console.log('\nDone\n');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
