# fintual-api

**fintual-api** is a TypeScript/Bun toolkit for automating the retrieval, processing, and import of investment data from Fintual into Actual Budget. It combines direct API access with browser automation (via Playwright) to ensure robust data collection, validation, and integration.

## Overview

- **Fetches investment data** from Fintual using both public and authenticated APIs.
- **Automates browser scraping** with Playwright for data not available via API.
- **Validates and transforms** data using [valibot](https://valibot.dev/) schemas.
- **Imports transactions** into Actual Budget using the `@actual-app/api` package.
- **Includes automated tests** and examples for browser automation.

---

## Prerequisites

- [Bun](https://bun.sh) v1.1.2 or later
- Node.js (required for Playwright and some dev dependencies)

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```
2. **Configure credentials:**
   - Create a `.env` file in the root directory based on `.env.example`:
     ```bash
     cp .env.example .env
     ```
   - Fill in your Fintual credentials and Actual Budget API key. Ensure you have the correct permissions for the API key.
   - **Fintual credentials:** You can find your Fintual account ID and goal ID in the URL when logged into your account. For example, if the URL is `https://app.fintual.cl/goal/123456`, then `123456` is your goal ID.
   - **Actual Budget API key:** You can find your API key in the Actual Budget settings, search the documentation.
   - **Do not commit real credentials.** Use environment variables or secrets management for production.

---

## Usage

### 1. Scrape and Save Fintual Data
Fetch and process your Fintual investment data, saving it to `balance.json`:
```bash
bun run scraper
```

### 2. Import Data into Actual Budget
Import processed data from `balance.json` into your Actual Budget instance:
```bash
bun run actual
```

### 3. Run Both Steps Sequentially
Run both the scraper and the Actual Budget importer:
```bash
bun run start
```

### 4. Run Playwright Tests
Run browser-based tests and view reports:
```bash
npx playwright test
```
Test results and reports are available in the `playwright-report/` directory.

---

## Project Structure

- `src/scraper.ts` — Playwright script to log in to Fintual, fetch performance data, and save it as `balance.json`. Credentials and goal/account IDs are now loaded from environment variables (see `.env.example`).
- `src/actual.ts` — Imports data from `balance.json` into Actual Budget using the API. All sensitive data and dates are loaded from environment variables.
- `src/index.ts` — Fintual API client and helpers for direct API access.
- `tests/` — Automated and Playwright test specs.
- `tests-examples/` — Example Playwright tests.
- `playwright.config.ts` — Playwright configuration.
- `balance.json` — Output file with processed investment and deposit data.
- `tmp/actual-data/` — Local Actual Budget data cache.

---

## Notes & Tips

- **Sensitive Data:** Never commit real credentials or sensitive data. Use environment variables or secrets management for production.
- **Playwright Browsers:** If running Playwright for the first time, install browsers with:
  ```bash
  npx playwright install --with-deps
  ```
- **Customization:** Adjust goal/account IDs and credentials in the scripts to match your Fintual and Actual Budget setup.
- **Testing:** Add or update tests in `tests/` as you extend functionality. Run tests with your preferred runner (e.g., `bun test`, `npx vitest`).

---

This project was created using `bun init` (v1.1.2). [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
