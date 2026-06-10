/**
 * save-icon.cjs
 * This script saves a base64-encoded icon image to public/icon-source.png
 * Run: node save-icon.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Try to copy from the artifacts directory if available
// The user uploaded the image and it was captured as an artifact
const possibleSources = [
  // User might have the logo saved locally  
  path.join('C:', 'Users', 'harsh', 'Downloads', 'invoice-adda-logo.png'),
  path.join('C:', 'Users', 'harsh', 'Desktop', 'invoice-adda-logo.png'),
];

const dest = path.join(__dirname, 'public', 'icon-source.png');

let copied = false;
for (const src of possibleSources) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('✅ Copied icon from:', src);
    copied = true;
    break;
  }
}

if (!copied) {
  console.log('⚠️  Could not find icon in common locations.');
  console.log('Please manually copy your Invoice Adda logo PNG to:');
  console.log('  ', dest);
  console.log('Then run: node generate-icons.cjs');
}
