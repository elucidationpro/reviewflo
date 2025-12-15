const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateOGImage() {
  const width = 1200;
  const height = 630;
  const outputPath = path.join(__dirname, '..', 'public', 'images', 'og-image.png');

  // Create a beige background with brown border
  const svgBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Light beige background -->
      <rect width="${width}" height="${height}" fill="#F5EFE7"/>

      <!-- Logo centered (scaled 2x from original 300x75) -->
      <g transform="translate(300, 150)">
        <!-- Star Icon - slightly heavier weight -->
        <g transform="translate(10, 20) scale(2)">
          <path d="M20 3L22.8 12.2C22.9 12.6 23.3 12.9 23.7 12.9L33.2 12.9C33.9 12.9 34.2 13.8 33.7 14.2L26.1 19.8C25.8 20 25.6 20.4 25.7 20.8L28.5 30C28.7 30.7 27.9 31.2 27.4 30.8L19.8 25.2C19.5 25 19.1 25 18.8 25.2L11.2 30.8C10.7 31.2 9.9 30.7 10.1 30L12.9 20.8C13 20.4 12.8 20 12.5 19.8L4.9 14.2C4.4 13.8 4.7 12.9 5.4 12.9L14.9 12.9C15.3 12.9 15.7 12.6 15.8 12.2L18.6 3C18.8 2.3 19.8 2.3 20 3Z"
                fill="none"
                stroke="#4A3428"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </g>

        <!-- ReviewFlo text -->
        <text x="110" y="100"
              font-family="'Baskerville Old Face', 'Libre Baskerville', 'Baskerville', serif"
              font-size="84"
              font-weight="700"
              letter-spacing="-0.5"
              fill="#4A3428">Review<tspan fill="#C9A961">Flo</tspan></text>
      </g>

      <!-- Tagline below logo -->
      <text x="600" y="420"
            text-anchor="middle"
            font-family="'Helvetica', 'Arial', sans-serif"
            font-size="42"
            font-weight="600"
            fill="#4A3428">Stop Bad Reviews. Get More Good Ones.</text>

      <!-- Subtle bottom accent -->
      <rect x="400" y="580" width="400" height="4" fill="#C9A961" rx="2"/>
    </svg>
  `;

  try {
    await sharp(Buffer.from(svgBackground))
      .png({
        quality: 95,
        compressionLevel: 9
      })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    const fileSizeInKB = stats.size / 1024;

    console.log('✓ OG image generated successfully!');
    console.log(`  Output: ${outputPath}`);
    console.log(`  Size: ${fileSizeInKB.toFixed(2)} KB`);
    console.log(`  Dimensions: ${width}x${height}px`);

  } catch (error) {
    console.error('Error generating OG image:', error);
    process.exit(1);
  }
}

generateOGImage();
