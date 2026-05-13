/**
 * send-pro-launch-bulk.mjs
 *
 * Sends the Pro launch announcement to all free-tier businesses that have
 * not unsubscribed from marketing emails.
 *
 * Safety checks:
 *   - Skips anyone with tier = 'pro' or 'ai'
 *   - Skips anyone in marketing_unsubscribes
 *   - Skips rows with no owner_email
 *
 * Usage:
 *   node scripts/send-pro-launch-bulk.mjs
 *   node scripts/send-pro-launch-bulk.mjs --dry-run   (print recipients, no send)
 */

import puppeteer from 'puppeteer';
import juice from 'juice';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Config ──────────────────────────────────────────────────────────────────
const RESEND_API_KEY  = 're_PJC6Q6TD_7qQtyrwNzabrER8hvdrmSiMV';
const SUPABASE_URL    = 'https://qawrdhxyadfmuxdzeslo.supabase.co';
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhd3JkaHh5YWRmbXV4ZHplc2xvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1NjkxMiwiZXhwIjoyMDc2MTMyOTEyfQ.oa6axXu6t9Iia6lxrEE3SF2gdzcIyUNqnDGYIRIoV8E';
const FROM            = 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>';
const SUBJECT         = 'ReviewFlo Pro is live. Your first 3 months are half off.';
const HTML_FILE       = '/Users/jeremycarrera/Downloads/ReviewFlo Pro Launch Email - Standalone.html';
const LOGO_PATH       = '/Users/jeremycarrera/reviewflow/public/images/reviewflo-logo.png';
const LOGO_SVG_PATH   = '/Users/jeremycarrera/reviewflow/public/images/reviewflo-logo.svg';
const RESEND_BATCH_LIMIT = 100;
// ────────────────────────────────────────────────────────────────────────────

// ── Step 1: Render the email template once ──────────────────────────────────
console.log('Rendering email template with Puppeteer...');
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 1200 });
await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0', timeout: 30000 });

await page.waitForFunction(() => {
  const t = document.getElementById('__bundler_thumbnail');
  return !t || t.style.display === 'none' || !t.parentNode;
}, { timeout: 15000 }).catch(() => {});

await new Promise(r => setTimeout(r, 2500));

const { emailHtml, styles } = await page.evaluate(() => {
  ['__bundler_loading', '__bundler_thumbnail', '__bundler_err'].forEach(id =>
    document.getElementById(id)?.remove()
  );
  const styleTexts = Array.from(document.querySelectorAll('style'))
    .map(s => s.textContent).join('\n');
  const root = document.getElementById('root') || document.getElementById('app');
  const emailEl = (root && root.innerHTML.trim()) ? root
    : Array.from(document.body.children).find(el =>
        !['__bundler_loading', '__bundler_thumbnail', '__bundler_err'].includes(el.id)
        && el.tagName !== 'SCRIPT'
      ) || document.body;
  return {
    emailHtml: emailEl instanceof Element ? emailEl.outerHTML : document.body.innerHTML,
    styles: styleTexts,
  };
});

await browser.close();
console.log(`Template extracted: ${emailHtml.length} chars, ${styles.length} chars CSS`);

// Inline logo from disk
const logoFile = fs.existsSync(LOGO_PATH) ? LOGO_PATH : LOGO_SVG_PATH;
const logoMime = logoFile.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
const logoDataUrl = `data:${logoMime};base64,${fs.readFileSync(logoFile).toString('base64')}`;
const patchedHtml = emailHtml.replace(/src="[^"]*reviewflo-logo[^"]*"/gi, `src="${logoDataUrl}"`);

// Build full document and inline CSS with juice
// We use a placeholder unsubscribe URL that we'll swap per-user
const UNSUB_PLACEHOLDER = 'https://usereviewflo.com/unsubscribe?email=__EMAIL__';
const templateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${styles}</style>
</head>
<body style="margin:0;padding:0;background:#ece4d6;">
${patchedHtml}
</body>
</html>`;

// Swap the generic /unsubscribe href with the placeholder before inlining
const templateWithPlaceholder = templateHtml.replace(
  /href="https:\/\/usereviewflo\.com\/unsubscribe"/g,
  `href="${UNSUB_PLACEHOLDER}"`
);

const inlinedTemplate = juice(templateWithPlaceholder, {
  removeStyleTags: false,
  applyStyleTags: true,
  applyAttributesTableElements: true,
});

console.log(`Inlined template: ${inlinedTemplate.length} chars`);

// ── Step 2: Query Supabase for eligible recipients ───────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: unsubscribes, error: unsubErr } = await supabase
  .from('marketing_unsubscribes')
  .select('email');

if (unsubErr) {
  console.error('Failed to fetch unsubscribes:', unsubErr);
  process.exit(1);
}

const unsubSet = new Set((unsubscribes || []).map(r => r.email.toLowerCase().trim()));
console.log(`Unsubscribed addresses: ${unsubSet.size}`);

// Fetch all non-Pro businesses with an email
const { data: businesses, error: bizErr } = await supabase
  .from('businesses')
  .select('owner_email, business_name, tier')
  .not('owner_email', 'is', null)
  .eq('tier', 'free');

if (bizErr) {
  console.error('Failed to fetch businesses:', bizErr);
  process.exit(1);
}

// Deduplicate by email (one business per email address)
const seen = new Set();
const recipients = [];
for (const biz of (businesses || [])) {
  const email = biz.owner_email?.trim().toLowerCase();
  if (!email) continue;
  if (unsubSet.has(email)) continue;
  if (seen.has(email)) continue;
  seen.add(email);
  recipients.push({ email: biz.owner_email.trim(), name: biz.business_name, tier: biz.tier });
}

console.log(`\nRecipients: ${recipients.length} (after filtering Pro, AI, unsubscribed, dupes)`);

if (DRY_RUN) {
  console.log('\n-- DRY RUN -- Would send to:');
  recipients.forEach(r => console.log(`  ${r.email} (${r.tier}) — ${r.name}`));
  console.log('\nNo emails sent.');
  process.exit(0);
}

if (recipients.length === 0) {
  console.log('No recipients found. Exiting.');
  process.exit(0);
}

// ── Step 3: Send in batches of 100 ──────────────────────────────────────────
const resend = new Resend(RESEND_API_KEY);

function buildEmailForRecipient(email) {
  const encodedEmail = encodeURIComponent(email);
  return inlinedTemplate.replace(
    /__EMAIL__/g,
    encodedEmail
  );
}

let totalSent = 0;
let totalFailed = 0;

for (let i = 0; i < recipients.length; i += RESEND_BATCH_LIMIT) {
  const batch = recipients.slice(i, i + RESEND_BATCH_LIMIT);
  const payload = batch.map(r => ({
    from: FROM,
    to: [r.email],
    subject: SUBJECT,
    html: buildEmailForRecipient(r.email),
    headers: {
      'List-Unsubscribe': `<https://usereviewflo.com/unsubscribe?email=${encodeURIComponent(r.email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }));

  console.log(`\nSending batch ${Math.floor(i / RESEND_BATCH_LIMIT) + 1}: ${batch.map(r => r.email).join(', ')}`);

  const result = batch.length === 1
    ? await resend.emails.send(payload[0])
    : await resend.batch.send(payload);

  if (result.error) {
    console.error('Batch error:', result.error);
    totalFailed += batch.length;
  } else {
    console.log(`Batch sent. IDs:`, Array.isArray(result.data) ? result.data.map(d => d.id) : result.data?.id);
    totalSent += batch.length;
  }

  // Brief pause between batches to be kind to the API
  if (i + RESEND_BATCH_LIMIT < recipients.length) {
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log(`\n✓ Done. Sent: ${totalSent}, Failed: ${totalFailed}`);
