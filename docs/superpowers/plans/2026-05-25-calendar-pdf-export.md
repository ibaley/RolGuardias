# Calendar PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export the generated role as a normal month-by-month PDF calendar with weekly assignments.

**Architecture:** Keep the existing table PDF and add a separate calendar PDF export. A tested helper builds month grid data; the browser app draws one landscape PDF page per month with role text inside the weekly Thursday cells.

**Tech Stack:** Static HTML, JavaScript modules, jsPDF, Node test runner.

---

### Task 1: Calendar Grid Data

**Files:**
- Create: `src/calendar-pdf-data.js`
- Create: `tests/calendar-pdf-data.test.js`

- [ ] Write a failing test for Monday-first calendar month grids.
- [ ] Implement month pages with day headers, blank cells, real date cells, and assignments attached by ISO date.
- [ ] Run `npm test`.

### Task 2: PDF Export Control

**Files:**
- Modify: `index.html`
- Modify: `app.js`

- [ ] Rename the current PDF button to `PDF tabla`.
- [ ] Add `PDF calendario`.
- [ ] Draw one landscape A4 page per month using jsPDF primitives.
- [ ] Keep CSV and table PDF behavior unchanged.

### Task 3: Verification

**Files:**
- Modify only if verification finds a defect.

- [ ] Run `npm test`.
- [ ] Verify the app in the browser.
- [ ] Publish to GitHub Pages and verify the public URL.
