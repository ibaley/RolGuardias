document.addEventListener('DOMContentLoaded', () => {
    // Acceso a jsPDF globalmente (asegúrate de que esté cargado en index.html)
    const { jsPDF } = window.jspdf;

    // DOM Elements
    const startDateInput = document.getElementById('startDate');
    const numWeeksSelect = document.getElementById('numWeeks');
    const santaFeNamesTextarea = document.getElementById('santaFeNames');
    const observatorioNamesTextarea = document.getElementById('observatorioNames');
    const generateButton = document.getElementById('generateButton');
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const clearButton = document.getElementById('clearButton');
    const calendarTableContainer = document.getElementById('calendarTableContainer');

    // Nombres de meses y días en español
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

    // Almacenar los datos del calendario para el PDF y la tabla HTML
    let calendarioGenerado = {
        columnHeaders: ["Fecha", "Santa Fe - 2do Llamado", "Santa Fe - 1er Llamado", "Observatorio - 2do Llamado", "Observatorio - 1er Llamado"],
        dataRows: [],
        fechaInicioOriginal: null,
        fechaFinOriginal: null // Se calculará al generar
    };

    // --- Funciones Auxiliares ---
    function formatDate(date, includeDayName = true) {
        const dayName = diasSemana[date.getDay()];
        const day = date.getDate();
        const monthName = meses[date.getMonth()];
        const year = date.getFullYear();
        return includeDayName ? `${dayName}, ${day} de ${monthName} de ${year}` : `${day} de ${monthName} de ${year}`;
    }

    function getNextThursday(date) {
        const d = new Date(date.valueOf());
        const dayOfWeek = d.getDay();
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
        d.setDate(d.getDate() + daysUntilThursday);
        return d;
    }

    function parseNames(namesString) {
        return namesString.split('\n')
                          .map(name => name.trim())
                          .filter(name => name.length > 0);
    }

    // --- localStorage Functions ---
    function loadInputsFromStorage() {
        startDateInput.value = localStorage.getItem('cprStartDate') || '';
        numWeeksSelect.value = localStorage.getItem('cprNumWeeks') || '52';
        santaFeNamesTextarea.value = localStorage.getItem('cprSantaFeNames') || '';
        observatorioNamesTextarea.value = localStorage.getItem('cprObservatorioNames') || '';
    }

    function saveInputsToStorage() {
        localStorage.setItem('cprStartDate', startDateInput.value);
        localStorage.setItem('cprNumWeeks', numWeeksSelect.value);
        localStorage.setItem('cprSantaFeNames', santaFeNamesTextarea.value);
        localStorage.setItem('cprObservatorioNames', observatorioNamesTextarea.value);
    }

    // --- Generación de PDF Estilo Compacto ---
    function generarYDescargarPDFEstiloCompacto() {
        if (calendarioGenerado.dataRows.length === 0) {
            alert("Primero genera el calendario para poder crear el PDF.");
            return;
        }

        const doc = new jsPDF({
            orientation: 'l',
            unit: 'mm',
            format: 'a4'
        });

        const tituloPrincipal = "Calendario de Guardias CPR ABC";
        const periodoStr = `Periodo: ${formatDate(calendarioGenerado.fechaInicioOriginal, false)} - ${formatDate(calendarioGenerado.fechaFinOriginal, false)}`;

        const pdfHeaders = [calendarioGenerado.columnHeaders]; // Usa los headers definidos
        const pdfData = calendarioGenerado.dataRows.map(row => [
            row.fecha,
            row.sf2do, 
            row.sf1er, 
            row.obs2do, 
            row.obs1er  
        ]);

        doc.autoTable({
            head: pdfHeaders,
            body: pdfData,
            startY: 18,
            margin: { top: 15, right: 7, bottom: 10, left: 7 },
            styles: {
                font: 'helvetica',
                fontSize: 7,
                cellPadding: 1.5,
                overflow: 'ellipsize',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [248, 248, 248]
            },
            didDrawPage: function (data) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(tituloPrincipal, data.settings.margin.left, 8);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(periodoStr, data.settings.margin.left, 13);
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(7);
                doc.text('Página ' + data.pageNumber + ' de ' + pageCount, data.settings.margin.left, doc.internal.pageSize.height - 5);
            }
        });
        doc.save('Calendario_Guardias_CPR_Compacto.pdf');
    }

    // --- Event Handlers ---
    generateButton.addEventListener('click', () => {
        const startDateValue = startDateInput.value;
        if (!startDateValue) {
            alert("Por favor, selecciona una fecha de inicio.");
            return;
        }

        let firstDateOfRole = new Date(startDateValue + 'T00:00:00Z');
        firstDateOfRole = getNextThursday(firstDateOfRole);
        
        calendarioGenerado.fechaInicioOriginal = new Date(firstDateOfRole.valueOf());

        const santaFeNames = parseNames(santaFeNamesTextarea.value);
        const observatorioNames = parseNames(observatorioNamesTextarea.value);

        if (santaFeNames.length < 2 || observatorioNames.length < 2) {
            alert("Se requieren al menos 2 personas por campus. Revisa las listas.");
            return;
        }

        saveInputsToStorage();

        let htmlTable = `
            <table>
                <thead>
                    <tr>
                        <th>${calendarioGenerado.columnHeaders[0]}</th> <!-- Fecha -->
                        <th>${calendarioGenerado.columnHeaders[1]}</th> <!-- SF 2do -->
                        <th>${calendarioGenerado.columnHeaders[2]}</th> <!-- SF 1er -->
                        <th>${calendarioGenerado.columnHeaders[3]}</th> <!-- Obs 2do -->
                        <th>${calendarioGenerado.columnHeaders[4]}</th> <!-- Obs 1er -->
                    </tr>
                </thead>
                <tbody>
        `;

        calendarioGenerado.dataRows = [];
        let currentDate = new Date(firstDateOfRole.valueOf());

        // --- LÓGICA DE ÍNDICES INICIALES Y PROGRESIÓN CORREGIDA ---
        let indiceSF_actual1er = 0; // La primera persona (índice 0) es 1er llamado en sem 1
        let indiceSF_actual2do = 1; // La segunda persona (índice 1) es 2do llamado en sem 1
        
        let indiceObs_actual1er = 0; 
        let indiceObs_actual2do = 1; 

        const numSemanas = parseInt(numWeeksSelect.value) || 52;

        for (let i = 0; i < numSemanas; i++) {
            // Asignación según la nueva lógica
            const sf1er = santaFeNames[indiceSF_actual1er % santaFeNames.length];
            const sf2do = santaFeNames[indiceSF_actual2do % santaFeNames.length];
            const obs1er = observatorioNames[indiceObs_actual1er % observatorioNames.length];
            const obs2do = observatorioNames[indiceObs_actual2do % observatorioNames.length];

            const fechaFormateada = formatDate(currentDate);
            
            // Guardar en el orden de las columnas definidas en calendarioGenerado.columnHeaders
            calendarioGenerado.dataRows.push({
                fecha: fechaFormateada,
                sf2do: sf2do,       // Corresponde a columnHeaders[1]
                sf1er: sf1er,       // Corresponde a columnHeaders[2]
                obs2do: obs2do,     // Corresponde a columnHeaders[3]
                obs1er: obs1er      // Corresponde a columnHeaders[4]
            });

            // La tabla HTML también usa el orden de calendarioGenerado.columnHeaders
            htmlTable += `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${sf2do}</td>
                    <td>${sf1er}</td>
                    <td>${obs2do}</td>
                    <td>${obs1er}</td>
                </tr>
            `;

            // Progresión: El que fue 2do llamado esta semana, será 1er llamado la próxima.
            indiceSF_actual1er = indiceSF_actual2do; 
            indiceSF_actual2do = (indiceSF_actual2do + 1) % santaFeNames.length; 

            indiceObs_actual1er = indiceObs_actual2do;
            indiceObs_actual2do = (indiceObs_actual2do + 1) % observatorioNames.length;
            
            if (i === numSemanas - 1) { 
                calendarioGenerado.fechaFinOriginal = new Date(currentDate.valueOf());
            }
            currentDate.setDate(currentDate.getDate() + 7);
        }
        // --- FIN DEL AJUSTE DE LÓGICA ---

        htmlTable += `</tbody></table>`;
        calendarTableContainer.innerHTML = htmlTable;
        downloadPdfButton.style.display = 'inline-block';
    });

    downloadPdfButton.addEventListener('click', generarYDescargarPDFEstiloCompacto);

    clearButton.addEventListener('click', () => {
        startDateInput.value = '';
        numWeeksSelect.value = '52';
        santaFeNamesTextarea.value = '';
        observatorioNamesTextarea.value = '';
        calendarTableContainer.innerHTML = '';
        downloadPdfButton.style.display = 'none';
        calendarioGenerado.dataRows = [];
        calendarioGenerado.fechaInicioOriginal = null;
        calendarioGenerado.fechaFinOriginal = null;
    });

    // --- Inicialización ---
    loadInputsFromStorage();
});
