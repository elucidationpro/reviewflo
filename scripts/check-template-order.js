require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTemplateOrder() {
  const email = 'jeremy.obsidian.auto@gmail.com';

  console.log(`\n=== Checking template order for ${email} ===\n`);

  // Get business
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, business_name')
    .ilike('owner_email', email);

  if (!businesses || businesses.length === 0) {
    console.log('No business found');
    return;
  }

  const business = businesses[0];
  console.log(`Business: ${business.business_name} (${business.id})\n`);

  // Get templates ordered by platform (same as both pages)
  const { data: templates } = await supabase
    .from('review_templates')
    .select('id, platform, template_text')
    .eq('business_id', business.id)
    .order('platform', { ascending: true });

  if (!templates || templates.length === 0) {
    console.log('No templates found');
    return;
  }

  console.log('Templates ordered by platform (ascending):');
  templates.forEach((t, i) => {
    console.log(`\n${i + 1}. Platform: ${t.platform}`);
    console.log(`   Text preview: ${t.template_text.substring(0, 80)}...`);
  });

  console.log('\n\nExpected order for both pages:');
  console.log('  Settings page Template 1 = Customer page Template 1 = facebook (first alphabetically)');
  console.log('  Settings page Template 2 = Customer page Template 2 = google');
  console.log('  Settings page Template 3 = Customer page Template 3 = yelp');
}

checkTemplateOrder().then(() => {
  console.log('\nDone\n');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
