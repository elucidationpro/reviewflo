require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumns() {
  console.log('\n=== Adding Missing Tier Columns to Businesses Table ===\n');

  // We'll need to use Supabase's REST API directly for DDL operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const ddlStatements = [
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'ai'))`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS interested_in_tier TEXT CHECK (interested_in_tier IN ('pro', 'ai') OR interested_in_tier IS NULL)`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notify_on_launch BOOLEAN DEFAULT false`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS launch_discount_eligible BOOLEAN DEFAULT true`,
  ];

  console.log('⚠️  Note: JavaScript client cannot execute DDL statements.\n');
  console.log('Please run these SQL commands in your Supabase SQL Editor:\n');
  console.log('https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].split('//')[1] + '/sql\n');
  console.log('--- Copy and paste this SQL ---\n');

  ddlStatements.forEach((stmt, i) => {
    console.log(`-- Statement ${i + 1}`);
    console.log(stmt + ';\n');
  });

  console.log('-- Create indexes for better query performance');
  console.log(`CREATE INDEX IF NOT EXISTS idx_businesses_tier ON businesses(tier);`);
  console.log(`CREATE INDEX IF NOT EXISTS idx_businesses_interested_in_tier ON businesses(interested_in_tier) WHERE interested_in_tier IS NOT NULL;\n`);

  console.log('--- End of SQL ---\n');

  console.log('After running the SQL, restart your dev server and try logging in again.\n');
}

addColumns().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
