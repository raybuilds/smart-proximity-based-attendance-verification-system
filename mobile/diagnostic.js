const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to browser...');
  // Connect to Chrome remote debugger or launch headless
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set up console log listener
  page.on('console', msg => {
    console.log(`[BROWSER LOG] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR] ${err.stack || err.message || err}`);
  });


  try {
    console.log('Navigating to app...');
    await page.goto('http://localhost:19006');
    await page.waitForTimeout(5000); // Wait for bundle to fully load/render

    console.log('Looking for login fields...');
    const bodyHtml = await page.locator('body').innerHTML();
    console.log('Body HTML preview:', bodyHtml.substring(0, 1000));
    await page.screenshot({ path: 'login_screen.png' });
    console.log('Screenshot saved to login_screen.png');

    const emailInput = page.locator('input[placeholder="Email"]');
    const passwordInput = page.locator('input[placeholder="Password"]');
    
    await emailInput.fill('teacher@attendance.local');
    await passwordInput.fill('Password@123');
    
    console.log('Clicking login...');
    // React Native Web maps Text element to div/span. Let's try searching for elements containing "Login"
    const loginBtn = page.locator('div, span, p').filter({ hasText: /^Login$/ }).first();
    await loginBtn.click();

    
    console.log('Logged in. Waiting on dashboard...');
    await page.waitForTimeout(5000); // Wait 5 seconds on dashboard
    
    console.log('Clicking Attendance Records & Reports button...');
    const reportsBtn = page.locator('div, span, p').filter({ hasText: /^Attendance Records & Reports$/ }).first();
    await reportsBtn.click();

    
    console.log('On reports screen. Waiting 15 seconds...');
    await page.waitForTimeout(15000);

    console.log('Going back to dashboard...');
    // Header back button or navigation.goBack() - React Navigation header back button has role="button" and typically text "Teacher Dashboard" or standard icon
    // Let's click header back button if present, or we can just go back in browser history
    await page.evaluate(() => window.history.back());
    
    console.log('Returned to dashboard. Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
