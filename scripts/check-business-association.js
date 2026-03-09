require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBusinessAssociation() {
  const email = 'jeremy.obsidian.auto@gmail.com';

  console.log(`\nChecking business association for: ${email}\n`);

  // 1. Check if auth user exists
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  console.log('Auth user:', authUser ? {
    id: authUser.id,
    email: authUser.email,
    created_at: authUser.created_at
  } : 'NOT FOUND');

  // 2. Check businesses table for this email
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, business_name, slug, owner_email, user_id, created_at')
    .ilike('owner_email', email);

  if (bizError) {
    console.error('\nError fetching businesses:', bizError);
    return;
  }

  console.log('\nBusinesses with owner_email matching:', businesses.length);
  businesses.forEach(biz => {
    console.log({
      id: biz.id,
      business_name: biz.business_name,
      slug: biz.slug,
      owner_email: biz.owner_email,
      user_id: biz.user_id,
      user_id_matches: authUser && biz.user_id === authUser.id,
      created_at: biz.created_at
    });
  });

  // 3. If auth user exists, check if there's a business with their user_id
  if (authUser) {
    const { data: byUserId, error: userIdError } = await supabase
      .from('businesses')
      .select('id, business_name, slug, owner_email, user_id')
      .eq('user_id', authUser.id);

    if (!userIdError) {
      console.log('\nBusinesses with user_id matching:', byUserId.length);
      byUserId.forEach(biz => {
        console.log({
          id: biz.id,
          business_name: biz.business_name,
          slug: biz.slug,
          owner_email: biz.owner_email,
          user_id: biz.user_id
        });
      });
    }
  }

  // 4. Recommend fix if needed
  if (authUser && businesses.length > 0) {
    const needsUpdate = businesses.filter(b => b.user_id !== authUser.id);
    if (needsUpdate.length > 0) {
      console.log('\n⚠️  Found businesses that need user_id update:');
      needsUpdate.forEach(biz => {
        console.log(`   - ${biz.business_name} (${biz.id}): user_id is ${biz.user_id || 'NULL'}, should be ${authUser.id}`);
      });
      console.log('\nFix: Update user_id to link auth account to business');
    } else {
      console.log('\n✓ All businesses are properly linked');
    }
  } else if (!authUser && businesses.length > 0) {
    console.log('\n⚠️  Auth user not found, but business record exists');
    console.log('Fix: User may need to re-verify email or recreate auth account');
  } else if (authUser && businesses.length === 0) {
    console.log('\n⚠️  Auth user exists but no business record found');
    console.log('Fix: Business record may have been deleted or email mismatch');
  }
}

checkBusinessAssociation().then(() => {
  console.log('\nDone\n');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
