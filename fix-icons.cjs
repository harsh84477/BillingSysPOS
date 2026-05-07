const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src');

const replacements = {
  'AlertCircle': 'CircleAlert',
  'CheckCircle2': 'CircleCheck',
  'XCircle': 'CircleX',
  'AlertTriangle': 'TriangleAlert'
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walkDir(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir(directory);
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [oldIcon, newIcon] of Object.entries(replacements)) {
    // Regex to match the exact word to avoid partial replacements
    const regex = new RegExp(`\\b${oldIcon}\\b`, 'g');
    content = content.replace(regex, newIcon);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed icons in: ${path.relative(__dirname, file)}`);
    changedCount++;
  }
});

console.log(`\n🎉 Done! Replaced deprecated Lucide icons in ${changedCount} files.`);
