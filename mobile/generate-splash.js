const canvas = require('canvas');
const fs = require('fs');
const path = require('path');

// Canvas dimensions (standard splash for mobile - 1080x1920 for Android)
const width = 1080;
const height = 1920;

// Create canvas
const canv = canvas.createCanvas(width, height);
const ctx = canv.getContext('2d');

// Cream background
ctx.fillStyle = '#FAF7F0';
ctx.fillRect(0, 0, width, height);

// Draw app icon placeholder (large green square with app icon)
const iconSize = 280;
const iconX = (width - iconSize) / 2;
const iconY = height / 2 - 400;

// Green background for icon
ctx.fillStyle = '#2D7555';
ctx.beginPath();
ctx.roundRect(iconX, iconY, iconSize, iconSize, 40);
ctx.fill();

// White icon background
ctx.fillStyle = '#FFFFFF';
ctx.beginPath();
ctx.roundRect(iconX + 20, iconY + 20, iconSize - 40, iconSize - 40, 30);
ctx.fill();

// Add simple app icon representation (green square with white)
ctx.fillStyle = '#2D7555';
ctx.fillRect(iconX + 80, iconY + 80, iconSize - 160, iconSize - 160);

// Title text
ctx.fillStyle = '#1A1A1A';
ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Digital Proximity', width / 2, height / 2 + 150);
ctx.fillText('Attendance', width / 2, height / 2 + 230);

// Subtitle
ctx.fillStyle = '#666666';
ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
ctx.fillText('v2.0.0', width / 2, height / 2 + 320);

// Footer branding
ctx.fillStyle = '#2D7555';
ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
ctx.fillText('raybuilds', width / 2, height - 150);

// Save as PNG
const buffer = canv.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'assets', 'splash.png'), buffer);
console.log('✓ Splash screen generated successfully');
