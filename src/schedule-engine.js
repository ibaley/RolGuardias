const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const THURSDAY = 4;

export function parseRoster(value) {
  const rows = Array.isArray(value) ? value : String(value ?? "").split("\n");
  return rows.map(normalizeDisplayName).filter(Boolean);
}

export function normalizeDisplayName(name) {
  return String(name ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeNameKey(name) {
  return normalizeDisplayName(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

export function validateRosters(rosters) {
  const santaFe = parseRoster(rosters.santaFe);
  const observatorio = parseRoster(rosters.observatorio);
  const errors = [];

  if (santaFe.length < 2) errors.push("Santa Fe necesita al menos 2 integrantes.");
  if (observatorio.length < 2) {
    errors.push("Observatorio necesita al menos 2 integrantes.");
  }

  const santaFeDuplicates = findDuplicates(santaFe);
  const observatorioDuplicates = findDuplicates(observatorio);
  if (santaFeDuplicates.length > 0) {
    errors.push(`Santa Fe tiene nombres duplicados: ${santaFeDuplicates.join(", ")}.`);
  }
  if (observatorioDuplicates.length > 0) {
    errors.push(`Observatorio tiene nombres duplicados: ${observatorioDuplicates.join(", ")}.`);
  }

  const santaFeKeys = new Map(santaFe.map((name) => [normalizeNameKey(name), name]));
  const crossCampus = observatorio.filter((name) => santaFeKeys.has(normalizeNameKey(name)));
  if (crossCampus.length > 0) {
    errors.push(`Hay médicos en ambos campus: ${crossCampus.join(", ")}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    rosters: { santaFe, observatorio },
  };
}

export function generateSchedule({ startDate, weeks, rosters }) {
  const parsedWeeks = Number.parseInt(weeks, 10);
  if (!Number.isInteger(parsedWeeks) || parsedWeeks < 1) {
    throw new Error("El número de semanas debe ser mayor a 0.");
  }

  const validation = validateRosters(rosters);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const firstDate = getNextThursday(parseLocalDate(startDate));
  const rows = [];

  for (let weekIndex = 0; weekIndex < parsedWeeks; weekIndex += 1) {
    const currentDate = addDays(firstDate, weekIndex * 7);
    const santaFe = assignmentForWeek(validation.rosters.santaFe, weekIndex);
    const observatorio = assignmentForWeek(validation.rosters.observatorio, weekIndex);

    rows.push({
      isoDate: toIsoDate(currentDate),
      displayDate: formatSpanishDate(currentDate),
      santaFeSecond: santaFe.second,
      santaFeFirst: santaFe.first,
      observatorioSecond: observatorio.second,
      observatorioFirst: observatorio.first,
    });
  }

  return {
    startDateIso: toIsoDate(firstDate),
    endDateIso: rows.at(-1)?.isoDate ?? toIsoDate(firstDate),
    rows,
    rosters: validation.rosters,
  };
}

export function summarizeSchedule(rows) {
  return {
    santaFe: summarizeCampus(rows, "santaFe"),
    observatorio: summarizeCampus(rows, "observatorio"),
  };
}

export function groupScheduleRowsByMonth(rows) {
  const months = [];
  const monthByKey = new Map();

  for (const row of rows) {
    const date = parseLocalDate(row.isoDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthByKey.has(key)) {
      const month = {
        key,
        label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
        rows: [],
      };
      monthByKey.set(key, month);
      months.push(month);
    }

    monthByKey.get(key).rows.push(row);
  }

  return months;
}

export function formatSpanishDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

export function parseLocalDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("Selecciona una fecha válida.");

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error("Selecciona una fecha válida.");
  }
  return date;
}

export function getNextThursday(date) {
  const daysUntilThursday = (THURSDAY - date.getDay() + 7) % 7;
  return addDays(date, daysUntilThursday);
}

function assignmentForWeek(names, weekIndex) {
  return {
    first: names[weekIndex % names.length],
    second: names[(weekIndex + 1) % names.length],
  };
}

function summarizeCampus(rows, campus) {
  const people = new Map();
  const firstKey = `${campus}First`;
  const secondKey = `${campus}Second`;

  for (const row of rows) {
    addCount(people, row[firstKey], "first");
    addCount(people, row[secondKey], "second");
  }

  return Array.from(people.values()).map((person) => ({
    ...person,
    total: person.first + person.second,
  }));
}

function addCount(people, name, role) {
  if (!people.has(name)) people.set(name, { name, first: 0, second: 0 });
  people.get(name)[role] += 1;
}

function findDuplicates(names) {
  const seen = new Set();
  const duplicates = [];
  for (const name of names) {
    const key = normalizeNameKey(name);
    if (seen.has(key)) duplicates.push(name);
    seen.add(key);
  }
  return duplicates;
}

function addDays(date, days) {
  const next = new Date(date.valueOf());
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
