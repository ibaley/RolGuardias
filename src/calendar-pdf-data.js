import { groupScheduleRowsByMonth } from "./schedule-engine.js";

export const CALENDAR_DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function buildCalendarPdfPages(rows) {
  const rowsByDate = new Map(rows.map((row) => [row.isoDate, row]));

  return groupScheduleRowsByMonth(rows).map((month) => {
    const [year, monthNumber] = month.key.split("-").map(Number);
    return {
      key: month.key,
      label: month.label,
      dayHeaders: CALENDAR_DAY_HEADERS,
      weeks: buildMonthWeeks(year, monthNumber, rowsByDate),
    };
  });
}

function buildMonthWeeks(year, monthNumber, rowsByDate) {
  const firstDate = new Date(year, monthNumber - 1, 1, 12, 0, 0, 0);
  const daysInMonth = new Date(year, monthNumber, 0, 12, 0, 0, 0).getDate();
  const leadingBlanks = mondayFirstWeekdayIndex(firstDate);
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const cells = [];

  for (let index = 0; index < totalCells; index += 1) {
    const day = index - leadingBlanks + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push({ day: null, isoDate: null, assignment: null, outsideMonth: true });
      continue;
    }

    const isoDate = toIsoDate(year, monthNumber, day);
    cells.push({
      day,
      isoDate,
      assignment: rowsByDate.get(isoDate) ?? null,
      outsideMonth: false,
    });
  }

  return chunk(cells, 7);
}

function mondayFirstWeekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function toIsoDate(year, monthNumber, day) {
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
