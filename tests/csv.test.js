import assert from "node:assert/strict";
import test from "node:test";

import { scheduleToCsv } from "../src/csv.js";

test("scheduleToCsv uses historical columns and quotes comma values", () => {
  const csv = scheduleToCsv([
    {
      weekNumber: 1,
      displayDate: "jueves, 4 de junio de 2026",
      santaFeSecond: "B",
      santaFeFirst: "A",
      observatorioSecond: "Y",
      observatorioFirst: "X",
    },
  ]);

  assert.equal(
    csv,
    [
      "Semana,Fecha,Santa Fe - 2do llamado,Santa Fe - 1er llamado,Observatorio - 2do llamado,Observatorio - 1er llamado",
      '1,"jueves, 4 de junio de 2026",B,A,Y,X',
    ].join("\n"),
  );
});
