import assert from "node:assert/strict";
import test from "node:test";

import { buildCalendarPdfPages } from "../src/calendar-pdf-data.js";
import { generateSchedule } from "../src/schedule-engine.js";

test("buildCalendarPdfPages creates Monday-first month grids with assignments on Thursdays", () => {
  const schedule = generateSchedule({
    startDate: "2026-06-04",
    weeks: 5,
    rosters: {
      santaFe: ["A", "B", "C"],
      observatorio: ["X", "Y", "Z"],
    },
  });

  const pages = buildCalendarPdfPages(schedule.rows);
  const june = pages[0];
  const firstWeek = june.weeks[0];

  assert.deepEqual(june.dayHeaders, ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
  assert.equal(june.key, "2026-06");
  assert.equal(june.label, "junio 2026");
  assert.equal(june.weeks.length, 5);
  assert.deepEqual(
    firstWeek.map((cell) => [cell.day, cell.isoDate, Boolean(cell.assignment)]),
    [
      [1, "2026-06-01", false],
      [2, "2026-06-02", false],
      [3, "2026-06-03", false],
      [4, "2026-06-04", true],
      [5, "2026-06-05", false],
      [6, "2026-06-06", false],
      [7, "2026-06-07", false],
    ],
  );
  assert.equal(firstWeek[3].assignment.santaFeFirst, "A");
  assert.equal(firstWeek[3].assignment.observatorioSecond, "Y");
});
