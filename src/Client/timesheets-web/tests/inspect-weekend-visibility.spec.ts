import { test, expect } from '@playwright/test';

test.describe('Weekend Visibility Inspection', () => {
  test('inspect weekend columns (Sat/Sun) visibility', async ({ page }) => {
    await page.goto('/timesheets/weekly');
    await page.waitForSelector('h1:has-text("Weekly Time Entries")');

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Take a screenshot of the whole page
    await page.screenshot({
      path: 'tests/screenshots/weekend-visibility-full.png',
      fullPage: true
    });

    // Find all day header cells
    const dayHeaders = page.locator('thead th').filter({
      hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/
    });

    const count = await dayHeaders.count();
    console.log(`Found ${count} day headers`);

    // Inspect each day header
    for (let i = 0; i < count; i++) {
      const header = dayHeaders.nth(i);
      const dayName = await header.locator('div').first().textContent();
      const date = await header.locator('div').last().textContent();

      // Get computed styles
      const bgColor = await header.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      const dayNameEl = header.locator('div').first();
      const textColor = await dayNameEl.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log(`Day ${i}: ${dayName} (${date})`);
      console.log(`  Background: ${bgColor}`);
      console.log(`  Text Color: ${textColor}`);

      // Check if it's a weekend
      if (dayName?.includes('SAT') || dayName?.includes('SUN')) {
        console.log(`  ⚠️ WEEKEND COLUMN DETECTED`);

        // Check if background is amber
        if (bgColor.includes('rgb')) {
          console.log(`  🔍 Weekend background color: ${bgColor}`);
        }

        // Check if text is visible
        const isVisible = await header.isVisible();
        console.log(`  Visible: ${isVisible}`);

        // Screenshot just this header
        await header.screenshot({
          path: `tests/screenshots/weekend-header-${dayName}.png`
        });
      }
    }

    // Check if weekend columns have amber background
    const satHeader = page.locator('th:has-text("SAT")');
    const sunHeader = page.locator('th:has-text("SUN")');

    if (await satHeader.count() > 0) {
      const satBg = await satHeader.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      console.log(`\n📅 Saturday background: ${satBg}`);

      const satTextColor = await satHeader.locator('div').first().evaluate((el) =>
        window.getComputedStyle(el).color
      );
      console.log(`📅 Saturday text color: ${satTextColor}`);
    }

    if (await sunHeader.count() > 0) {
      const sunBg = await sunHeader.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      console.log(`\n📅 Sunday background: ${sunBg}`);

      const sunTextColor = await sunHeader.locator('div').first().evaluate((el) =>
        window.getComputedStyle(el).color
      );
      console.log(`📅 Sunday text color: ${sunTextColor}`);
    }

    // DIAGNOSIS: Check if amber background is making white text invisible
    console.log('\n🔍 DIAGNOSIS:');
    console.log('If weekend columns have amber/yellow background (bg-amber-100)');
    console.log('AND text is white (from bg-afh-navy parent), text will be invisible!');
    console.log('\nSOLUTION: Weekend columns need dark text on amber background');
  });

  test('check for specific dates (20th, 21st)', async ({ page }) => {
    await page.goto('/timesheets/weekly');
    await page.waitForSelector('h1');
    await page.waitForTimeout(2000); // Wait for data to load

    // Look for cells containing "20" or "21"
    const date20 = page.locator('th:has-text("12-20")');
    const date21 = page.locator('th:has-text("12-21")');

    if (await date20.count() > 0) {
      console.log('\n📅 Found Dec 20th column');
      const dayName = await date20.locator('div').first().textContent();
      console.log(`Day: ${dayName}`);

      const textColor = await date20.locator('div').first().evaluate((el) =>
        window.getComputedStyle(el).color
      );
      const bgColor = await date20.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      console.log(`Text: ${textColor}, Background: ${bgColor}`);

      // Take screenshot
      await date20.screenshot({ path: 'tests/screenshots/dec-20-header.png' });
    }

    if (await date21.count() > 0) {
      console.log('\n📅 Found Dec 21st column');
      const dayName = await date21.locator('div').first().textContent();
      console.log(`Day: ${dayName}`);

      const textColor = await date21.locator('div').first().evaluate((el) =>
        window.getComputedStyle(el).color
      );
      const bgColor = await date21.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      console.log(`Text: ${textColor}, Background: ${bgColor}`);

      // Take screenshot
      await date21.screenshot({ path: 'tests/screenshots/dec-21-header.png' });
    }
  });
});
