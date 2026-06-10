/**
 * generate-icons.cjs
 * Generates all required icon sizes for:
 * - Android app (all mipmap densities)
 * - Windows Electron app (ICO format simulation via PNG)
 * - Web favicon and PWA icons
 * 
 * Run: node generate-icons.cjs
 * Source: public/icon-source.png (the Invoice Adda logo)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'public', 'icon-source.png');

// Android mipmap icon sizes
const ANDROID_ICONS = [
  { dir: 'mipmap-mdpi',    size: 48 },
  { dir: 'mipmap-hdpi',    size: 72 },
  { dir: 'mipmap-xhdpi',   size: 96 },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Web / PWA icons
const WEB_ICONS = [
  { name: 'icon-16.png',   size: 16 },
  { name: 'icon-32.png',   size: 32 },
  { name: 'icon-48.png',   size: 48 },
  { name: 'icon-64.png',   size: 64 },
  { name: 'icon-128.png',  size: 128 },
  { name: 'icon-192.png',  size: 192 },
  { name: 'icon-256.png',  size: 256 },
  { name: 'icon-512.png',  size: 512 },
  { name: 'icon.png',      size: 512 },
];

async function generateIcons() {
  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: Source icon not found at', SOURCE);
    console.error('Please make sure public/icon-source.png exists.');
    process.exit(1);
  }

  console.log('✅ Source icon found:', SOURCE);
  const metadata = await sharp(SOURCE).metadata();
  console.log(`   Size: ${metadata.width}x${metadata.height}, Format: ${metadata.format}`);

  // ── Android Icons ──────────────────────────────
  console.log('\n📱 Generating Android icons...');
  const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
  
  for (const icon of ANDROID_ICONS) {
    const dir = path.join(androidResDir, icon.dir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png
    await sharp(SOURCE)
      .resize(icon.size, icon.size, { fit: 'cover', background: { r: 26, g: 26, b: 26, alpha: 1 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(SOURCE)
      .resize(icon.size, icon.size, { fit: 'cover', background: { r: 26, g: 26, b: 26, alpha: 1 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png — use slightly larger for adaptive icon foreground
    await sharp(SOURCE)
      .resize(Math.round(icon.size * 1.33), Math.round(icon.size * 1.33), { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`   ✓ ${icon.dir} (${icon.size}px)`);
  }

  // ── Web / Electron Icons ──────────────────────────────
  console.log('\n🌐 Generating web/Electron icons...');
  const publicDir = path.join(__dirname, 'public');

  for (const icon of WEB_ICONS) {
    await sharp(SOURCE)
      .resize(icon.size, icon.size, { fit: 'cover', background: { r: 26, g: 26, b: 26, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, icon.name));
    console.log(`   ✓ ${icon.name} (${icon.size}px)`);
  }

  // ── Windows ICO (a proper ICO wrapping the 256x256 PNG) ──
  console.log('\n🪟 Generating Windows icon (proper 256px PNG wrapped in ICO format)...');
  const png256Buffer = await sharp(SOURCE)
    .resize(256, 256, { fit: 'cover', background: { r: 26, g: 26, b: 26, alpha: 1 } })
    .png()
    .toBuffer();

  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0);     // Reserved (must be 0)
  icoHeader.writeUInt16LE(1, 2);     // Image type: 1 for icon
  icoHeader.writeUInt16LE(1, 4);     // Number of images: 1

  icoHeader.writeUInt8(0, 6);        // Width: 0 means 256
  icoHeader.writeUInt8(0, 7);        // Height: 0 means 256
  icoHeader.writeUInt8(0, 8);        // Color count: 0 for >8bpp
  icoHeader.writeUInt8(0, 9);        // Reserved: 0
  icoHeader.writeUInt16LE(1, 10);    // Color planes: 1
  icoHeader.writeUInt16LE(32, 12);   // Bits per pixel: 32
  icoHeader.writeUInt32LE(png256Buffer.length, 14); // Size of PNG data
  icoHeader.writeUInt32LE(22, 18);   // Offset to PNG data: 22 bytes (6 header + 16 dir entry)

  const icoBuffer = Buffer.concat([icoHeader, png256Buffer]);
  fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);
  console.log('   ✓ icon.ico (valid ICO wrapping 256px PNG)');

  // ── Favicon ──
  console.log('\n🔖 Generating favicon...');
  await sharp(SOURCE)
    .resize(64, 64, { fit: 'cover', background: { r: 26, g: 26, b: 26, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // Also replace favicon.ico with a 32px version
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon-32.png'));
  console.log('   ✓ favicon.png (64px)');

  console.log('\n✅ All icons generated successfully!');
  console.log('\nNext steps:');
  console.log('  Android APK:  npm run build:android  → then build in Android Studio or: cd android && gradlew assembleRelease');
  console.log('  Windows EXE:  npm run build:win');
}

generateIcons().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
