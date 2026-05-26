import { parseRoster } from "./schedule-engine.js";

export function addRosterNames(names, value) {
  return [...names, ...parseRoster(value)];
}

export function moveRosterName(names, fromIndex, toIndex) {
  if (!isValidIndex(names, fromIndex)) return [...names];

  const next = [...names];
  const [name] = next.splice(fromIndex, 1);
  const targetIndex = Math.max(0, Math.min(toIndex, next.length));
  next.splice(targetIndex, 0, name);
  return next;
}

export function removeRosterName(names, index) {
  if (!isValidIndex(names, index)) return [...names];

  const next = [...names];
  next.splice(index, 1);
  return next;
}

function isValidIndex(names, index) {
  return Number.isInteger(index) && index >= 0 && index < names.length;
}
