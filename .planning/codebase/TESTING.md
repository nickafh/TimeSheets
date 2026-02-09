# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**
- Playwright v1.57.0
- Configuration: `playwright.config.ts`
- Runs in Chromium browser only (single project)

**Run Commands:**
```bash
npm test                    # Run all tests headless
npm run test:ui            # Run tests with Playwright UI mode (interactive)
npm run test:headed        # Run tests in headed mode (visible browser)
```

**Configuration Details (from `playwright.config.ts`):**
- Test directory: `./tests`
- Base URL: `http://localhost:5173` (Vite dev server)
- Fully parallel execution enabled (`fullyParallel: true`)
- Reporter: HTML report output
- CI adjustments: 2 retries and single worker in CI, 0 retries locally with parallel workers
- Auto-starts dev server: `npm run dev` on port 5173

## Test File Organization

**Location:**
- Tests stored in: `src/Client/timesheets-web/tests/`
- Co-located with source code in `tests/` directory

**Naming:**
- Pattern: `*.spec.ts` (e.g., `weekly-time-entries.spec.ts`, `inspect-weekend-visibility.spec.ts`)

**File Structure:**
```
tests/
├── weekly-time-entries.spec.ts              # E2E test for weekly entry workflow
├── time-entries-ux-analysis.spec.ts         # UX validation tests
├── inspect-weekend-visibility.spec.ts       # Visual inspection test
└── screenshots/                              # Screenshots captured on failure
```

## Test Structure

**Suite Organization:**
```typescript
test.describe('Weekly Time Entries - End User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timesheets/weekly');
    await page.waitForSelector('h1:has-text("Weekly Time Entries")');
  });

  test('should display weekly grid layout', async ({ page }) => {
    // Test implementation
  });
});
```

**Patterns:**
- `test.describe()` groups related tests
- `test.beforeEach()` setup runs before each test
- `test('description', async ({ page }) => { ... })` defines individual test
- Playwright fixture injection: `{ page }` provides browser automation API

**Actual Test Examples from `weekly-time-entries.spec.ts`:**

1. **UI Element Verification:**
```typescript
test('should display weekly grid layout', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('Weekly Time Entries');
  await expect(page.locator('table')).toBeVisible();

  const dayHeaders = page.locator('thead th').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/ });
  await expect(dayHeaders).toHaveCount(7);
});
```

2. **User Interaction Simulation:**
```typescript
test('should allow entering hours in grid format', async ({ page }) => {
  const mondayInput = page.locator('input[type="number"]').first();
  await mondayInput.clear();
  await mondayInput.fill('8');
  await expect(mondayInput).toHaveValue('8');
  await page.waitForTimeout(300);
});
```

3. **Navigation Testing:**
```typescript
test('should navigate between weeks using arrows', async ({ page }) => {
  const weekLabel = await page.locator('text=Week of').locator('..').locator('div').nth(1).textContent();
  await page.locator('button[title="Next week"]').click();
  await page.waitForTimeout(500);

  const newWeekLabel = await page.locator('text=Week of').locator('..').locator('div').nth(1).textContent();
  expect(newWeekLabel).not.toBe(weekLabel);
});
```

4. **Button Action Testing:**
```typescript
test('should provide "Fill 8h M-F" quick action', async ({ page }) => {
  const fillButton = page.getByRole('button', { name: 'Fill 8h M-F' }).first();
  await expect(fillButton).toBeVisible();
  await fillButton.click();
  await page.waitForTimeout(500);

  const inputs = page.locator('tr:has-text("Hours Worked") input[type="number"]');
  for (let i = 0; i < 5; i++) {
    await expect(inputs.nth(i)).toHaveValue('8');
  }
});
```

## Selectors & Locators

**Strategies Used:**
- Semantic locators: `page.getByRole()`, `page.getByText()`
- CSS selectors: `page.locator('input[type="number"]')`
- Text matchers: `{ hasText: /pattern/ }`
- Composite locators: Chain `.filter()`, `.locator()` for specificity

**Examples:**
- `page.locator('h1:has-text("Weekly Time Entries")')` - heading with specific text
- `page.locator('thead th').filter({ hasText: /Mon|Tue/ })` - headers matching day names
- `page.locator('tr:has-text("Hours Worked") input[type="number"]')` - inputs in specific row
- `page.getByRole('button', { name: 'Fill 8h M-F' })` - button by accessible name

## Mocking

**Current Status:**
- No mocking framework configured (e.g., no jest, vitest, or msw)
- Tests are pure E2E and hit the actual running dev server
- Frontend must be running on `http://localhost:5173` and backend API must be available

**What is NOT mocked:**
- HTTP requests (real API calls to `http://localhost:5150`)
- Database queries
- Authentication (tests assume dev auth context works)

**Playwright Auto-Start:**
- Dev server auto-starts when tests run (configured in `webServer` option)
- Reuses existing server locally unless in CI environment

## Fixtures and Factories

**Test Data:**
- No explicit test data factories observed
- Tests rely on demo user/data already in development database
- Screenshots captured on failure for visual debugging

**Location:**
- Screenshots stored in: `tests/screenshots/`
- Captured automatically on first retry or failure
- Also manually captured in inspection tests

**Inspection Test Example (from `inspect-weekend-visibility.spec.ts`):**
```typescript
test('inspect weekend columns (Sat/Sun) visibility', async ({ page }) => {
  await page.screenshot({
    path: 'tests/screenshots/weekend-visibility-full.png',
    fullPage: true
  });

  // Detailed inspection with manual screenshots
  for (let i = 0; i < count; i++) {
    const header = dayHeaders.nth(i);
    await header.screenshot({
      path: `tests/screenshots/weekend-header-${dayName}.png`
    });
  }
});
```

## Coverage

**Requirements:**
- No coverage requirements enforced (no coverage configuration found)
- No minimum coverage threshold specified

**View Coverage:**
- Not applicable (Playwright E2E tests don't generate coverage reports)

## Test Types

**E2E Tests (Primary):**
- Full user workflows tested through browser UI
- Examples: data entry, navigation, form submission
- Focus: User-facing functionality and interactions
- Duration: Tests include explicit waits (`waitForTimeout`, `waitForSelector`) for async updates

**Integration Testing:**
- Implicit through E2E tests
- Frontend + actual API + database integration verified
- No isolated API tests found

**Unit Tests:**
- Not present in codebase
- No Jest, Vitest, or other unit test runner configured

**Performance Tests:**
- Not present

## Assertions

**Style:**
- Playwright's built-in assertions: `expect(locator).toContainText()`, `expect(locator).toHaveValue()`, `expect(locator).toBeVisible()`
- Direct assertions on extracted values: `expect(newWeekLabel).not.toBe(weekLabel)`
- Explicit wait patterns before assertions for async operations

**Common Assertion Patterns:**

```typescript
// Element visibility
await expect(page.locator('h1')).toBeVisible();

// Text content
await expect(page.locator('h1')).toContainText('Weekly Time Entries');

// Value verification
await expect(mondayInput).toHaveValue('8');

// Count verification
await expect(dayHeaders).toHaveCount(7);

// Truthiness
expect(newWeekLabel).not.toBe(weekLabel);
expect(newWeekLabel).toBeDefined();

// Computed styles
const bgColor = await header.evaluate((el) => {
  return window.getComputedStyle(el).backgroundColor;
});
```

## Async Testing

**Pattern:**
- All tests declared as `async`
- Explicit waits for async updates:
  ```typescript
  await page.waitForTimeout(300);        // Fixed delay
  await page.waitForSelector('table');   // Wait for element
  ```
- Promise-based API calls in frontend automatically awaited

## Test Workflow

**Running Tests Locally:**
1. `npm test` - Playwright starts dev server on 5173, runs tests headless
2. `npm run test:ui` - Interactive UI allows clicking through tests, inspecting elements
3. `npm run test:headed` - Browser window visible during test execution

**CI Mode:**
- Set via `process.env.CI` check
- Single worker (serial execution)
- 2 retries on failure
- Stricter forbidOnly enforcement

## Known Issues & Limitations

**Fragile Selectors:**
- Heavy reliance on text matching: `hasText("Weekly Time Entries")`
- Complex selector chains: `.locator('..').locator('div').nth(1)` - brittle if DOM changes
- No stable test IDs (`data-testid`) observed in components

**Maintenance Concerns:**
- Tests tightly coupled to UI structure
- No page object model or abstraction layer
- Screenshots used for manual inspection rather than visual regression testing
- Inspection test logs to console but doesn't assert on output

**No Mock Support:**
- Cannot test error scenarios without actual error responses from backend
- Cannot test loading states independently
- Full development environment required to run tests

**Async Timing:**
- Multiple `waitForTimeout(300-500)` indicate potential race conditions
- Should be replaced with more specific element waits

---

*Testing analysis: 2026-02-08*
