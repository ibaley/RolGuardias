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

    // Almacenar los datos del calendario para el PDF
    let calendarioParaPDF = {
        headers: ["Fecha", "Santa Fe - 2do Llamado", "Santa Fe - 1er Llamado", "Observatorio - 2do Llamado", "Observatorio - 1er Llamado"],
        data: [],
        fechaInicioOriginal: null,
        fechaFinOriginal: null
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
        const d = new Date(date.valueOf()); // Clonar fecha
        const dayOfWeek = d.getDay(); // 0 for Sunday, ..., 4 for Thursday
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

    // --- Generación de PDF ---
    function generarYDescargarPDFEstiloCompacto() {
        if (calendarioParaPDF.data.length === 0) {
            alert("Primero genera el calendario para poder crear el PDF.");
            return;
        }

        const doc = new jsPDF({
            orientation: 'l', // landscape para mejor ajuste de columnas
            unit: 'mm',
            format: 'a4'
        });

        const tituloPrincipal = "Calendario de Guardias CPR ABC";
        let fechaFinCalculada = new Date(calendarioParaPDF.fechaInicioOriginal);
        fechaFinCalculada.setDate(fechaFinCalculada.getDate() + (parseInt(numWeeksSelect.value) * 7) - 7);
        
        const periodoStr = `Periodo: ${formatDate(calendarioParaPDF.fechaInicioOriginal, false)} - ${formatDate(fechaFinCalculada, false)}`;

        doc.autoTable({
            head: [calendarioParaPDF.headers],
            body: calendarioParaPDF.data,
            startY: 18, // Dejar un poco de espacio para el título y subtítulo
            margin: { top: 15, right: 7, bottom: 10, left: 7 }, // Márgenes reducidos
            styles: {
                font: 'helvetica',
                fontSize: 7, // Tamaño de fuente pequeño
                cellPadding: 1.5, // Padding de celda reducido
                overflow: 'ellipsize', // Cortar texto largo con '...'
                valign: 'middle'
            },
            headStyles: {
                fillColor: [220, 220, 220], // Gris claro para encabezados
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 7.5, // Un poco más grande para encabezados
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [248, 248, 248] // Un gris muy sutil para filas alternas
            },
            didDrawPage: function (data) {
                // Título Principal
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(tituloPrincipal, data.settings.margin.left, 8);

                // Subtítulo (Periodo)
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(periodoStr, data.settings.margin.left, 13);

                // Pie de Página (Número de Página)
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

        let firstDateOfRole = new Date(startDateValue + 'T00:00:00'); // Usar T00:00:00 para evitar problemas de zona horaria
        firstDateOfRole = getNextThursday(firstDateOfRole);
        
        calendarioParaPDF.fechaInicioOriginal = new Date(firstDateOfRole.valueOf()); // Guardar copia

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
                        <th>${calendarioParaPDF.headers[0]}</th>
                        <th>${calendarioParaPDF.headers[1]}</th>
                        <th>${calendarioParaPDF.headers[2]}</th>
                        <th>${calendarioParaPDF.headers[3]}</th>
                        <th>${calendarioParaPDF.headers[4]}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        calendarioParaPDF.data = []; // Limpiar datos anteriores para el PDF
        let currentDate = new Date(firstDateOfRole.valueOf()); // Usar copia para iterar

        let indiceSF2do = 0;
        let indiceSF1er = 1;
        let indiceObs2do = 0;
        let indiceObs1er = 1;

        const numSemanas = parseInt(numWeeksSelect.value) || 52;

        for (let i = 0; i < numSemanas; i++) {
            const sf2do = santaFeNames[indiceSF2do % santaFeNames.length];
            const sf1er = santaFeNames[indiceSF1er % santaFeNames.length];
            const obs2do = observatorioNames[indiceObs2do % observatorioNames.length];
            const obs1er = observatorioNames[indiceObs1er % observatorioNames.length];

            const fechaFormateada = formatDate(currentDate);
            const filaDatosPDF = [fechaFormateada, sf2do, sf1er, obs2do, obs1er];
            calendarioParaPDF.data.push(filaDatosPDF);

            htmlTable += `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${sf2do}</td>
                    <td>${sf1er}</td>
                    <td>${obs2do}</td>
                    <td>${obs1er}</td>
                </tr>
            `;

            indiceSF2do++;
            indiceSF1er++;
            indiceObs2do++;
            indiceObs1er++;
            currentDate.setDate(currentDate.getDate() + 7);
        }

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
        calendarioParaPDF.data = []; // Limpiar también los datos para el PDF

        // Opcional: Limpiar localStorage
        // localStorage.removeItem('cprStartDate');
        // localStorage.removeItem('cprNumWeeks');
        // localStorage.removeItem('cprSantaFeNames');
        // localStorage.removeItem('cprObservatorioNames');
    });

    // --- Inicialización ---
    loadInputsFromStorage();
});