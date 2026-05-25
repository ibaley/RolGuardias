# Calendar Month View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a month-grouped calendar view to RolGuardias without changing the schedule logic.

**Architecture:** Add a tested grouping helper in the schedule engine, then render a second schedule surface from the same filtered rows used by the table. The UI keeps the existing table and adds a compact `Tabla / Calendario` switch.

**Tech Stack:** Static HTML, CSS, JavaScript modules, Node test runner.

---

### Task 1: Month Grouping Helper

**Files:**
- Modify: `src/schedule-engine.js`
- Modify: `tests/schedule-engine.test.js`

- [ ] Add a failing test that proves rows crossing a month boundary are grouped into month buckets.
- [ ] Implement `groupScheduleRowsByMonth(rows)` with stable `key`, Spanish `label`, and ordered `rows`.
- [ ] Run `npm test`.

### Task 2: Calendar View UI

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `style.css`

- [ ] Add `Tabla` and `Calendario` view buttons in the schedule header.
- [ ] Render the current filtered rows as month panels when calendar view is selected.
- [ ] Keep search, generate, reset, CSV, and PDF behavior intact.
- [ ] Verify in the browser at desktop and mobile widths.
