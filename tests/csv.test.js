import assert from "node:assert/strict";
import test from "node:test";

import { scheduleToCsv } from "../src/csv.js";

test("scheduleToCsv uses historical columns and quotes comma values", () => {
  const csv = scheduleToCsv([
    {
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
      "Fecha,Santa Fe - 2do llamado,Santa Fe - 1er llamado,Observatorio - 2do llamado,Observatorio - 1er llamado",
      '"jueves, 4 de junio de 2026",B,A,Y,X',
    ].join("\n"),
  );
});
