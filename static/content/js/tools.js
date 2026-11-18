async function convertPdfToWord(pdfFilePath, wordFilePath) {
    const pdfBytes = await fs.promises.readFile(pdfFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const wordDoc = await fs.promises.open(wordFilePath, 'w');

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const pdfPage = await pdfDoc.getPage(i);
        const text = await pdfPage.getText();

        // Write extracted text to the Word document
        await wordDoc.write(text);
    }

    await wordDoc.close();
}

function OpenAIObject() {
    var openai_object = {
        "openai_type": document.getElementById("openai_type").msDropdown.value,
        "openai_model": document.getElementById("openai_model").msDropdown.value,
        "openai_maxtoken": parseInt(document.getElementById("openai_maxtokens").value),
        "openai_temperature": parseFloat(document.getElementById("openai_temperature").value),
        "azure_openai_model": document.getElementById("azure_openai_model").value,
        "azure_openai_base": document.getElementById("azure_openai_base").value,
        "azure_openai_version": document.getElementById('azure_openai_version').msDropdown.value,
        "azure_openai_maxtoken": parseInt(document.getElementById("azure_openai_maxtokens").value),
        "azure_openai_temperature": parseFloat(document.getElementById("azure_openai_temperature").value),
        "openai_embedded_model": document.getElementById('openai_embedded_model').msDropdown.value,
        "openai_timeout": parseInt(document.getElementById('openai_timeout').value),
        "openai_stream": document.getElementById('openai_stream').checked ? true : false,
        "azure_openai_embedded_model": document.getElementById('azure_openai_embedded_model').msDropdown.value,
        "azure_openai_timeout": parseInt(document.getElementById('azure_openai_timeout').value),
        "azure_openai_stream": document.getElementById('azure_openai_stream').checked ? true : false,
        "openai_top_p": parseFloat(document.getElementById("openai_top_p").value),
        "azure_openai_top_p": parseFloat(document.getElementById("azure_openai_top_p").value)
    };

    return openai_object;
}

function transform_table(string_text) {
    var table = string_text.substring(
        string_text.indexOf("|"),
        string_text.lastIndexOf("|") + 1
    );

    if (table.length > 0) {
        data = table.split(/\r?\n/); // split text into lines

        var lines = [];
        for (var i = 0; i < data.length; i++) {
            data[i] = data[i].trim();
            lines.push(data[i].split("|")); // split lines further based on 2 or more spaces
        }
        // creating html string
        var html_table = '<table class="chat-table-format">';

        html_table += '<thead>';
        for (var i = 0; i < lines.length; i++) {
            if (i == 0) {
                html_table += '<tr>';
                for (var j = 0; j < lines[i].length; j++) {
                    if (lines[i][j] != '' && !/^\-+$/.test(lines[i][j])) {
                        html_table += '<th>' + lines[i][j].trim() + '</th>';
                    }
                }
                html_table += '</tr>';
            }
        }
        html_table += '</thead>';
        html_table += '<tbody>';
        for (var i = 0; i < lines.length; i++) {
            if (i != 0) {
                html_table += '<tr>';
                for (var j = 0; j < lines[i].length; j++) {


                    if (lines[i][j] != '' && !/^\-+$/.test(lines[i][j])) {
                        html_table += '<td>' + lines[i][j].trim() + '</td>';
                    }
                }
                html_table += '</tr>';
            }
        }
        html_table += '</tbody>';

        html_table += '</table>';
        string_text = string_text.replace(table, html_table)
    }

    return string_text;
}

function generate_id(length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(escapeRegExp(search), 'g'), replacement);
};

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

HTMLSelectElement.prototype.contains = function (value) {
    for (var i = 0, l = this.options.length; i < l; i++) {
        if (this.options[i].value == value) {
            return true;
        }
    }
    return false;
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
function uuidv4hex() {
    return "10000000100040008000100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getCurrentDateTime() {
    var date_now = new Date();

    var full_date = [
        date_now.getFullYear(),
        ("0" + (date_now.getMonth() + 1)).slice(-2),
        ("0" + date_now.getDate()).slice(-2)
    ].join('-') + ' ' + [
        ("0" + date_now.getHours()).slice(-2),
        ("0" + date_now.getMinutes()).slice(-2),
        ("0" + date_now.getSeconds()).slice(-2)
    ].join(':');

    var short_time = formatAMPM(date_now);

    // Array of month names
    var month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Extract the day, month, and time
    var day = ("0" + date_now.getDate()).slice(-2); // Zero-pad day
    var month = month_names[date_now.getMonth()]; // Get the month name
    var time = formatAMPM(date_now); // Format time in AM/PM

    // Format as "12 Feb • 13:20 PM"
    var detailed_date = `${day} ${month} • ${time}`;

    return { full_date, short_time, detailed_date };
}

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

/*
Example:
// Install input filters.
setInputFilter(input_element, function (value) {
    return /^-?\d*$/.test(value);
}, "Must be an integer");
setInputFilter(input_element, function (value) {
    return /^\d*\.?\d*$/.test(value);
}, "Must be an decimal number");
*/
function setInputFilter(textbox, inputFilter, errMsg) {
    ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop", "focusout"].forEach(function (event) {
        textbox.addEventListener(event, function (e) {
            if (inputFilter(this.value)) {
                // Accepted value.
                if (["keydown", "mousedown", "focusout"].indexOf(e.type) >= 0) {
                    this.classList.remove("input-error");
                    this.setCustomValidity("");
                }

                this.oldValue = this.value;
                this.oldSelectionStart = this.selectionStart;
                this.oldSelectionEnd = this.selectionEnd;
            }
            else if (this.hasOwnProperty("oldValue")) {
                // Rejected value: restore the previous one.
                this.classList.add("input-error");
                this.setCustomValidity(errMsg);
                this.reportValidity();
                this.value = this.oldValue;
                this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
            }
            else {
                // Rejected value: nothing to restore.
                this.value = "";
            }
        });
    });
}

function OnInput() {
    this.style.height = 0;
    if (this.scrollHeight >= 350) {
        this.style.height = (350) + "px";
        this.style.overflowY = "auto";
        this.style.resize = "auto";
    } else {
        this.style.height = (this.scrollHeight) + "px";
    }
}

function getLang() {
    //if (navigator.languages != undefined)
    //    return navigator.languages[0];
    //return navigator.language;
    return Intl.DateTimeFormat().resolvedOptions().locale;
}

async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

function array_move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; // for testing
};

function showTooltip(event) {
    event.stopPropagation(); // we don't want the window to see the click as well
    hideTooltip();
    this.classList.add("website-tooltiptext-visible");
}
function hideTooltip() {
    let el = document.querySelector(".website-tooltiptext-visible");
    if (el) { el.classList.remove("website-tooltiptext-visible"); }
}

window.addEventListener('load', function () {
    window.addEventListener('click', hideTooltip);//hide the tooltip if the user clicks anywhere on the window
    //For each of the elements where we want to show a tooltip add an eventlistener to pick up clicks
    var els = document.querySelectorAll(".website-tooltip");
    for (let i = 0; i < els.length; i++) {
        els[i].addEventListener('click', showTooltip);
    }
});

function hexToBase64(str) {
    var bString = "";
    for (var i = 0; i < str.length; i += 2) {
        bString += String.fromCharCode(parseInt(str.substr(i, 2), 16));
    }
    return btoa(bString);
}


function getFileNameAndExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');

    if (lastDotIndex !== -1) {
        const name = fileName.substring(0, lastDotIndex);
        const extension = fileName.substring(lastDotIndex + 1);

        return {
            name: name,
            extension: extension,
        };
    } else {
        return {
            name: fileName,
            extension: null, // You can set it to an empty string or handle it differently if needed
        };
    }
}

function getFormattedDateTime() {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const formattedDateTime = `${year}${month}${day}${hours}${minutes}${seconds}`;

    return formattedDateTime;
}

function findObjectsByKey(array, key, value) {
    return array.filter(item => item[key] === value);
}
function changeValueByKey(array, key, valueToFind, keyToChange, newValue) {
    array.forEach(item => {
        if (item[key] === valueToFind) {
            item[keyToChange] = newValue;
        }
    });
}


function refreshTableNumber(table_id) {
    const rows = document.getElementById(table_id).getElementsByTagName('tbody');
    if (rows) {
        var array = rows[0].children;
        max_number_table_size = (array.length + 1);
        for (let index = 0; index < array.length; index++) {
            const element = array[index];
            element.firstElementChild.children[0].innerHTML = (index + 1).toString();
        }
    }
}

// Debounce function
function debounce(func, delay) {
    let timeoutId;

    return function () {
        const context = this;
        const args = arguments;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

function clearInput(inputElement) {
    inputElement.value = '';
}

function create_table_dinamyc(object_table, object_data, columns_name) {
    object_table.innerHTML = "";
    var header_html = "<thead>";

    for (var index in columns_name) {
        header_html += "<th>" + columns_name[index] + "</th>";
    }
    header_html += "</thead>";
    object_table.innerHTML = header_html;
    var body_html = "<tbody>";
    row_html = "";
    for (let row = 0; row < object_data.length; row++) {
        row_html += "<tr>";
        for (let idx_column = 0; idx_column < columns_name.length; idx_column++) {
            const col_name = columns_name[idx_column]
            const element = object_data[row][col_name];
            row_html += '<td><div title="' + element + '">' + element + '</div></td>';
        }
        row_html += "</tr>";
    }
    body_html += row_html + "</tbody>";
    object_table.innerHTML += body_html;
}

function createTableFromObjects(arrayOfObjects, column_order, table_id = "") {
    if (!Array.isArray(arrayOfObjects) || arrayOfObjects.length === 0) {
        console.error("Input should be a non-empty array of objects.");
        return;
    }

    if (!Array.isArray(column_order) || column_order.length === 0) {
        console.error("Column order should be a non-empty array.");
        return;
    }

    // Create the table element
    const table = document.createElement('table');
    if (table_id != "") {
        table.id = "table_" + table_id;
    }
    table.className = 'chat-table-format';

    // Create thead and tbody elements
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Create the header row based on column_order
    const headerRow = document.createElement('tr');
    let table_row_num = 0
    column_order.forEach(key => {
        const th = document.createElement('th');
        if (table_id != "") {
            th.setAttribute('onclick', "sortTable('" + table_id + "', " + table_row_num.toString() + ")");
            table_row_num += 1;
        }
        th.innerText = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create the data rows
    arrayOfObjects.forEach(obj => {
        const row = document.createElement('tr');
        column_order.forEach(key => {
            const td = document.createElement('td');
            let text = obj[key];
            td.title = text;

            // Check if the text is null or undefined and handle it
            if (text === null || text === undefined) {
                text = '';
            } else {
                text = text.toString();
            }

            // Limit text to 100 characters with ellipsis
            if (text.length > 100) {
                text = text.slice(0, 97) + '...';
            }

            td.innerText = text;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });

    // Append thead and tbody to the table
    table.appendChild(thead);
    table.appendChild(tbody);

    return table;
}



function isEmptyObject(obj) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            return false;
        }
    }

    return true;
}


// Helper function to round numbers
function roundTo(value, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
}

function sortTable(table_id, columnIndex) {
    const table = document.getElementById("table_" + table_id);
    const rows = Array.from(table.rows).slice(1); // Skip the header row
    const isAscending = table.getAttribute("data-sort-order") !== "asc";
    table.setAttribute("data-sort-order", isAscending ? "asc" : "desc");

    rows.sort((a, b) => {
        const cellA = a.cells[columnIndex].innerText.toLowerCase();
        const cellB = b.cells[columnIndex].innerText.toLowerCase();

        if (!isNaN(cellA) && !isNaN(cellB)) {
            // Sort numbers
            return isAscending ? cellA - cellB : cellB - cellA;
        } else {
            // Sort strings
            return isAscending
                ? cellA.localeCompare(cellB)
                : cellB.localeCompare(cellA);
        }
    });

    // Append sorted rows back to the table
    rows.forEach(row => table.tBodies[0].appendChild(row));
}


function transform_table_to_datatable({ object_name = "", length_menu = [10, 25, 50], length_menu_all = true, column_defs = [] }) {
    const element = $(object_name);
    if (element) {
        let result_length_menu = [];
        if (length_menu_all) {
            result_length_menu = [[...length_menu, -1], [...length_menu, window.chatbot_datatable_all]];
        } else {
            result_length_menu = length_menu;
        }
        element.DataTable({
            'lengthMenu': result_length_menu,
            'ordering': false,
            'info': true,
            'autoWidth': false,
            'searching': true,
            'scrollX': true,
            'columnDefs': column_defs,
            'language': {
                "sSearch": window.chatbot_datatable_search,
                "sLengthMenu": window.chatbot_datatable_lengthmenu,
                "oPaginate": {
                    "sFirst": window.chatbot_datatable_first,
                    "sLast": window.chatbot_datatable_last,
                    "sNext": window.chatbot_datatable_next,
                    "sPrevious": window.chatbot_datatable_previous
                },
                "sInfoFiltered": window.chatbot_datatable_infofiltered,
                "sZeroRecords": window.chatbot_datatable_zerorecords,
                "sEmptyTable": window.chatbot_datatable_emptytable,
                "sInfo": window.chatbot_datatable_info,
                "sInfoEmpty": window.chatbot_datatable_infoempty,
                "sLoadingRecords": window.chatbot_datatable_loadingrecords
            }
        });
        $(window).on('resize', function () {
            element.dataTable().api().columns.adjust();
        });
        //$('#tableSqlDatabase').dataTable().api().columns.adjust();
    }



}


function highlight_language_sql() {
    // Define SQL keywords
    const sqlKeywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'OUTER', 'LEFT', 'RIGHT',
        'FULL', 'ON', 'AND', 'OR', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'DISTINCT', 'UNION', 'ALL', 'INSERT', 'UPDATE', 'DELETE', 'INTO', 'SET',
        'VALUES', 'CREATE', 'TABLE', 'VIEW', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN',
        'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'NULL', 'NOT', 'EXISTS',
        'BETWEEN', 'LIKE', 'IN', 'IS', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC',
        'DESC', 'TOP', 'LIMIT', 'OFFSET', 'FETCH', 'NEXT', 'ROWNUM', 'PROCEDURE',
        'BEGIN', 'END', 'TRY', 'CATCH', 'TRANSACTION', 'COMMIT', 'ROLLBACK'
    ];

    // Define SQL functions
    const sqlFunctions = [
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CAST', 'CONVERT', 'COALESCE',
        'NULLIF', 'ISNULL', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
        'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'UPPER', 'LOWER', 'TRIM',
        'LTRIM', 'RTRIM', 'SUBSTRING', 'LEN', 'DATALENGTH', 'CHARINDEX',
        'PATINDEX', 'REPLACE', 'GETDATE', 'DATEADD', 'DATEDIFF', 'YEAR',
        'MONTH', 'DAY', 'CURRENT_TIMESTAMP'
    ];

    // Escape HTML special characters
    function escapeHTML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Highlight SQL code
    function highlightSQL(sql) {
        // Escape the entire SQL string first
        let highlighted = escapeHTML(sql);

        // Highlight keywords
        sqlKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex, match =>
                `<span class="sql-keyword">${match}</span>`
            );
        });

        // Highlight functions
        sqlFunctions.forEach(func => {
            const regex = new RegExp(`\\b${func}\\b`, 'gi');
            highlighted = highlighted.replace(regex, match =>
                `<span class="sql-function">${match}</span>`
            );
        });

        // Highlight strings (single and double quoted)
        highlighted = highlighted.replace(/(\'[^\']*?\')/g, match =>
            `<span class="sql-string">${match}</span>`
        );

        highlighted = highlighted.replace(/(\"[^\"]*?\")/g, match =>
            `<span class="sql-string">${match}</span>`
        );

        // Highlight numbers (integers and decimals)
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, match =>
            `<span class="sql-number">${match}</span>`
        );

        // Highlight single-line comments
        highlighted = highlighted.replace(/(--[^\n]*)/g, match =>
            `<span class="sql-comment">${match}</span>`
        );

        // Highlight multi-line comments
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, match =>
            `<span class="sql-comment">${match}</span>`
        );

        // Highlight operators
        highlighted = highlighted.replace(/(\b(?:!=|<>|<=|>=|!<|!>|=|&lt;|&gt;|!|\|\||\+|-|\*|\/|%)\b)/g, match =>
            `<span class="sql-operator">${match}</span>`
        );

        // Highlight parameters
        highlighted = highlighted.replace(/(@\w+)/g, match =>
            `<span class="sql-param">${match}</span>`
        );

        // Highlight identifiers (table and column names)
        highlighted = highlighted.replace(/(\b(?:FROM|JOIN|INTO|UPDATE|TABLE|VIEW|INDEX|ON)\s+)([\w\.]+)/gi, (match, p1, p2) =>
            `${p1}<span class="sql-identifier">${p2}</span>`
        );

        return highlighted;
    }

    // Apply highlighting to all SQL code blocks
    const sqlBlocks = document.querySelectorAll('code.language-sql');
    sqlBlocks.forEach(block => {
        block.innerHTML = highlightSQL(block.textContent);
    });
}

function extractTableInfo(data) {
    if (!Array.isArray(data)) {
        data = data ? [data] : [];
    }
    var data_merged = data.map((item, index) => {
        // columns is now an array, so we can use it directly
        const columns = item.table_columns || [];
        const columnString = columns.map(col => `\`${col}\``).join(', ');

        return `${index + 1}. **${item.table_title}** ? ${columnString}`;
    }).join('\n');

    return data_merged;
}



let tiempoInicio = 0;
let tiempoTranscurrido = 0;
let intervalo;
function controlStopwatch(status) {
    const chronometer = document.getElementById('chronometer');

    if (!chronometer) {
        console.log('Elemento chronometer no encontrado');
        return;
    }

    switch (status) {
        case 'start':
            if (intervalo) return;
            chronometer.style.display = "block";
            tiempoInicio = Date.now() - tiempoTranscurrido;
            intervalo = setInterval(() => {
                tiempoTranscurrido = Date.now() - tiempoInicio;
                updateStopwatch(chronometer, tiempoTranscurrido);
            }, 1000);
            break;

        case 'stop':
            tiempoTranscurrido = 0;
            clearInterval(intervalo);
            intervalo = null;
            break;
    }
}
function updateStopwatch(elemento, milisegundos) {
    const minutos = Math.floor((milisegundos % 3600000) / 60000);
    const segundos = Math.floor((milisegundos % 60000) / 1000);

    if (minutos > 0) {
        elemento.innerHTML = `<span style="margin: 0px 5px 0px 10px;">${minutos.toString().padStart(2, '0')} min ${segundos.toString().padStart(2, '0')} sec</span>`;
    } else {
        elemento.innerHTML = `<span style="margin: 0px 5px 0px 10px;">${segundos.toString().padStart(2, '0')} sec</span>`;
    }

}



function enableTableSorting(table) {
    if (table) {
        const headers = table.querySelectorAll('th');
        const tableBody = table.querySelector('tbody');
        const directions = Array.from(headers).map(() => '');

        // Transform content based on data type
        const transform = (index, content) => {
            const type = headers[index].getAttribute('data-sort');
            content = content.trim();

            switch (type) {
                case 'number':
                    return parseFloat(content.replace(/[^0-9.-]+/g, ''));
                case 'string':
                default:
                    return content;
            }
        };

        // Sort column function
        const sortColumn = index => {
            const direction = directions[index] === 'asc' ? 'desc' : 'asc';

            // Reset classes on all headers
            headers.forEach(header => {
                header.classList.remove('asc', 'desc');
            });

            // Set new direction and class
            directions[index] = direction;
            headers[index].classList.add(direction);

            // Create array of rows for sorting
            const rows = Array.from(tableBody.querySelectorAll('tr'));

            // Sort rows
            rows.sort((rowA, rowB) => {
                const cellA = rowA.querySelectorAll('td')[index].textContent;
                const cellB = rowB.querySelectorAll('td')[index].textContent;

                const a = transform(index, cellA);
                const b = transform(index, cellB);

                if (direction === 'asc') {
                    return a < b ? -1 : a > b ? 1 : 0;
                } else {
                    return a > b ? -1 : a < b ? 1 : 0;
                }
            });

            // Remove all existing rows
            while (tableBody.firstChild) {
                tableBody.removeChild(tableBody.firstChild);
            }

            // Append sorted rows
            tableBody.append(...rows);
        };

        // Add click event to headers
        headers.forEach((header, index) => {
            header.addEventListener('click', () => {
                sortColumn(index);
            });
        });
    }
}


function getDateTimeForExport() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}


function copy_table(id_message) {
    const object_chat = getTableById(id_message);
    if (object_chat.content) {
        const csv = MarkdownTableConverter.toCSV(object_chat.content);
        MarkdownTableConverter.copyToClipboard(csv);
    }
}

function export_table(id_message) {
    const object_chat = getTableById(id_message);
    if (object_chat.content) {
        const datetime = getDateTimeForExport();
        AdvancedCSVExporter.exportMarkdownTable(object_chat.content, {
            filename: `${object_chat.table_title}_${datetime}.csv`
        });
    }
}


function safeMarkdownRender(text) {
    // Validate input
    if (typeof text !== 'string') {
        console.warn('Markdown renderer expects string input, received:', typeof text);
        return '<em>Invalid content type</em>';
    }

    // Check if markdown-it is initialized
    if (typeof window.md === 'undefined' || !window.md) {
        console.error('Markdown parser not initialized!');
        return '<em>Formatting unavailable</em>';
    }

    try {
        // Sanitize input and render
        const sanitizedText = text.trim().replace(/\r\n/g, '\n');
        return window.md.render(sanitizedText);
    } catch (error) {
        console.error('Markdown rendering failed:', error);
        return '<em>Error rendering content</em>';
    }
}


function needsMarkdownFix(response) {
    const problematicPatterns = [
        /```/g
    ];
    
    return problematicPatterns.some(pattern => pattern.test(response));
}

function onlyFixSpecificIssues(response) {
    if (needsMarkdownFix(response)) {
        response = response.replace(/```/g, '');
        return response
            // Solo aplicar a bullets que tengan texto en negrita Y dos puntos
            .replace(/^([•\-]\s+)\*\*(.+?)\*\*\s*:/gm, '#### $2')
            // Los otros patrones permanecen igual
            .replace(/^(\d+\)\s+[A-Z])/gm, '### $1')
            .replace(/^([IVX]+\)\s+[A-Z])/gmi, '### $1')
            .replace(/^([a-z]\)\s+[A-Z])/gmi, '#### $1');
        // Usar fixedResponse
    } else {
        return response;
    }
}


// 🔹 Renderiza solo las primeras filas de una tabla grande
function renderTablePreview(markdown, id_chat, maxRows = 20) {
    const rows = markdown.split('\n');
    if (rows.length <= maxRows) {
        return safeMarkdownRender(markdown).replace(/<table>/g, '<table class="chat-table-format">');
    }
    const limited_markdown = markdown.split('\n').slice(0, maxRows).join('\n');
    const parser = new DOMParser();
    const doc = parser.parseFromString(safeMarkdownRender(limited_markdown).replace(/<table>/g, '<table class="chat-table-format">'), "text/html");
    const table = doc.querySelector("table");
    if (!table) return "";
    
    return (table.outerHTML) + `
    <button class="btn-primary-bot small-button" style="margin-top: 5px;" onclick="loadFullTable('${id_chat}')">
        Show full table
    </button>
    `;
}

// 🔹 Carga bajo demanda
function loadFullTable(id) {
    const msg = (content.getHistory()).find(obj => obj.id_message === id && obj.role === 'assistant');
    if (!msg || !msg.content) return;
    const container = document.querySelector(`#chat-assistant-${id}`)?.querySelector(".data_table");
    if (!container) return;
    container.innerHTML = safeMarkdownRender(msg.content).replace(/<table>/g, '<table class="chat-table-format">');
}





