const fs = require('fs');
const path = require('path');

// Colors
const background = '#FAF7F0';

console.log('Generating assets for splash and adaptive icon...');

// Copy icon.png directly to adaptive-icon.png for Expo as adaptive icon foreground
const iconPath = path.join(process.cwd(), 'assets', 'icon.png');
const adaptiveIconPath = path.join(process.cwd(), 'assets', 'adaptive-icon.png');
fs.copyFileSync(iconPath, adaptiveIconPath);
console.log('Copied icon.png to adaptive-icon.png');

// For splash.png, we need a 1242x2436 image with #FAF7F0 background.
// Instead of complex PIL script, we can generate a basic PNG file using canvas or a simple html generator.
// Wait, we can write a quick node script that writes a splash page HTML and screenshots it via Playwright, 
// since we have playwright installed! Let's check package.json: we have "playwright" in devDependencies.

async function generateSplash() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // HTML Template for Splash Screen
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 1242px;
          height: 2688px;
          background-color: #FAF7F0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Georgia', serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: -150px;
        }
        .icon {
          width: 480px;
          height: 480px;
          border-radius: 96px;
          margin-bottom: 70px;
        }
        .title {
          font-size: 68px;
          font-weight: bold;
          color: #0f172a;
          text-align: center;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
        }
        .subtitle {
          font-size: 36px;
          color: #475569;
          text-align: center;
          margin-bottom: 350px;
        }
        .footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: absolute;
          bottom: 240px;
        }
        .powered-by {
          font-size: 24px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #94a3b8;
          margin-bottom: 20px;
          font-family: 'sans-serif';
          font-weight: 600;
        }
        .brand-container {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .brand-logo {
          width: 64px;
          height: 64px;
        }
        .brand-text {
          font-size: 42px;
          font-weight: bold;
          color: #334155;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img class="icon" src="data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}" />
        <div class="title">Digital Proximity Attendance</div>
        <div class="subtitle">Smart Attendance Verification System</div>
      </div>
      <div class="footer">
        <div class="powered-by">Powered by</div>
        <div class="brand-container">
          <img class="brand-logo" src="data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), 'assets', 'raybuilds-logo.png')).toString('base64')}" />
          <div class="brand-text">raybuilds</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await page.setContent(html);
  await page.setViewportSize({ width: 1242, height: 2688 });
  
  const splashOutPath = path.join(process.cwd(), 'assets', 'splash.png');
  await page.screenshot({
    path: splashOutPath,
    clip: { x: 0, y: 0, width: 1242, height: 2688 }
  });
  
  console.log('Successfully generated splash.png at:', splashOutPath);
  await browser.close();
}

generateSplash().catch(console.error);
