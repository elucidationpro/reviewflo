import puppeteer from 'puppeteer';
import juice from 'juice';
import { Resend } from 'resend';
import path from 'path';
import fs from 'fs';

const HTML_FILE = '/Users/jeremycarrera/Downloads/ReviewFlo Pro Launch Email - Standalone.html';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 1200 });

console.log('Loading file...');
await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for React to hydrate and bundler chrome to disappear
await page.waitForFunction(() => {
  const thumbnail = document.getElementById('__bundler_thumbnail');
  return !thumbnail || thumbnail.style.display === 'none' || !thumbnail.parentNode;
}, { timeout: 15000 }).catch(() => console.log('Timeout on thumbnail check, proceeding...'));

await new Promise(r => setTimeout(r, 2500));

// Extract email HTML + all <style> blocks + convert blob/relative image URLs to data URIs
const { emailHtml, styles, baseDir } = await page.evaluate(async () => {
  // Remove bundler chrome
  ['__bundler_loading', '__bundler_thumbnail', '__bundler_err'].forEach(id => {
    document.getElementById(id)?.remove();
  });

  // Collect all <style> tag contents
  const styleTexts = Array.from(document.querySelectorAll('style'))
    .map(s => s.textContent)
    .join('\n');

  // Find email content
  const root = document.getElementById('root') || document.getElementById('app');
  let emailEl = root && root.innerHTML.trim() ? root : null;

  if (!emailEl) {
    const bodyChildren = Array.from(document.body.children).filter(el =>
      !['__bundler_loading', '__bundler_thumbnail', '__bundler_err'].includes(el.id)
      && el.tagName !== 'SCRIPT'
    );
    emailEl = bodyChildren.length === 1 ? bodyChildren[0] : document.body;
  }

    return {
    emailHtml: emailEl instanceof Element ? emailEl.outerHTML : emailEl,
    styles: styleTexts,
  };
});

await browser.close();

// Inline logo: replace any broken file:// or relative img src with base64 from disk
let { emailHtml: patchedHtml } = { emailHtml };
{
  const logoPng = '/Users/jeremycarrera/reviewflow/public/images/reviewflo-logo.png';
  const logoSvg = '/Users/jeremycarrera/reviewflow/public/images/reviewflo-logo.svg';
  const logoPath = fs.existsSync(logoPng) ? logoPng : logoSvg;
  const mime = logoPath.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  const logoB64 = fs.readFileSync(logoPath).toString('base64');
  const logoDataUrl = `data:${mime};base64,${logoB64}`;
  console.log(`Inlining logo from ${logoPath} (${logoB64.length} base64 chars)`);
  // Replace any src that references the logo (file://, relative, or external)
  patchedHtml = emailHtml.replace(
    /src="[^"]*reviewflo-logo[^"]*"/gi,
    `src="${logoDataUrl}"`
  );
}

const emailHtmlFinal = patchedHtml;

if (!emailHtmlFinal || emailHtmlFinal.length < 200) {
  console.error('Extracted HTML too short:', emailHtml?.slice(0, 300));
  process.exit(1);
}

console.log('Extracted HTML length:', emailHtmlFinal.length, 'chars');
console.log('Extracted styles length:', styles.length, 'chars');

// Build full document, then inline all CSS with juice
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${styles}</style>
</head>
<body style="margin:0;padding:0;background:#ece4d6;">
${emailHtmlFinal}
</body>
</html>`;

const inlined = juice(fullHtml, {
  removeStyleTags: false, // keep style tag as fallback for clients that support it
  applyStyleTags: true,
  applyAttributesTableElements: true,
});

console.log('Inlined HTML length:', inlined.length, 'chars');
console.log('Preview (first 400 chars of body):', inlined.slice(inlined.indexOf('<body'), inlined.indexOf('<body') + 400));

const resend = new Resend('re_PJC6Q6TD_7qQtyrwNzabrER8hvdrmSiMV');

const result = await resend.emails.send({
  from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
  to: 'jcarrera2001@gmail.com',
  subject: 'ReviewFlo Pro is live. Your first 3 months are half off.',
  html: inlined,
});

if (result.error) {
  console.error('Resend error:', result.error);
  process.exit(1);
} else {
  console.log('Sent! Email ID:', result.data?.id);
}
