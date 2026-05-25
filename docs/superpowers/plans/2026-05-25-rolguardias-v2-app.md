# RolGuardias v2 App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub Pages app for CPR ABC guard schedule generation, validation, search, counts, PDF export, and CSV export.

**Architecture:** Keep the rotation engine as pure ESM functions under `src/`, with browser UI in `app.js`. Tests run in Node with the built-in `node:test` runner so the schedule logic is verified without a browser.

**Tech Stack:** Vanilla HTML/CSS/JavaScript ESM, Node built-in test runner, jsPDF + AutoTable CDN for PDF export.

---

### Task 1: Test the Schedule Engine

**Files:**
- Create: `package.json`
- Create: `tests/schedule-engine.test.js`
- Create: `tests/csv.test.js`

- [ ] **Step 1: Add Node test harness**

Create `package.json` with ESM enabled and `npm test` mapped to `node --test`.

- [ ] **Step 2: Write failing schedule tests**

Tests must import `parseRoster`, `validateRosters`, `generateSchedule`, and `summarizeSchedule` from `../src/schedule-engine.js`. They must cover next-Thursday snapping, independent campus rotation, wraparound, counts, and duplicate validation.

- [ ] **Step 3: Write failing CSV test**

Test must import `scheduleToCsv` from `../src/csv.js` and verify CSV headers plus quoted values.

- [ ] **Step 4: Run tests**

Run `npm test`. Expected result: fail because `src/schedule-engine.js` and `src/csv.js` do not exist yet.

### Task 2: Implement Pure Data and Engine

**Files:**
- Create: `src/default-rosters.js`
- Create: `src/schedule-engine.js`
- Create: `src/csv.js`

- [ ] **Step 1: Add default roster data**

Add the approved 16 Santa Fe and 15 Observatorio names in `DEFAULT_ROSTERS`, plus `DEFAULT_START_DATE = "2026-06-04"` and `DEFAULT_WEEKS = 52`.

- [ ] **Step 2: Implement schedule engine**

Implement pure functions for parsing names, normalizing duplicate keys, validating rosters, snapping dates to Thursday, generating rows, and summarizing assignment counts.

- [ ] **Step 3: Implement CSV export helper**

Implement `scheduleToCsv(rows)` with the historical column order.

- [ ] **Step 4: Run tests**

Run `npm test`. Expected result: all tests pass.

### Task 3: Build the App UI

**Files:**
- Replace: `index.html`
- Replace: `style.css`
- Replace: `script.js`
- Create: `app.js`

- [ ] **Step 1: Replace HTML shell**

Build one screen with schedule controls, two campus textareas, validation area, search, counts, schedule table, and export buttons. Load jsPDF/AutoTable from CDN and `app.js` as `type="module"`.

- [ ] **Step 2: Replace CSS**

Use a compact work-focused interface with stable table/card dimensions, responsive layout, and printable/export-friendly hierarchy.

- [ ] **Step 3: Implement UI behavior**

Wire defaults, localStorage persistence, generate/reset buttons, validation rendering, search filtering, counts rendering, CSV download, and PDF download.

- [ ] **Step 4: Run tests**

Run `npm test`. Expected result: all tests still pass.

### Task 4: Verify Locally

**Files:**
- No new files required.

- [ ] **Step 1: Serve static app**

Run `python3 -m http.server 4173` in the repo.

- [ ] **Step 2: Open browser**

Open `http://127.0.0.1:4173/` and confirm the app loads with default rosters.

- [ ] **Step 3: Manual functional checks**

Generate schedule, search for `DANIEL`, confirm counts render, download CSV, and verify the table starts with Santa Fe `GERARDO`/`DAVID` and Observatorio `FEDERICO`/`MARIO`.

- [ ] **Step 4: Final commit**

Commit the finished app after tests and browser checks pass.
