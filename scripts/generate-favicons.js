/**
 * Generates favicon + apple-touch PNGs from the canonical star source in public/.
 *
 * Source: public/images/reviewflo-star-icon-source.png (rounded outline star from logo).
 * Black/near-black matte is keyed to transparent so the icon works on any tab background.
 *
 * Run: node scripts/generate-favicons.js
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SOURCE = path.join(__dirname, '..', 'public', 'images', 'reviewflo-star-icon-source.png')

/** Pixels at or below this RGB level (all channels) become fully transparent. */
const BLACK_KEY_THRESHOLD = 22

async function loadStarWithTransparentMatte() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing source image: ${SOURCE}\nPlace reviewflo-star-icon-source.png there first.`)
  }

  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels
  if (channels !== 4) {
    throw new Error(`Expected RGBA source, got ${channels} channels`)
  }

  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i]
    const g = out[i + 1]
    const b = out[i + 2]
    if (r <= BLACK_KEY_THRESHOLD && g <= BLACK_KEY_THRESHOLD && b <= BLACK_KEY_THRESHOLD) {
      out[i + 3] = 0
    }
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
}

async function generateFavicons() {
  const publicDir = path.join(__dirname, '..', 'public')

  try {
    console.log('Generating favicons from public/images/reviewflo-star-icon-source.png...\n')

    const base = await loadStarWithTransparentMatte()

    const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
    /** Light backing so iOS home-screen shortcut is not a muddy black square */
    const appleBg = { r: 248, g: 250, b: 249, alpha: 1 }

    await base
      .clone()
      .resize(16, 16, { fit: 'contain', background: transparent })
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'))
    console.log('✓ Generated favicon-16x16.png')

    await base
      .clone()
      .resize(32, 32, { fit: 'contain', background: transparent })
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'))
    console.log('✓ Generated favicon-32x32.png')

    await base
      .clone()
      .resize(180, 180, { fit: 'contain', background: appleBg })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'))
    console.log('✓ Generated apple-touch-icon.png (180x180)')

    const icoPathPng = path.join(publicDir, 'favicon.ico.png')
    await base
      .clone()
      .resize(32, 32, { fit: 'contain', background: transparent })
      .png()
      .toFile(icoPathPng)

    fs.renameSync(icoPathPng, path.join(publicDir, 'favicon.ico'))
    console.log('✓ Generated favicon.ico (32x32 PNG payload)')

    console.log('\n✓ All favicon files generated successfully!')
    console.log('\nGenerated files:')
    console.log('  - favicon.ico')
    console.log('  - favicon-16x16.png')
    console.log('  - favicon-32x32.png')
    console.log('  - apple-touch-icon.png')
  } catch (error) {
    console.error('Error generating favicons:', error)
    process.exit(1)
  }
}

generateFavicons()
