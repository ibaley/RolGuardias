import assert from "node:assert/strict";
import test from "node:test";

import { addRosterNames, moveRosterName, removeRosterName } from "../src/roster-tokens.js";

test("addRosterNames appends pasted newline-separated names", () => {
  assert.deepEqual(addRosterNames(["A"], " B  \n\nC\tC "), ["A", "B", "C C"]);
});

test("moveRosterName reorders one token without mutating the original list", () => {
  const original = ["A", "B", "C", "D"];

  assert.deepEqual(moveRosterName(original, 3, 1), ["A", "D", "B", "C"]);
  assert.deepEqual(original, ["A", "B", "C", "D"]);
});

test("removeRosterName removes the selected token", () => {
  assert.deepEqual(removeRosterName(["A", "B", "C"], 1), ["A", "C"]);
});
