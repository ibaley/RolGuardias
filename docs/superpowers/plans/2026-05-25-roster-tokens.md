# Roster Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make campus rosters reorderable as numbered tokens and number schedule rows/weeks.

**Architecture:** Add small tested helpers for roster list mutations and week numbering in schedule rows. The app keeps hidden roster text sources for persistence and generation, while the visible UI becomes token lists with drag, up/down, delete, and add controls.

**Tech Stack:** Static HTML, CSS, JavaScript modules, Node test runner.

---

### Task 1: Numbered Weeks

**Files:**
- Modify: `src/schedule-engine.js`
- Modify: `src/csv.js`
- Modify: `tests/schedule-engine.test.js`
- Modify: `tests/csv.test.js`

- [ ] Add failing tests for `weekNumber` and CSV `Semana`.
- [ ] Add `weekNumber` to generated rows.
- [ ] Include week numbers in CSV.

### Task 2: Token Roster Helpers

**Files:**
- Create: `src/roster-tokens.js`
- Create: `tests/roster-tokens.test.js`

- [ ] Add failing tests for adding pasted names, moving names, and removing names.
- [ ] Implement pure roster mutation helpers.

### Task 3: Token UI

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `style.css`

- [ ] Replace visible roster textareas with numbered token lists.
- [ ] Keep hidden textareas as the source for saving, generation, reset, and validation.
- [ ] Add drag-and-drop, up/down, delete, and paste-add actions.
- [ ] Render `weekNumber` in table, month view, table PDF, and calendar PDF.

### Task 4: Verify And Publish

**Files:**
- Modify only if verification finds defects.

- [ ] Run `npm test`.
- [ ] Verify local browser behavior.
- [ ] Publish to GitHub Pages.
- [ ] Verify the public URL.
