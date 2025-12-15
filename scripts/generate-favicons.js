const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Star icon extracted from the ReviewFlo logo
const starSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M43.53,30.53l8.75,17.73c.44.89,1.28,1.5,2.26,1.64l19.57,2.84c2.46.36,3.44,3.38,1.66,5.12l-14.16,13.8c-.71.69-1.03,1.68-.86,2.66l3.34,19.49c.42,2.45-2.15,4.32-4.35,3.16l-17.5-9.2c-.87-.46-1.92-.46-2.79,0l-17.5,9.2c-2.2,1.16-4.77-.71-4.35-3.16l3.34-19.49c.17-.97-.16-1.97-.86-2.66l-14.16-13.8c-1.78-1.74-.8-4.76,1.66-5.12l19.57-2.84c.98-.14,1.82-.76,2.26-1.64l8.75-17.73c1.1-2.23,4.28-2.23,5.38,0Z"
        fill="none"
        stroke="#4a3428"
        stroke-miterlimit="10"
        stroke-width="10"
        transform="translate(5, 0)"/>
</svg>
`;

async function generateFavicons() {
  const publicDir = path.join(__dirname, '..', 'public');

  try {
    console.log('Generating favicons from star icon...\n');

    // Generate 16x16 PNG
    await sharp(Buffer.from(starSvg))
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✓ Generated favicon-16x16.png');

    // Generate 32x32 PNG
    await sharp(Buffer.from(starSvg))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Generated favicon-32x32.png');

    // Generate 180x180 Apple Touch Icon
    await sharp(Buffer.from(starSvg))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png (180x180)');

    // Generate ICO file (using sharp to create 32x32, then we'll use it as .ico)
    // Note: Sharp doesn't directly support .ico format, so we'll create a 32x32 PNG
    // and rename it. For true multi-size .ico, you'd need a separate library.
    await sharp(Buffer.from(starSvg))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico.png'));

    // Rename to .ico (basic approach)
    fs.renameSync(
      path.join(publicDir, 'favicon.ico.png'),
      path.join(publicDir, 'favicon.ico')
    );
    console.log('✓ Generated favicon.ico (32x32)');

    console.log('\n✓ All favicon files generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - favicon.ico (32x32)');
    console.log('  - favicon-16x16.png');
    console.log('  - favicon-32x32.png');
    console.log('  - apple-touch-icon.png (180x180)');

  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
