const fs = require('fs');
const path = require('path');

const assets = [
  'adaptive-icon.png',
  'icon.png',
  'raybuilds-logo.png',
  'splash.png'
];

assets.forEach(asset => {
  const fullPath = path.join(__dirname, 'assets', asset);
  if (!fs.existsSync(fullPath)) {
    console.log(`${asset}: FILE NOT FOUND`);
    return;
  }
  
  const buffer = fs.readFileSync(fullPath);
  const hex = buffer.toString('hex', 0, 8);
  
  let format = 'Unknown';
  if (hex.startsWith('89504e470d0a1a0a')) format = 'PNG';
  else if (hex.startsWith('ffd8ffe0') || hex.startsWith('ffd8ffe1') || hex.startsWith('ffd8ff')) format = 'JPEG';
  
  console.log(`Filename: ${asset}`);
  console.log(`Extension: ${path.extname(asset)}`);
  console.log(`First 8 bytes hex: ${hex}`);
  console.log(`Detected format: ${format}`);
  console.log('---');
});
