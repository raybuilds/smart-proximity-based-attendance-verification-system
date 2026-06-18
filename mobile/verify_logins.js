const { chromium } = require("playwright");

async function run() {
  console.log("Starting browser verification with clean contexts...");
  const browser = await chromium.launch({ headless: true });
  const appUrl = "http://localhost:8081";

  // 1. Admin Verification
  console.log("\n=== VERIFYING ADMIN LOGIN ===");
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await adminPage.goto(appUrl);
    await adminPage.waitForTimeout(3000);

    const emailInput = adminPage.locator('input[placeholder="Email"]');
    const passwordInput = adminPage.locator('input[placeholder="Password"]');
    await emailInput.fill("admin@attendance.local");
    await passwordInput.fill("Password@123");

    const loginBtn = adminPage.locator("div, span, p").filter({ hasText: /^Login$/ }).first();
    await loginBtn.click();

    await adminPage.waitForTimeout(4000);
    const bodyHtml = await adminPage.locator("body").innerHTML();
    const isDashboardLoaded = bodyHtml.includes("Institutional Oversight") || bodyHtml.includes("Admin Dashboard") || bodyHtml.includes("Overview");
    console.log(`Admin Dashboard Load: ${isDashboardLoaded ? "SUCCESS" : "FAILED"}`);
  } catch (err) {
    console.error("Admin verification failed:", err.message);
  } finally {
    await adminContext.close();
  }

  // 2. Teacher Verification
  console.log("\n=== VERIFYING TEACHER LOGIN ===");
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  try {
    await teacherPage.goto(appUrl);
    await teacherPage.waitForTimeout(3000);

    const emailInput = teacherPage.locator('input[placeholder="Email"]');
    const passwordInput = teacherPage.locator('input[placeholder="Password"]');
    await emailInput.fill("teacher@attendance.local");
    await passwordInput.fill("Password@123");

    const loginBtn = teacherPage.locator("div, span, p").filter({ hasText: /^Login$/ }).first();
    await loginBtn.click();

    await teacherPage.waitForTimeout(4000);
    const bodyHtml = await teacherPage.locator("body").innerHTML();
    const isDashboardLoaded = bodyHtml.includes("Teacher Dashboard") || bodyHtml.includes("Welcome");
    console.log(`Teacher Dashboard Load: ${isDashboardLoaded ? "SUCCESS" : "FAILED"}`);
  } catch (err) {
    console.error("Teacher verification failed:", err.message);
  } finally {
    await teacherContext.close();
  }

  // 3. Student Verification
  console.log("\n=== VERIFYING STUDENT LOGIN ===");
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  try {
    await studentPage.goto(appUrl);
    await studentPage.waitForTimeout(3000);

    const emailInput = studentPage.locator('input[placeholder="Email"]');
    const passwordInput = studentPage.locator('input[placeholder="Password"]');
    await emailInput.fill("student@attendance.local");
    await passwordInput.fill("Password@123");

    const loginBtn = studentPage.locator("div, span, p").filter({ hasText: /^Login$/ }).first();
    await loginBtn.click();

    await studentPage.waitForTimeout(4000);
    const bodyHtml = await studentPage.locator("body").innerHTML();
    const isDashboardLoaded = bodyHtml.includes("Attendance Dashboard") || bodyHtml.includes("signed in as a student");
    console.log(`Student Dashboard Load: ${isDashboardLoaded ? "SUCCESS" : "FAILED"}`);
  } catch (err) {
    console.error("Student verification failed:", err.message);
  } finally {
    await studentContext.close();
  }

  await browser.close();
  console.log("\nVerification finished.");
}

run();
