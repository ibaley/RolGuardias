const HEADERS = [
  "Semana",
  "Fecha",
  "Santa Fe - 2do llamado",
  "Santa Fe - 1er llamado",
  "Observatorio - 2do llamado",
  "Observatorio - 1er llamado",
];

export function scheduleToCsv(rows) {
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.weekNumber,
        row.displayDate,
        row.santaFeSecond,
        row.santaFeFirst,
        row.observatorioSecond,
        row.observatorioFirst,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
