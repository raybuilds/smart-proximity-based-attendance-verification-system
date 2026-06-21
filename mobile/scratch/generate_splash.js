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

// For splash.png, we need a 1242x2688 image with #FAF7F0 background.
async function generateSplash() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // HTML Template for Splash Screen optimized for containment
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
          justify-content: space-between;
          font-family: 'Georgia', serif;
          box-sizing: border-box;
          padding-top: 250px;
          padding-bottom: 200px;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-grow: 1;
        }
        .icon {
          width: 620px;
          height: 620px;
          border-radius: 120px;
          margin-bottom: 60px;
        }
        .title {
          font-size: 76px;
          font-weight: bold;
          color: #0f172a;
          text-align: center;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
          max-width: 1000px;
        }
        .subtitle {
          font-size: 42px;
          color: #475569;
          text-align: center;
          max-width: 900px;
        }
        .footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 100px;
        }
        .powered-by {
          font-size: 26px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #94a3b8;
          margin-bottom: 24px;
          font-family: 'sans-serif';
          font-weight: 600;
        }
        .brand-container {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .brand-logo {
          width: 80px;
          height: 80px;
        }
        .brand-text {
          font-size: 48px;
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
