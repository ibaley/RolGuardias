import { buildCalendarPdfPages } from "./src/calendar-pdf-data.js";
import { scheduleToCsv } from "./src/csv.js";
import { addRosterNames, moveRosterName, removeRosterName } from "./src/roster-tokens.js";
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
  calendarPdfButton: document.querySelector("#calendarPdfButton"),
  csvButton: document.querySelector("#csvButton"),
  resetButton: document.querySelector("#resetButton"),
  validationMessages: document.querySelector("#validationMessages"),
  santaFeRoster: document.querySelector("#santaFeRoster"),
  observatorioRoster: document.querySelector("#observatorioRoster"),
  santaFeAddInput: document.querySelector("#santaFeAddInput"),
  santaFeAddButton: document.querySelector("#santaFeAddButton"),
  santaFeTokens: document.querySelector("#santaFeTokens"),
  observatorioAddInput: document.querySelector("#observatorioAddInput"),
  observatorioAddButton: document.querySelector("#observatorioAddButton"),
  observatorioTokens: document.querySelector("#observatorioTokens"),
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

const ROSTER_EDITORS = {
  santaFe: {
    source: elements.santaFeRoster,
    addInput: elements.santaFeAddInput,
    addButton: elements.santaFeAddButton,
    list: elements.santaFeTokens,
  },
  observatorio: {
    source: elements.observatorioRoster,
    addInput: elements.observatorioAddInput,
    addButton: elements.observatorioAddButton,
    list: elements.observatorioTokens,
  },
};

let currentSchedule = null;
let currentView = initialScheduleView();
let draggedRosterToken = null;

boot();

function boot() {
  loadInitialState();
  bindEvents();
  syncRosterTokenEditors();
  updateRosterCounts();
  setScheduleView(currentView);
  generate();
}

function bindEvents() {
  elements.generateButton.addEventListener("click", generate);
  elements.resetButton.addEventListener("click", resetDefaults);
  elements.csvButton.addEventListener("click", downloadCsv);
  elements.pdfButton.addEventListener("click", downloadPdf);
  elements.calendarPdfButton.addEventListener("click", downloadCalendarPdf);
  elements.searchInput.addEventListener("input", renderScheduleRows);
  elements.tableViewButton.addEventListener("click", () => setScheduleView("table"));
  elements.monthViewButton.addEventListener("click", () => setScheduleView("month"));
  bindRosterEditor("santaFe");
  bindRosterEditor("observatorio");
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
      row.weekNumber,
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
  const weekNumber = document.createElement("small");
  weekNumber.textContent = `Semana ${row.weekNumber}`;
  date.append(day, weekday, weekNumber);

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
  elements.santaFeAddInput.value = "";
  elements.observatorioAddInput.value = "";
  syncRosterTokenEditors();
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
      "Semana",
      "Fecha",
      "Santa Fe - 2do llamado",
      "Santa Fe - 1er llamado",
      "Observatorio - 2do llamado",
      "Observatorio - 1er llamado",
    ]],
    body: currentSchedule.rows.map((row) => [
      row.weekNumber,
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

function downloadCalendarPdf() {
  if (!currentSchedule) generate();
  if (!currentSchedule) return;

  const jsPdf = window.jspdf?.jsPDF;
  if (!jsPdf) {
    renderAlerts(["No se pudo cargar el exportador PDF."], "error");
    return;
  }

  const doc = new jsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
  const pages = buildCalendarPdfPages(currentSchedule.rows);
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    drawCalendarPdfPage(doc, page, pageIndex + 1, pages.length);
  });
  doc.save(`rol-guardias-calendario-${currentSchedule.startDateIso}.pdf`);
}

function drawCalendarPdfPage(doc, page, pageNumber, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const headerY = 9;
  const gridTop = 22;
  const dayHeaderHeight = 7;
  const footerHeight = 6;
  const gridWidth = pageWidth - margin * 2;
  const gridHeight = pageHeight - gridTop - margin - footerHeight;
  const cellWidth = gridWidth / 7;
  const cellHeight = (gridHeight - dayHeaderHeight) / page.weeks.length;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(27, 29, 35);
  doc.text(`Rol de Guardias - ${capitalize(page.label)}`, margin, headerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(104, 112, 125);
  doc.text(
    `${currentSchedule.startDateIso} - ${currentSchedule.endDateIso}`,
    pageWidth - margin,
    headerY,
    { align: "right" },
  );

  drawCalendarDayHeaders(doc, page, margin, gridTop, cellWidth, dayHeaderHeight);
  page.weeks.forEach((week, weekIndex) => {
    week.forEach((cell, dayIndex) => {
      const x = margin + dayIndex * cellWidth;
      const y = gridTop + dayHeaderHeight + weekIndex * cellHeight;
      drawCalendarCell(doc, cell, x, y, cellWidth, cellHeight);
    });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(104, 112, 125);
  doc.text(`Pagina ${pageNumber} de ${totalPages}`, margin, pageHeight - 5);
}

function drawCalendarDayHeaders(doc, page, x, y, cellWidth, height) {
  page.dayHeaders.forEach((day, index) => {
    const cellX = x + index * cellWidth;
    doc.setFillColor(34, 44, 58);
    doc.setDrawColor(34, 44, 58);
    doc.rect(cellX, y, cellWidth, height, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(day, cellX + cellWidth / 2, y + 4.8, { align: "center" });
  });
}

function drawCalendarCell(doc, cell, x, y, width, height) {
  if (cell.outsideMonth) {
    doc.setFillColor(245, 247, 248);
  } else if (cell.assignment) {
    doc.setFillColor(238, 248, 246);
  } else {
    doc.setFillColor(255, 255, 255);
  }

  doc.setDrawColor(217, 222, 231);
  doc.rect(x, y, width, height, "FD");

  if (!cell.day) return;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(27, 29, 35);
  doc.text(String(cell.day), x + 2, y + 5);

  if (!cell.assignment) return;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(104, 112, 125);
  doc.text(`S${cell.assignment.weekNumber}`, x + width - 2, y + 5, { align: "right" });

  const maxY = y + height - 2;
  let textY = y + 9;
  textY = drawCalendarPdfRole(doc, "SF 2", cell.assignment.santaFeSecond, x + 2, textY, width - 4, maxY);
  textY = drawCalendarPdfRole(doc, "SF 1", cell.assignment.santaFeFirst, x + 2, textY, width - 4, maxY);
  textY = drawCalendarPdfRole(doc, "OB 2", cell.assignment.observatorioSecond, x + 2, textY, width - 4, maxY);
  drawCalendarPdfRole(doc, "OB 1", cell.assignment.observatorioFirst, x + 2, textY, width - 4, maxY);
}

function drawCalendarPdfRole(doc, label, name, x, y, maxWidth, maxY) {
  if (y > maxY) return y;

  const labelWidth = 7;
  const lineHeight = 2.55;
  const availableLines = Math.max(1, Math.min(2, Math.floor((maxY - y) / lineHeight) + 1));
  const nameLines = splitPdfTextToFit(doc, name, maxWidth - labelWidth, availableLines);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.9);
  doc.setTextColor(104, 112, 125);
  doc.text(label, x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.9);
  doc.setTextColor(27, 29, 35);
  for (const line of nameLines) {
    if (y > maxY) break;
    doc.text(line, x + labelWidth, y);
    y += lineHeight;
  }

  return y + 0.5;
}

function splitPdfTextToFit(doc, text, maxWidth, maxLines) {
  const lines = doc.splitTextToSize(text, maxWidth);
  if (lines.length <= maxLines) return lines;

  const fitted = lines.slice(0, maxLines);
  fitted[maxLines - 1] = ellipsizePdfText(doc, lines.slice(maxLines - 1).join(" "), maxWidth);
  return fitted;
}

function ellipsizePdfText(doc, text, maxWidth) {
  let result = String(text);
  while (result.length > 1 && doc.getTextWidth(`${result}...`) > maxWidth) {
    result = result.slice(0, -1).trimEnd();
  }
  return `${result}...`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sumTotals(rows) {
  return rows.reduce((total, row) => total + row.total, 0);
}

function bindRosterEditor(campus) {
  const editor = ROSTER_EDITORS[campus];
  editor.addButton.addEventListener("click", () => addRosterTokens(campus));
  editor.addInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      addRosterTokens(campus);
    }
  });
  editor.list.addEventListener("click", (event) => handleRosterTokenClick(event, campus));
  editor.list.addEventListener("dragstart", (event) => handleRosterDragStart(event, campus));
  editor.list.addEventListener("dragover", (event) => handleRosterDragOver(event, campus));
  editor.list.addEventListener("dragleave", (event) => handleRosterDragLeave(event));
  editor.list.addEventListener("drop", (event) => handleRosterDrop(event, campus));
  editor.list.addEventListener("dragend", () => clearRosterDragState());
}

function syncRosterTokenEditors() {
  renderRosterTokens("santaFe");
  renderRosterTokens("observatorio");
}

function rosterNames(campus) {
  return parseRoster(ROSTER_EDITORS[campus].source.value);
}

function setRosterNames(campus, names) {
  ROSTER_EDITORS[campus].source.value = names.join("\n");
  renderRosterTokens(campus);
  updateRosterCounts();
  generate();
}

function addRosterTokens(campus) {
  const editor = ROSTER_EDITORS[campus];
  const nextNames = addRosterNames(rosterNames(campus), editor.addInput.value);
  editor.addInput.value = "";
  setRosterNames(campus, nextNames);
}

function renderRosterTokens(campus) {
  const editor = ROSTER_EDITORS[campus];
  editor.list.innerHTML = "";

  rosterNames(campus).forEach((name, index) => {
    const item = document.createElement("li");
    item.className = "roster-token";
    item.dataset.index = String(index);

    const number = document.createElement("span");
    number.className = "roster-token__number";
    number.textContent = String(index + 1);

    const handle = document.createElement("button");
    handle.className = "roster-token__handle";
    handle.type = "button";
    handle.draggable = true;
    handle.title = "Arrastrar";
    handle.setAttribute("aria-label", `Arrastrar ${name}`);
    handle.textContent = "≡";

    const label = document.createElement("span");
    label.className = "roster-token__name";
    label.textContent = name;

    const actions = document.createElement("div");
    actions.className = "roster-token__actions";
    const upButton = rosterTokenButton("up", "↑", `Subir ${name}`);
    const downButton = rosterTokenButton("down", "↓", `Bajar ${name}`);
    const removeButton = rosterTokenButton("remove", "×", `Quitar ${name}`);
    upButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setRosterNames(campus, moveRosterName(rosterNames(campus), index, index - 1));
    });
    downButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setRosterNames(campus, moveRosterName(rosterNames(campus), index, index + 1));
    });
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setRosterNames(campus, removeRosterName(rosterNames(campus), index));
    });
    actions.append(upButton, downButton, removeButton);

    item.append(number, handle, label, actions);
    editor.list.append(item);
  });
}

function rosterTokenButton(action, label, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.title = ariaLabel;
  button.setAttribute("aria-label", ariaLabel);
  button.textContent = label;
  return button;
}

function handleRosterTokenClick(event, campus) {
  const button = event.target.closest("button[data-action]");
  const item = event.target.closest(".roster-token");
  if (!button || !item) return;

  const index = Number(item.dataset.index);
  const names = rosterNames(campus);
  if (button.dataset.action === "up") {
    setRosterNames(campus, moveRosterName(names, index, index - 1));
  }
  if (button.dataset.action === "down") {
    setRosterNames(campus, moveRosterName(names, index, index + 1));
  }
  if (button.dataset.action === "remove") {
    setRosterNames(campus, removeRosterName(names, index));
  }
}

function handleRosterDragStart(event, campus) {
  const item = event.target.closest(".roster-token");
  if (!item) return;

  draggedRosterToken = {
    campus,
    index: Number(item.dataset.index),
  };
  item.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", item.dataset.index);
}

function handleRosterDragOver(event, campus) {
  if (!draggedRosterToken || draggedRosterToken.campus !== campus) return;

  event.preventDefault();
  const item = event.target.closest(".roster-token");
  ROSTER_EDITORS[campus].list.querySelectorAll(".is-drop-target").forEach((target) => {
    target.classList.remove("is-drop-target");
  });
  if (item) item.classList.add("is-drop-target");
}

function handleRosterDragLeave(event) {
  const item = event.target.closest(".roster-token");
  if (item) item.classList.remove("is-drop-target");
}

function handleRosterDrop(event, campus) {
  if (!draggedRosterToken || draggedRosterToken.campus !== campus) return;

  event.preventDefault();
  const item = event.target.closest(".roster-token");
  const names = rosterNames(campus);
  const targetIndex = item ? Number(item.dataset.index) : names.length - 1;
  setRosterNames(campus, moveRosterName(names, draggedRosterToken.index, targetIndex));
  clearRosterDragState();
}

function clearRosterDragState() {
  document.querySelectorAll(".is-dragging, .is-drop-target").forEach((item) => {
    item.classList.remove("is-dragging", "is-drop-target");
  });
  draggedRosterToken = null;
}
