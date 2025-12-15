const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImage() {
  const inputPath = '/Users/jeremycarrera/Desktop/jeremy (5MB).jpg';
  const outputPath = path.join(__dirname, '..', 'public', 'images', 'jeremy.jpg');

  try {
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error('Input image not found at:', inputPath);
      process.exit(1);
    }

    // Optimize and resize image
    await sharp(inputPath)
      .resize(800, 800, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toFile(outputPath);

    // Check output file size
    const stats = fs.statSync(outputPath);
    const fileSizeInKB = stats.size / 1024;

    console.log(`✓ Image optimized successfully!`);
    console.log(`  Output: ${outputPath}`);
    console.log(`  Size: ${fileSizeInKB.toFixed(2)} KB`);
    console.log(`  Dimensions: 800x800px`);

  } catch (error) {
    console.error('Error optimizing image:', error);
    process.exit(1);
  }
}

optimizeImage();
