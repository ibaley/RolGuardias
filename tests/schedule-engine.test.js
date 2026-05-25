import assert from "node:assert/strict";
import test from "node:test";

import {
  generateSchedule,
  groupScheduleRowsByMonth,
  parseRoster,
  summarizeSchedule,
  validateRosters,
} from "../src/schedule-engine.js";

test("parseRoster trims blanks and collapses internal whitespace", () => {
  assert.deepEqual(parseRoster("  A  A  \n\nB\tB\n C "), ["A A", "B B", "C"]);
});

test("generateSchedule snaps start date to the next Thursday and rotates second to first", () => {
  const schedule = generateSchedule({
    startDate: "2026-06-01",
    weeks: 3,
    rosters: {
      santaFe: ["A", "B", "C"],
      observatorio: ["X", "Y", "Z"],
    },
  });

  assert.equal(schedule.startDateIso, "2026-06-04");
  assert.deepEqual(
    schedule.rows.map((row) => [row.isoDate, row.santaFeFirst, row.santaFeSecond]),
    [
      ["2026-06-04", "A", "B"],
      ["2026-06-11", "B", "C"],
      ["2026-06-18", "C", "A"],
    ],
  );
});

test("campuses rotate independently when list lengths differ", () => {
  const schedule = generateSchedule({
    startDate: "2026-06-04",
    weeks: 4,
    rosters: {
      santaFe: ["A", "B", "C"],
      observatorio: ["W", "X", "Y", "Z"],
    },
  });

  assert.deepEqual(
    schedule.rows.map((row) => [row.santaFeFirst, row.santaFeSecond]),
    [
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
      ["A", "B"],
    ],
  );
  assert.deepEqual(
    schedule.rows.map((row) => [row.observatorioFirst, row.observatorioSecond]),
    [
      ["W", "X"],
      ["X", "Y"],
      ["Y", "Z"],
      ["Z", "W"],
    ],
  );
});

test("summarizeSchedule counts first, second, and total assignments", () => {
  const schedule = generateSchedule({
    startDate: "2026-06-04",
    weeks: 3,
    rosters: {
      santaFe: ["A", "B", "C"],
      observatorio: ["X", "Y", "Z"],
    },
  });

  const summary = summarizeSchedule(schedule.rows);

  assert.deepEqual(summary.santaFe.find((item) => item.name === "A"), {
    name: "A",
    first: 1,
    second: 1,
    total: 2,
  });
  assert.deepEqual(summary.observatorio.find((item) => item.name === "Y"), {
    name: "Y",
    first: 1,
    second: 1,
    total: 2,
  });
});

test("groupScheduleRowsByMonth groups generated Thursdays by Spanish month", () => {
  const schedule = generateSchedule({
    startDate: "2026-06-25",
    weeks: 3,
    rosters: {
      santaFe: ["A", "B", "C"],
      observatorio: ["X", "Y", "Z"],
    },
  });

  const months = groupScheduleRowsByMonth(schedule.rows);

  assert.deepEqual(
    months.map((month) => ({
      key: month.key,
      label: month.label,
      dates: month.rows.map((row) => row.isoDate),
    })),
    [
      {
        key: "2026-06",
        label: "junio 2026",
        dates: ["2026-06-25"],
      },
      {
        key: "2026-07",
        label: "julio 2026",
        dates: ["2026-07-02", "2026-07-09"],
      },
    ],
  );
});

test("validateRosters reports duplicate names and cross-campus duplicates", () => {
  const result = validateRosters({
    santaFe: ["Ana", "ANA", "Luis"],
    observatorio: ["Luis", "Rosa"],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "Santa Fe tiene nombres duplicados: ANA.",
    "Hay médicos en ambos campus: Luis.",
  ]);
});

test("validateRosters requires at least two people per campus", () => {
  const result = validateRosters({
    santaFe: ["Ana"],
    observatorio: ["Luis", "Rosa"],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["Santa Fe necesita al menos 2 integrantes."]);
});
