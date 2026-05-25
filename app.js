import { scheduleToCsv } from "./src/csv.js";
import {
  generateSchedule,
  groupScheduleRowsByMonth,
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
  tableViewButton: document.querySelector("#tableViewButton"),
  monthViewButton: document.querySelector("#monthViewButton"),
  tableView: document.querySelector("#tableView"),
  monthView: document.querySelector("#monthView"),
  scheduleBody: document.querySelector("#scheduleBody"),
  periodLabel: document.querySelector("#periodLabel"),
  totalRowsLabel: document.querySelector("#totalRowsLabel"),
  visibleRowsLabel: document.querySelector("#visibleRowsLabel"),
};

let currentSchedule = null;
let currentView = initialScheduleView();

boot();

function boot() {
  loadInitialState();
  bindEvents();
  updateRosterCounts();
  setScheduleView(currentView);
  generate();
}

function bindEvents() {
  elements.generateButton.addEventListener("click", generate);
  elements.resetButton.addEventListener("click", resetDefaults);
  elements.csvButton.addEventListener("click", downloadCsv);
  elements.pdfButton.addEventListener("click", downloadPdf);
  elements.searchInput.addEventListener("input", renderScheduleRows);
  elements.tableViewButton.addEventListener("click", () => setScheduleView("table"));
  elements.monthViewButton.addEventListener("click", () => setScheduleView("month"));
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

function initialScheduleView() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "month" ? "month" : "table";
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
  elements.monthView.innerHTML = "";

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

  renderMonthView(rows);
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

function setScheduleView(view) {
  currentView = view;
  const showMonth = view === "month";
  elements.tableView.hidden = showMonth;
  elements.monthView.hidden = !showMonth;
  elements.tableViewButton.classList.toggle("is-active", !showMonth);
  elements.monthViewButton.classList.toggle("is-active", showMonth);
  elements.tableViewButton.setAttribute("aria-pressed", String(!showMonth));
  elements.monthViewButton.setAttribute("aria-pressed", String(showMonth));
}

function renderMonthView(rows) {
  const months = groupScheduleRowsByMonth(rows);

  if (months.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-months";
    empty.textContent = "Sin guardias visibles.";
    elements.monthView.append(empty);
    return;
  }

  for (const month of months) {
    const panel = document.createElement("article");
    panel.className = "month-panel";

    const heading = document.createElement("div");
    heading.className = "month-panel__heading";
    const title = document.createElement("h3");
    title.textContent = month.label;
    const count = document.createElement("span");
    count.textContent = `${month.rows.length} jueves`;
    heading.append(title, count);

    const weeks = document.createElement("div");
    weeks.className = "month-weeks";
    for (const row of month.rows) {
      weeks.append(renderMonthWeek(row));
    }

    panel.append(heading, weeks);
    elements.monthView.append(panel);
  }
}

function renderMonthWeek(row) {
  const week = document.createElement("section");
  week.className = "month-week";

  const date = document.createElement("time");
  date.className = "month-week__date";
  date.dateTime = row.isoDate;
  const day = document.createElement("strong");
  day.textContent = String(Number(row.isoDate.slice(8, 10)));
  const weekday = document.createElement("span");
  weekday.textContent = "jueves";
  date.append(day, weekday);

  week.append(
    date,
    renderCampusBlock("Santa Fe", row.santaFeSecond, row.santaFeFirst),
    renderCampusBlock("Observatorio", row.observatorioSecond, row.observatorioFirst),
  );
  return week;
}

function renderCampusBlock(campus, second, first) {
  const block = document.createElement("div");
  block.className = "month-campus";
  const title = document.createElement("strong");
  title.textContent = campus;
  block.append(title, renderCall("2do", second), renderCall("1er", first));
  return block;
}

function renderCall(label, name) {
  const row = document.createElement("span");
  row.className = "month-call";
  const callLabel = document.createElement("b");
  callLabel.textContent = label;
  const callName = document.createElement("span");
  callName.textContent = name;
  row.append(callLabel, callName);
  return row;
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
  elements.monthView.innerHTML = "";
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
