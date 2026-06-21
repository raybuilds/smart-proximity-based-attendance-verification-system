const fs = require('fs');
const path = require('path');

// Try using sharp if available, otherwise use canvas
let generateSplash;

try {
  const sharp = require('sharp');
  const { createCanvas } = require('canvas');
  
  generateSplash = async () => {
    const canvas = createCanvas(1080, 1920);
    const ctx = canvas.getContext('2d');
    
    // Cream background
    ctx.fillStyle = '#FAF7F0';
    ctx.fillRect(0, 0, 1080, 1920);
    
    // Green icon background (280x280)
    const iconSize = 280;
    const iconX = (1080 - iconSize) / 2;
    const iconY = 180 + 100; // Top safe margin + offset
    
    ctx.fillStyle = '#2D7555';
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, 40);
    ctx.fill();
    
    // White inner circle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(iconX + 20, iconY + 20, iconSize - 40, iconSize - 40, 30);
    ctx.fill();
    
    // Green inner icon
    ctx.fillStyle = '#2D7555';
    ctx.fillRect(iconX + 80, iconY + 80, iconSize - 160, iconSize - 160);
    
    // Title
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('Digital Proximity', 540, iconY + iconSize + 120);
    ctx.fillText('Attendance', 540, iconY + iconSize + 200);
    
    // Subtitle
    ctx.fillStyle = '#666666';
    ctx.font = '30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Secure Classroom Verification', 540, iconY + iconSize + 280);
    
    // Footer
    ctx.fillStyle = '#2D7555';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Powered by raybuilds', 540, 1850);
    
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, 'assets', 'splash.png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log('✓ Splash screen generated successfully');
    console.log(`  Path: ${outputPath}`);
    console.log('  Dimensions: 1080x1920');
    console.log('  Content coverage: ~70% of screen height');
  };
  
  generateSplash();
} catch (err) {
  console.error('Canvas library not available:', err.message);
  console.log('\nFallback: Using legacy SVG-to-PNG approach...');
  
  // Fallback approach using SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <!-- Cream background -->
  <rect width="1080" height="1920" fill="#FAF7F0"/>
  
  <!-- Green icon outer -->
  <rect x="400" y="330" width="280" height="280" rx="40" fill="#2D7555"/>
  
  <!-- White inner -->
  <rect x="420" y="350" width="240" height="240" rx="30" fill="#FFFFFF"/>
  
  <!-- Green inner icon -->
  <rect x="480" y="410" width="120" height="120" fill="#2D7555"/>
  
  <!-- Title text -->
  <text x="540" y="680" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
        fill="#1A1A1A" text-anchor="middle">Digital Proximity</text>
  <text x="540" y="760" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
        fill="#1A1A1A" text-anchor="middle">Attendance</text>
  
  <!-- Subtitle -->
  <text x="540" y="840" font-family="Arial, sans-serif" font-size="30" 
        fill="#666666" text-anchor="middle">Secure Classroom Verification</text>
  
  <!-- Footer -->
  <text x="540" y="1850" font-family="Arial, sans-serif" font-size="26" font-weight="bold" 
        fill="#2D7555" text-anchor="middle">Powered by raybuilds</text>
</svg>`;
  
  const svgPath = path.join(__dirname, 'assets', 'splash.svg');
  fs.writeFileSync(svgPath, svg);
  
  console.log('✓ SVG template created at:', svgPath);
  console.log('\nTo convert to PNG, use one of these commands:');
  console.log('  1. convert assets/splash.svg assets/splash.png');
  console.log('  2. Or upload to: https://convertio.co/svg-png/');
  console.log('  3. Or use ImageMagick: magick assets/splash.svg assets/splash.png');
}
