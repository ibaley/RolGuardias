import { scheduleToCsv } from "./src/csv.js";
import {
  generateSchedule,
  normalizeNameKey,
  parseRoster,
  summarizeSchedule,
  validateRosters,
} from "./src/schedule-engine.js";
import {
  DEFAULT_ROSTERS,
  DEFAULT_START_DATE,
  DEFAULT_WEEKS,
} from "./src/default-rosters.js";

const STORAGE_KEY = "rolguardias:v2";

const elements = {
  startDate: document.querySelector("#startDate"),
  weekCount: document.querySelector("#weekCount"),
  searchInput: document.querySelector("#searchInput"),
  generateButton: document.querySelector("#generateButton"),
  pdfButton: document.querySelector("#pdfButton"),
  csvButton: document.querySelector("#csvButton"),
  resetButton: document.querySelector("#resetButton"),
  validationMessages: document.querySelector("#validationMessages"),
  santaFeRoster: document.querySelector("#santaFeRoster"),
  observatorioRoster: document.querySelector("#observatorioRoster"),
  santaFeCount: document.querySelector("#santaFeCount"),
  observatorioCount: document.querySelector("#observatorioCount"),
  santaFeSummary: document.querySelector("#santaFeSummary"),
  observatorioSummary: document.querySelector("#observatorioSummary"),
  santaFeAssignments: document.querySelector("#santaFeAssignments"),
  observatorioAssignments: document.querySelector("#observatorioAssignments"),
  scheduleBody: document.querySelector("#scheduleBody"),
  periodLabel: document.querySelector("#periodLabel"),
  totalRowsLabel: document.querySelector("#totalRowsLabel"),
  visibleRowsLabel: document.querySelector("#visibleRowsLabel"),
};

let currentSchedule = null;

boot();

function boot() {
  loadInitialState();
  bindEvents();
  updateRosterCounts();
  generate();
}

function bindEvents() {
  elements.generateButton.addEventListener("click", generate);
  elements.resetButton.addEventListener("click", resetDefaults);
  elements.csvButton.addEventListener("click", downloadCsv);
  elements.pdfButton.addEventListener("click", downloadPdf);
  elements.searchInput.addEventListener("input", renderScheduleRows);
  elements.santaFeRoster.addEventListener("input", updateRosterCounts);
  elements.observatorioRoster.addEventListener("input", updateRosterCounts);
}

function loadInitialState() {
  const saved = readSavedState();
  elements.startDate.value = saved?.startDate ?? DEFAULT_START_DATE;
  elements.weekCount.value = saved?.weeks ?? String(DEFAULT_WEEKS);
  elements.santaFeRoster.value = saved?.santaFe ?? DEFAULT_ROSTERS.santaFe.join("\n");
  elements.observatorioRoster.value = saved?.observatorio ?? DEFAULT_ROSTERS.observatorio.join("\n");
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      startDate: elements.startDate.value,
      weeks: elements.weekCount.value,
      santaFe: elements.santaFeRoster.value,
      observatorio: elements.observatorioRoster.value,
    }),
  );
}

function formRosters() {
  return {
    santaFe: parseRoster(elements.santaFeRoster.value),
    observatorio: parseRoster(elements.observatorioRoster.value),
  };
}

function generate() {
  const rosters = formRosters();
  const validation = validateRosters(rosters);
  if (!validation.valid) {
    currentSchedule = null;
    renderAlerts(validation.errors, "error");
    clearOutput();
    updateRosterCounts();
    return;
  }

  try {
    currentSchedule = generateSchedule({
      startDate: elements.startDate.value,
      weeks: elements.weekCount.value,
      rosters,
    });
  } catch (error) {
    currentSchedule = null;
    renderAlerts([error.message], "error");
    clearOutput();
    return;
  }

  saveState();
  renderAlerts([`Rol generado: ${currentSchedule.startDateIso} a ${currentSchedule.endDateIso}.`], "ok");
  renderSummary();
  renderScheduleRows();
  updateMetadata();
}

function renderAlerts(messages, tone) {
  elements.validationMessages.innerHTML = "";
  for (const message of messages) {
    const item = document.createElement("div");
    item.className = `alert alert--${tone}`;
    item.textContent = message;
    elements.validationMessages.append(item);
  }
}

function renderSummary() {
  const summary = summarizeSchedule(currentSchedule.rows);
  renderSummaryList(elements.santaFeSummary, summary.santaFe);
  renderSummaryList(elements.observatorioSummary, summary.observatorio);
  elements.santaFeAssignments.textContent = String(sumTotals(summary.santaFe));
  elements.observatorioAssignments.textContent = String(sumTotals(summary.observatorio));
}

function renderSummaryList(container, rows) {
  container.innerHTML = "";
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "summary-row";
    const name = document.createElement("span");
    name.textContent = row.name;
    const total = document.createElement("strong");
    total.textContent = String(row.total);
    const detail = document.createElement("small");
    detail.textContent = `1: ${row.first} / 2: ${row.second}`;
    item.append(name, total, detail);
    container.append(item);
  }
}

function renderScheduleRows() {
  elements.scheduleBody.innerHTML = "";

  if (!currentSchedule) {
    elements.visibleRowsLabel.textContent = "0 visibles";
    return;
  }

  const query = normalizeNameKey(elements.searchInput.value);
  const rows = currentSchedule.rows.filter((row) => rowMatches(row, query));

  for (const row of rows) {
    const tr = document.createElement("tr");
    appendTableCells(tr, [
      row.displayDate,
      row.santaFeSecond,
      row.santaFeFirst,
      row.observatorioSecond,
      row.observatorioFirst,
    ]);
    elements.scheduleBody.append(tr);
  }

  elements.visibleRowsLabel.textContent = `${rows.length} visibles`;
}

function appendTableCells(rowElement, values) {
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    rowElement.append(cell);
  }
}

function rowMatches(row, query) {
  if (!query) return true;
  return [
    row.displayDate,
    row.santaFeSecond,
    row.santaFeFirst,
    row.observatorioSecond,
    row.observatorioFirst,
  ].some((value) => normalizeNameKey(value).includes(query));
}

function updateRosterCounts() {
  elements.santaFeCount.textContent = `${parseRoster(elements.santaFeRoster.value).length} integrantes`;
  elements.observatorioCount.textContent = `${parseRoster(elements.observatorioRoster.value).length} integrantes`;
}

function updateMetadata() {
  if (!currentSchedule) {
    elements.periodLabel.textContent = "Sin generar";
    elements.totalRowsLabel.textContent = "0 semanas";
    return;
  }
  elements.periodLabel.textContent = `${currentSchedule.startDateIso} - ${currentSchedule.endDateIso}`;
  elements.totalRowsLabel.textContent = `${currentSchedule.rows.length} semanas`;
}

function clearOutput() {
  elements.santaFeSummary.innerHTML = "";
  elements.observatorioSummary.innerHTML = "";
  elements.scheduleBody.innerHTML = "";
  elements.santaFeAssignments.textContent = "0";
  elements.observatorioAssignments.textContent = "0";
  elements.periodLabel.textContent = "Sin generar";
  elements.totalRowsLabel.textContent = "0 semanas";
  elements.visibleRowsLabel.textContent = "0 visibles";
}

function resetDefaults() {
  localStorage.removeItem(STORAGE_KEY);
  elements.startDate.value = DEFAULT_START_DATE;
  elements.weekCount.value = String(DEFAULT_WEEKS);
  elements.searchInput.value = "";
  elements.santaFeRoster.value = DEFAULT_ROSTERS.santaFe.join("\n");
  elements.observatorioRoster.value = DEFAULT_ROSTERS.observatorio.join("\n");
  updateRosterCounts();
  generate();
}

function downloadCsv() {
  if (!currentSchedule) generate();
  if (!currentSchedule) return;

  const blob = new Blob([scheduleToCsv(currentSchedule.rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rol-guardias-${currentSchedule.startDateIso}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadPdf() {
  if (!currentSchedule) generate();
  if (!currentSchedule) return;

  const jsPdf = window.jspdf?.jsPDF;
  if (!jsPdf) {
    renderAlerts(["No se pudo cargar el exportador PDF."], "error");
    return;
  }

  const doc = new jsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.autoTable({
    head: [[
      "Fecha",
      "Santa Fe - 2do llamado",
      "Santa Fe - 1er llamado",
      "Observatorio - 2do llamado",
      "Observatorio - 1er llamado",
    ]],
    body: currentSchedule.rows.map((row) => [
      row.displayDate,
      row.santaFeSecond,
      row.santaFeFirst,
      row.observatorioSecond,
      row.observatorioFirst,
    ]),
    startY: 18,
    margin: { top: 16, right: 7, bottom: 10, left: 7 },
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.4, valign: "middle" },
    headStyles: { fillColor: [34, 44, 58], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 250] },
    didDrawPage(data) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Calendario de Guardias CPR ABC", data.settings.margin.left, 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `Periodo: ${currentSchedule.startDateIso} - ${currentSchedule.endDateIso}`,
        data.settings.margin.left,
        13,
      );
      doc.setFontSize(7);
      doc.text(
        `Página ${data.pageNumber}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 5,
      );
    },
  });
  doc.save(`rol-guardias-${currentSchedule.startDateIso}.pdf`);
}

function sumTotals(rows) {
  return rows.reduce((total, row) => total + row.total, 0);
}
