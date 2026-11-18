const chat = new ChatHistory('chatsql');
const content = new ContentHistory('chatsql');
const thought = new ThoughtHistory('chatsql');

// Store click handlers separately to ensure reference is retained
const clickHandlers = {};
var chat_table_array = [];
// Declare myChart globally so that it's accessible throughout the script
let myChart;

const sql_table_name = new Choices(`#table_name`, {
    placeholder: true,
    placeholderValue: window.chatbot_search || 'Search tables...',
    itemSelectText: '',
    shouldSort: false
});

const sql_table_option = new Choices(`#sql_table_option`, {
    placeholder: true,
    placeholderValue: window.chatbot_search || 'Search tables...',
    itemSelectText: '',
    shouldSort: false
});
const sql_table_option_2 = new Choices(`#sql_table_option_2`, {
    placeholder: true,
    placeholderValue: window.chatbot_search || 'Search tables...',
    shouldSort: false
});

// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    checkChoiceCookieSelect(sql_table_name, 'chatsql_table_name');
    const select_table_name = document.getElementById("table_name");
    const selectedOption = select_table_name.options[select_table_name.selectedIndex];
    if (selectedOption) {
        document.querySelector("#sql_input_dictionary_table").value = selectedOption.getAttribute("data-source");
    }
    transform_table_to_datatable({
        object_name: "#tableSqlDatabase",
        length_menu: [5, 10, 20],
        length_menu_all: false,
        column_defs: [
            { className: 'sqldatabase-table-style-1', targets: 0 },
            { className: 'sqldatabase-table-style-2', targets: 1 },
            { className: 'sqldatabase-table-style-3', targets: 2 },
            { className: 'sqldatabase-table-style-4', targets: 3 },
            { className: 'sqldatabase-table-style-6', targets: 4 },
            { className: 'sqldatabase-table-style-6', targets: 5 }
        ]
    });
    $('#chatsql_sqltables_modal').on('shown.bs.modal', function (event) {
        $("#tableSqlDatabase").dataTable().api().columns.adjust();
    });
    load_data_dictionary();
    get_list_frequent_questions();
    //checkCookieSelect('sql_chat_type', 'chatsql_chat_type');
    checkCookieButtonSql('chatsql_chat_type', 'Table', sql_table_name);

    set_object_popup("section_navbar_sqltables");
    set_object_popup("section_navbar_setting");
    //$('#sql_table_option').select2({
    //    searchInputPlaceholder: window.chatbot_search,
    //});

    
    const analyticToggle = document.getElementById('analyticToggle');

    function setActive(isActive) {
        analyticToggle.setAttribute('aria-pressed', String(!!isActive));
        analyticToggle.classList.toggle('active', !!isActive);
    }

    if (analyticToggle) {
        // click y soporte teclado (Enter / Space)
        analyticToggle.addEventListener('click', function (event) {
            const current = analyticToggle.getAttribute('aria-pressed') === 'true';
            setActive(!current);
            // aquí podrías disparar lógica extra (ej. cambiar comportamiento en la app)
            // console.log('Analítico activo?', !current);
            if (current) {
                const blockListTables = document.querySelector('.skin-dark .block-list-tables');
                if (blockListTables) {
                    document.querySelector('.block-list-tables').style.backgroundColor = '#3d3d3b';
                } else {
                    document.querySelector('.block-list-tables').style.backgroundColor = '#e1e6ed';
                }
                
                sql_table_name.disable();
                updateCookie('chatsql_chat_type', 'Table');
            } else {
                document.querySelector('.block-list-tables').style.backgroundColor = 'transparent';
                sql_table_name.enable();
                updateCookie('chatsql_chat_type', 'Assistant');
            }
            
            
        });
    }
    
    









    select_table_name.addEventListener("change", function () {
        updateCookie('chatsql_table_name', this.value);
        updateCookie('dictionary_table_name', this.value);
        const selectedOption = this.options[this.selectedIndex];
        document.querySelector("#sql_input_dictionary_table").value = selectedOption.getAttribute("data-source");
        document.querySelector("#sql_input_dictionary_table").setAttribute("data-id", this.value);
        load_data_dictionary();
        get_list_frequent_questions();
    });
    //var sql_chat_type = document.getElementById("sql_chat_type");
    //sql_chat_type.addEventListener("change", function () {
    //    updateCookie('chatsql_chat_type', document.getElementById("sql_chat_type").value);
    //});

    document.getElementById("button_save_openai_changes").addEventListener("click", function (event) {
        event.preventDefault();
        save_openai_changes();
    });
    document.getElementById("button-submit").addEventListener('click', async function (event) {
        event.preventDefault();
        const current = analyticToggle.getAttribute('aria-pressed') === 'true';

        if (current) {
            generate_message_sql();
        } else {
            generate_message_gpt();
        }
        /*
        if (document.querySelector("#sql_chat_type").value == "chat_sql") {
            generate_message_sql();
        } else {
            generate_message_gpt();
        }
        */
    });
    document.getElementById("sql_server_connection").addEventListener("change", function (event) {
        event.preventDefault();
        sql_server_connection();
    });
    document.getElementById("sql_btn_execute").addEventListener("click", function (event) {
        event.preventDefault();
        sql_btn_execute();
    });
    document.getElementById("sql_btn_save").addEventListener("click", function (event) {
        event.preventDefault();
        sql_save_query();
    });

    $('#chatsql_chatgraph_modal').on('shown.bs.modal', function (event) {
        // Get the element that triggered the modal
        var button = $(event.relatedTarget);
        // Extract data-id from the button
        var dataId = button.data('id');

        if (dataId != "") {
            generate_list_columns(dataId);
        }
    });

    $('#list_sql_datatable').on('shown.bs.modal', function (event) {
        // Get the element that triggered the modal
        var button = $(event.relatedTarget);
        // Extract data-id from the button
        var dataId = button.data('id');
        var sql_server = $("#sql_table_server_" + dataId).val();
        $("#sql_datatable_accept").attr("data-idrow", dataId);

        if (sql_server != "") {
            generate_list_tables(sql_server);
        }
    });
    document.getElementById("sql_clean_chat").addEventListener("click", function (event) {
        event.preventDefault();
        clean_chat();
    });
    document.getElementById("history-search-button").addEventListener("click", function (event) {
        event.preventDefault();
        history_search_button();
    });
    document.getElementById("sql_datatable_accept").addEventListener("click", function (event) {
        event.preventDefault();
        const dataId = $("#sql_datatable_accept").attr("data-idrow");
        const table_name = document.getElementById("sql_table_option_2").value;
        document.getElementById("tbl_source_table_" + dataId).value = table_name.split("|")[0];
    });

    refresh_sql_database_table();

    load_chat_conversation(content.history, "sql");
    //load_thought_conversation(thought.history);
    get_recent_history_conversations();
});


function generate_list_tables(var_sql_server_connection = "-") {
    if (var_sql_server_connection == "-") {
        return;
    }
    var data = JSON.stringify({
        sql_server_connection: var_sql_server_connection,
    });
    const sql_table_refresh = document.getElementById("sql_table_refresh");
    sql_table_refresh.style.display = 'inline-block';
    sql_table_option_2.clearStore();
    $.ajax({
        url: "/chatsql/GetTablesFromDatabase",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            var data = result;
            if (data.length > 0) {
                sql_table_option_2.setChoices([{ value: '-', label: window.chatsql_database_modal_sqltable_select, selected: true }], 'value', 'label', false);
                const newChoices = data.map(element => {
                    let table_type = "";

                    if (window.language === "es") {
                        if (element["TABLE_TYPE"] === "BASE TABLE") {
                            table_type = "TABLA";
                        }
                        if (element["TABLE_TYPE"] === "VIEW") {
                            table_type = "VISTA";
                        }
                    } else {
                        table_type = element["TABLE_TYPE"];
                    }

                    return {
                        value: `${element["TABLE_SCHEMA"]}.${element["TABLE_NAME"]}|${table_type}`,
                        label: `${element["TABLE_SCHEMA"]}.${element["TABLE_NAME"]} | ${table_type}`
                    };
                });
                sql_table_option_2.setChoices(newChoices, 'value', 'label', false);
            }
            sql_table_refresh.style.display = 'none';
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    });
}

// Función para obtener el objeto 'table' por 'id'
function getTableById(id) {
    const item = (content.getHistory()).find(obj => obj.id_message === id && obj.role === 'assistant');
    return item ? item : null;
}

function generate_list_columns(dataId) {
    const table = getTableById(dataId);
    // Obtener las claves del primer objeto de la tabla
    if (table) {
        const keys = table.table_columns;
        //console.log("Keys:", keys);

        // Destroy the existing chart
        if (myChart) {
            myChart.destroy();
            // Update HTML with results
            document.getElementById('statistics_center').textContent = `${window.chatsql_chart_modal_center}: `;
            document.getElementById('statistics_stddev').textContent = `${window.chatsql_chart_modal_standard_deviation}: `;
            document.getElementById('statistics_lcl').textContent = `${window.chatsql_chart_modal_lower_control_limit}: `;
            document.getElementById('statistics_ucl').textContent = `${window.chatsql_chart_modal_upper_control_limit}: `;
            document.getElementById('statistics_beyondLimits').textContent = `${window.chatsql_chart_modal_beyond_limits}: `;
            document.getElementById('statistics_violatingRuns').textContent = `${window.chatsql_chart_modal_violating_runs}: `;
        }

        // Selecciona el elemento <select> del DOM
        const sql_datetime_column = document.getElementById("sql_datetime_column");
        const sql_value_column = document.getElementById("sql_value_column");
        sql_datetime_column.innerHTML = '';
        sql_value_column.innerHTML = '';

        // Iterar sobre la tabla y agregar opciones al <select>
        keys.forEach(row => {
            const option = document.createElement("option");
            option.value = row; // o cualquier campo que quieras usar como valor
            option.textContent = row; // o cualquier campo que quieras mostrar
            sql_datetime_column.appendChild(option);
        });
        keys.forEach(row => {
            const option = document.createElement("option");
            option.value = row; // o cualquier campo que quieras usar como valor
            option.textContent = row; // o cualquier campo que quieras mostrar
            sql_value_column.appendChild(option);
        });

        const sql_chart_execute_button = document.querySelector("#sql_chart_execute_button");
        sql_chart_execute_button.setAttribute("data-id", dataId);
        sql_chart_execute_button.disabled = false;
    }
}

// Helper function to check if a string is a valid datetime or date
function isValidDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false; // Invalid date
    }
    if (dateString == null) {
        return false; // Invalid date
    }
    const timePart = dateString.split(' ')[1];
    return timePart ? "datetime" : "date";
}

// Helper function to check if a value is a valid integer, float, or decimal
function isValidNumber(value) {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
        return false; // Not a valid number
    }
    return Number.isInteger(parsed) ? "integer" : "float";
}

function sql_chart_execute(object) {
    if (object === undefined) {
        return;
    }

    let sql_datetime_column = document.querySelector("#sql_datetime_column").value;
    let sql_value_column = document.querySelector("#sql_value_column").value;
    if (sql_datetime_column == sql_value_column) {
        return;
    }

    const sql_chart_execute_button = document.querySelector("#sql_chart_execute_button");
    const sql_id = sql_chart_execute_button.getAttribute("data-id");
    const data_table = getTableById(sql_id);

    var data = JSON.stringify({
        sql_server_connection: (data_table.table_sql_server).trim(),
        sql_input_query: (data_table.table_sql_query).trim(),
    });
    let before_text = object.innerHTML;
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    $.ajax({
        url: '/main/SqlExecuteQuery',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            let data_table = result.result[0];
            if (data_table.length == 0) {
                return;
            }
            const processedData = data_table.map(item => {
                // Create a copy of the item to avoid modifying the original
                const newItem = { ...item };

                // Convert from string with comma to float with dot
                if (newItem[sql_value_column] && typeof newItem[sql_value_column] === 'string') {
                    // Replace comma with dot and convert to float
                    newItem[sql_value_column] = parseFloat(
                        newItem[sql_value_column]?.replace?.(',', '.') || '0'
                    );
                }

                return newItem;
            });
            processedData.sort((a, b) => {
                // Convert date strings to Date objects for comparison
                const dateA = new Date(a[sql_datetime_column]);
                const dateB = new Date(b[sql_datetime_column]);

                // Compare the dates
                return dateA - dateB;
            });

            // Extract the desired columns
            let table_result = processedData.map(item => {
                // Validate Actualizado_en
                let dateType = isValidDate(item[sql_datetime_column]);
                if (!dateType) {
                    console.log(`Invalid datetime or date: ${item[sql_datetime_column]}`);
                    return null;
                }

                // Validate ID
                let numberType = isValidNumber(item[sql_value_column]);
                if (!numberType) {
                    console.log(`Invalid value number: ${item[sql_value_column]}`);
                    return null;
                }

                // Return the valid data
                return {
                    "datetime": item[sql_datetime_column],
                    "value": item[sql_value_column]
                };

            });

            table_result = table_result.filter(n => n);

            const ctx = document.getElementById('my_statistics_chart').getContext('2d');
            // Destroy the existing chart
            if (myChart) {
                myChart.destroy();
                // Update HTML with results
                document.getElementById('statistics_center').textContent = `${window.chatsql_chart_modal_center}: `;
                document.getElementById('statistics_stddev').textContent = `${window.chatsql_chart_modal_standard_deviation}: `;
                document.getElementById('statistics_lcl').textContent = `${window.chatsql_chart_modal_lower_control_limit}: `;
                document.getElementById('statistics_ucl').textContent = `${window.chatsql_chart_modal_upper_control_limit}: `;
                document.getElementById('statistics_beyondLimits').textContent = `${window.chatsql_chart_modal_beyond_limits}: `;
                document.getElementById('statistics_violatingRuns').textContent = `${window.chatsql_chart_modal_violating_runs}: `;
            }

            if (table_result.length > 0) {
                // Sort by 'datetime'
                const sortedData = table_result.sort((a, b) => new Date(a["datetime"]) - new Date(b["datetime"]));

                // Extract arrays for 'datetime' and 'value'
                //const datetimeArray = sortedData.map(item => item["datetime"]);
                const datetimeArray = sortedData.map(item =>
                    new Date(item["datetime"]).toISOString().split('T')[0]
                );
                const valueArray = sortedData.map(item => item["value"]); // Keep the original value order

                const stats = calculateStatistics(valueArray);

                // Convert date-time strings to Date objects
                const dateTimeObjects = datetimeArray.map(dateTime => new Date(dateTime));

                // Find the minimum and maximum date-times
                const minDateTime = new Date(Math.min(...dateTimeObjects));
                const maxDateTime = new Date(Math.max(...dateTimeObjects));

                const data = {
                    labels: datetimeArray,
                    datasets: [
                        {
                            type: 'line',
                            label: window.chart_label_value,
                            data: valueArray,
                            fill: false,
                            borderColor: '#192a52',
                            color: '#192a52',
                            tension: 0.1
                        },
                        {
                            type: 'line',
                            label: window.chatsql_chart_modal_center,
                            borderWidth: 1,
                            pointStyle: false,
                            data: [{
                                x: minDateTime,
                                y: stats.mean
                            }, {
                                x: maxDateTime,
                                y: stats.mean
                            }],
                            borderColor: '#000000'
                        },
                        {
                            type: 'line',
                            label: 'LCL',
                            borderDash: [10, 5],
                            borderWidth: 1,
                            pointStyle: false,
                            data: [{
                                x: minDateTime,
                                y: stats.LCL
                            }, {
                                x: maxDateTime,
                                y: stats.LCL
                            }],
                            borderColor: '#000000'
                        },
                        {
                            type: 'line',
                            label: 'UCL',
                            borderDash: [10, 5],
                            borderWidth: 1,
                            pointStyle: false,
                            data: [{
                                x: minDateTime,
                                y: stats.UCL
                            }, {
                                x: maxDateTime,
                                y: stats.UCL
                            }],
                            borderColor: '#000000'
                        }
                    ]
                };

                const config = {
                    data: data,
                    options: {
                        plugins: {
                            title: {
                                display: true, // Enables the title
                                text: sql_datetime_column + ' vs ' + sql_value_column, // Title text
                                font: {
                                    size: 14 // Font size of the title
                                }
                            }
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'day' // You can use 'minute', 'hour', 'day', 'week', 'month', etc.
                                },
                                title: {
                                    display: true,
                                    text: window.chart_label_date
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: window.chart_label_value
                                }
                            }
                        },
                        interaction: {
                            intersect: false
                        }
                    }
                };

                myChart = new Chart(ctx, config);

                // Update HTML with results
                document.getElementById('statistics_center').textContent = `${window.chatsql_chart_modal_center}: ${roundTo(stats.mean, 5)}`;
                document.getElementById('statistics_stddev').textContent = `${window.chatsql_chart_modal_standard_deviation}: ${roundTo(stats.stddev, 2)}`;
                document.getElementById('statistics_lcl').textContent = `${window.chatsql_chart_modal_lower_control_limit}: ${roundTo(stats.LCL, 2)}`;
                document.getElementById('statistics_ucl').textContent = `${window.chatsql_chart_modal_upper_control_limit}: ${roundTo(stats.UCL, 2)}`;
                document.getElementById('statistics_beyondLimits').textContent = `${window.chatsql_chart_modal_beyond_limits}: ${stats.numberBeyondLimits}`;
                document.getElementById('statistics_violatingRuns').textContent = `${window.chatsql_chart_modal_violating_runs}: ${stats.numberViolatingRuns}`;
            } else {
                showAlert({
                    msg: window.chatsql_chart_modal_data_type_alert,
                    type: "information"
                });
            }
        },
        error: (error) => {
            console.log(error);
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        },
        complete: () => {
            object.innerHTML = before_text;
            object.disabled = false;
        }
    });
}


async function generate_message_sql() {
    var message = (document.getElementById("message-input").value).toString().trim();
    document.getElementById("sql_clean_chat").classList.add("disabled");
    const table_name = document.getElementById("table_name");
    const table_selected = table_name.options[table_name.selectedIndex];
    let data_table_name = table_selected.getAttribute("data-table");
    let loading_full_text = "Estoy consultando la fuente {{table_name}} para tu pregunta".replaceAll("{{table_name}}", data_table_name);
    const id_table = table_name.value;
    document.getElementById("message-input").value = "";
    if (message.length === 0) {
        return;
    }
    var dateTime = getCurrentDateTime();
    //msg_html = '<div style="white-space: break-spaces;align-self: flex-end;max-width: 95%;margin-bottom: 5px;">';
    //msg_html += '<div class="chat-question">';
    //msg_html += '<span>';
    //msg_html += message;
    //msg_html += '</span>';
    //msg_html += '</div>';
    //msg_html += '<span class="text-sm chat-question-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>';
    //msg_html += '</div>';
    const profile_image = document.querySelector("#user_profile_image").cloneNode(true);
    profile_image.removeAttribute("id");
    profile_image.style.width = "25px";
    profile_image.style.height = "25px";
    profile_image.style.margin = "0px";
    const id_string = generate_id(32);
    var msg_html = `<div class="block-chat-message">
                    ${profile_image.outerHTML} 
                    <div style="max-width: 95%;">
                        <div style="max-width: 95%;margin-left: 1rem;">
                            <div class="text-sm chat-question-date" title="${dateTime.full_date}"><span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span></div>
                        </div>
                        <div class="chat-question">
                            <span id="user-question-${id_string}">${message}</span>
                            <div style="float: right;">
                                <button id="save-question-${id_string}" class="button-save-message" title="Guardar" data-saved="0" data-id-table="${id_table}" onclick="save_user_message('${id_string}')">
                                    <i class="fa fa-bookmark-o"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("button-submit").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button-submit").disabled = true;

    var object_loading = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="20" height="20" style="shape-rendering: auto; display: block; background: transparent;">
        <g data-idx="1">
            <g transform="matrix(1,0,0,1,25,50)" data-idx="2">
                <circle fill="#192a52" r="6" cy="0" cx="0" data-idx="3" transform="matrix(0.7568556070327759,0,0,0.7568556070327759,0,0)">
                    <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="0.5;1.5;0.5"
                    dur="1s"
                    repeatCount="indefinite"
                    begin="0s"
                    />
                </circle>
            </g>
            <g transform="matrix(1,0,0,1,50,50)" data-idx="5">
                <circle fill="#192a52" r="6" cy="0" cx="0" data-idx="6" transform="matrix(0.2951993942260742,0,0,0.2951993942260742,0,0)">
                    <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="0.5;1.5;0.5"
                    dur="1s"
                    repeatCount="indefinite"
                    begin="0.1s"
                    />
                </circle>
            </g>
            <g transform="matrix(1,0,0,1,75,50)" data-idx="8">
                <circle fill="#192a52" r="6" cy="0" cx="0" data-idx="9" transform="matrix(0.001467271358706057,0,0,0.001467271358706057,0,0)">
                    <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="0.5;1.5;0.5"
                    dur="1s"
                    repeatCount="indefinite"
                    begin="0.2s"
                    />
                </circle>
            </g>
        </g>
    </svg>
    `;
    var dateTime = getCurrentDateTime();
    var msg_html = `
    <div id="block-chat-message-${id_string}" class="block-chat-message">
        <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
        <div style="max-width: 95%;display: flex;flex-direction: column;align-items: flex-start;">
            <div id="chat-assistant-date-${id_string}" style="padding-top: 0.5rem;margin-left: 1rem;">
                <div class="text-sm chat-bot-date" title="${dateTime.full_date}">
                    <span><b>MineBot GIG</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
                </div>
            </div>
            <div id="chat-assistant-${id_string}" class="chat-bot" style="max-width: 100%;">
                <span>${loading_full_text} <i class="fa fa-spinner fa-spin"></i></span>
            </div>
        </div>
    </div>
    `;
    document.getElementById("messages").innerHTML += msg_html;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    chat.addMessage("user", message);
    content.addMessage({
        id_message: id_string,
        role: "user",
        content: message,
        full_date: dateTime.full_date,
        short_time: dateTime.short_time,
        detailed_date: dateTime.detailed_date,
        save_id_table: id_table,
        sql_mode: "database"
    });

    var data = JSON.stringify({
        question: message,
        openai_object: OpenAIObject(),
        id_table: id_table,
        list_openai_model: document.getElementById('list_openai_models').value,
        sql_server: table_selected.getAttribute("data-secret"),
        source_table: table_selected.getAttribute("data-source"),
        sql_system_prompt: document.getElementById('sql_system_prompt').value
    });
    evaluate_stop_chat("start");

    let ajaxCall = $.ajax({
        url: '/chatsql/chatsql',
        data: data,
        contentType: 'application/json',  // Specify content type
        method: 'POST',
        success: function (result) {
            if (result.code_error) {
                evaluate_stop_chat("stop");
                document.getElementById("sql_clean_chat").classList.remove("disabled");
                const full_error = result.code_error + "\n\nFull Query: \n" + result.sql_query_error + "\n\nThe query was copy to clipboard."
                document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
                document.getElementById("button-submit").disabled = false;
                document.getElementById("message-input").value = message;
                navigator.clipboard.writeText(result.sql_query_error);
                showAlert({
                    msg: full_error,
                    type: "error"
                });
                return;
            }
            console.log('Success:', result);
            let answer = window.chatbot_no_records_found;

            print_content_result(result, id_string);
            chat.addMessage("assistant", result.table_markdown);
            content.addMessage({
                id_message: id_string,
                role: "assistant",
                sql_mode: "database",
                content: result.table_markdown,
                sql_query_markdown: result.sql_query_markdown,
                usage_summary_markdown: result.usage_summary_markdown,
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                table_columns: result.column_keys,
                table_sql_query: result.sql_query,
                table_sql_server: result.sql_server,
                detailed_date: dateTime.detailed_date,
                table_title: data_table_name
            });
            //thought.addConversation(message, (result.markdown_answer).substring(0, 100));
            document.getElementById("sql_clean_chat").classList.remove("disabled");
            evaluate_stop_chat("stop");
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            get_recent_history_conversations();
        },
        error: (error) => {
            evaluate_stop_chat("stop");
            document.getElementById("sql_clean_chat").classList.remove("disabled");
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            document.getElementById("block-chat-message-" + id_string).remove();
            if (error.statusText != 'abort') {
                print_error_result({
                    error: error,
                    id_chat_assistant: ("chat-assistant-" + id_string),
                    message: message
                });
            }
        }
    });

    // Event listener for cancellation
    $('#btn-stop-chat-button').on('click', function () {
        ajaxCall.abort();
        evaluate_stop_chat("stop");
    });
}

async function generate_message_gpt() {
    var message = (document.getElementById("message-input").value).toString().trim();
    document.getElementById("message-input").value = "";
    if (message.length === 0) {
        return;
    }
    var dateTime = getCurrentDateTime();
    const profile_image = document.querySelector("#user_profile_image").cloneNode(true);
    profile_image.removeAttribute("id");
    profile_image.style.width = "25px";
    profile_image.style.height = "25px";
    profile_image.style.margin = "0px";
    const id_message_user = uuidv4();
    var msg_html = `<div class="block-chat-message">
                    ${profile_image.outerHTML} 
                    <div style="max-width: 95%;">
                        <div style="max-width: 95%;margin-left: 1rem;">
                            <div class="text-sm chat-question-date" title="${dateTime.full_date}"><span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span></div>
                        </div>
                        <div class="chat-question">
                            <span>${message}</span>
                        </div>
                    </div>
                </div>`;
    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("button-submit").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button-submit").disabled = true;

    chat.addMessage("user", message);
    content.addMessage({
        id_message: id_message_user,
        role: "user",
        content: message,
        full_date: dateTime.full_date,
        short_time: dateTime.short_time,
        detailed_date: dateTime.detailed_date,
        sql_mode: "assistant"
    });

    var data = JSON.stringify({
        gpt_messages: chat.getHistory(),
        openai_object: OpenAIObject(),
        list_openai_model: document.getElementById('list_openai_models').value
    });
    try {
        const controller = new AbortController();
        const signal = controller.signal;
        const response = await fetch("/chatsql/chatgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
            signal: signal,
        });
        let messages_assistant = await print_content_assistant_stream(response, message, controller);
        const id_message_assistant = uuidv4();
        if (messages_assistant) {
            chat.addMessage("assistant", messages_assistant);
            content.addMessage({
                id_message: id_message_assistant,
                role: "assistant",
                sql_mode: "assistant",
                content: messages_assistant,
                sql_query_markdown: "",
                usage_summary_markdown: "",
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                detailed_date: dateTime.detailed_date
            });
            //thought.addConversation(message, (messages_assistant).substring(0, 100));
        }
        get_recent_history_conversations();
    } catch (error) {
        evaluate_stop_chat("stop");
        document.getElementById("sql_clean_chat").classList.remove("disabled");
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        showAlert({
            msg: 'Fetch error, ' + error.toString(),
            type: "error"
        });
    }

}



function save_user_message(id_message) {
    const user_question = document.getElementById("user-question-" + id_message).innerText;
    const button_question = document.getElementById("save-question-" + id_message);
    const question_saved = button_question.getAttribute("data-saved");
    const id_table = button_question.getAttribute("data-id-table");
    var data = JSON.stringify({
        id_message: id_message,
        user_question: user_question,
        question_saved: question_saved,
        id_table: id_table
    });
    button_question.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    button_question.disabled = true;
    $.ajax({
        url: '/chatsql/SaveUserQuestion',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                button_question.innerHTML = '<i class="fa fa-bookmark-o"></i>';
                button_question.disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if (question_saved == "0") {
                button_question.innerHTML = '<i class="fa fa-bookmark"></i>';
                button_question.disabled = false;
                button_question.setAttribute("data-saved", "1");
                button_question.setAttribute("title", "Guardado");
                for (let entry of content.history) {
                    if (entry.id_message === id_message) {
                        entry.saved_message = 1;
                        content.saveHistory();
                        break;
                    }
                }
                get_list_frequent_questions();
            }
            if (question_saved == "1") {
                button_question.innerHTML = '<i class="fa fa-bookmark-o"></i>';
                button_question.disabled = false;
                button_question.setAttribute("data-saved", "0");
                button_question.setAttribute("title", "Guardar");
                for (let entry of content.history) {
                    if (entry.id_message === id_message) {
                        entry.saved_message = 0;
                        content.saveHistory();
                        break;
                    }
                }
                get_list_frequent_questions();
            }
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    });
}







function clean_chat() {
    var icon = document.getElementById('refresh_icon');
    icon.classList.add('fa-spin'); // Add the fa-spin class
    setTimeout(function () {
        icon.classList.remove('fa-spin'); // Remove the fa-spin class after 1 second
    }, 1000);

    setTimeout(function () {
        var chat_message = `
        <div class="block-chat-message">
            <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
            <div class="chat-bot">
                <span>${window.chatbot_welcome_chat}</span>
            </div>
        </div>
        `;

        document.getElementById("messages").innerHTML = chat_message;
        document.getElementById("thought").innerHTML = "";

        //document.querySelector("#sql_chat_type").selectedIndex = 0;
        //updateCookie('chatsql_chat_type', document.getElementById("sql_chat_type").value);
        document.getElementById("goto-bottom").style.display = "none";

        chat.clearHistory();
        content.clearHistory();
        //thought.cleanHistory();
        chat_table_array = [];
    }, 250);


}







function load_data_dictionary() {
    var id_table = document.getElementById("table_name").value;
    if (id_table == "undefined" || id_table == "") {
        return;
    }
    var data = JSON.stringify({
        id_table: id_table
    });
    document.getElementById("sql_data_dictionary").value = "";
    document.getElementById("sql_data_dictionary").setAttribute("placeholder", "Loading...");
    $.ajax({
        url: "/chatsql/LoadDataDictionary",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("sql_data_dictionary").setAttribute("placeholder", "");
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            document.getElementById("sql_data_dictionary").value = result;
            document.getElementById("sql_data_dictionary").setAttribute("placeholder", "");
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    })

}








function save_main_changes() {
    var sql_system_prompt = document.getElementById('sql_system_prompt').value;
    var data = JSON.stringify({
        sql_system_prompt: sql_system_prompt,
        language: window.language,
        openai_object: OpenAIObject()
    });
    document.getElementById("button_save_main_changes").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("button_save_main_changes").disabled = true;
    $.ajax({
        url: "/chatsql/SaveMainSetting",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {

            if (result.code_error) {
                document.getElementById("button_save_main_changes").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_main_changes").disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }

            document.getElementById("button_save_main_changes").innerHTML = window.chatbot_changes_saved_button;

            setTimeout(function () {
                document.getElementById("button_save_main_changes").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_main_changes").disabled = false;
            }, 3000);

        },
        error: (error) => {
            document.getElementById("button_save_main_changes").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_main_changes").disabled = false;
            print_error_result({
                error: error
            });
        }
    })

}



function save_openai_changes() {

    var openai_type = document.getElementById("openai_type").msDropdown.value;
    var openai_model = document.getElementById("openai_model").msDropdown.value;
    var openai_maxtokens = document.getElementById("openai_maxtokens").value;
    var openai_temperature = document.getElementById("openai_temperature").value;
    var azure_openai_model = document.getElementById("azure_openai_model").value;
    var azure_openai_base = document.getElementById("azure_openai_base").value;
    var azure_openai_version = document.getElementById('azure_openai_version').msDropdown.value;
    var azure_openai_maxtokens = document.getElementById("azure_openai_maxtokens").value;
    var azure_openai_temperature = document.getElementById("azure_openai_temperature").value;

    var openai_embedded_model = document.getElementById("openai_embedded_model").msDropdown.value;
    var openai_timeout = document.getElementById("openai_timeout").value;
    var openai_stream = document.getElementById("openai_stream").checked ? 1 : 0;
    var azure_openai_embedded_model = document.getElementById('azure_openai_embedded_model').msDropdown.value;
    var azure_openai_timeout = document.getElementById("openai_timeout").value;
    var azure_openai_stream = document.getElementById("azure_openai_stream").checked ? 1 : 0;
    var openai_top_p = document.getElementById("openai_top_p").value;
    var azure_openai_top_p = document.getElementById("azure_openai_top_p").value;

    var data = JSON.stringify({
        openai_type: openai_type,
        openai_model: openai_model,
        openai_maxtokens: openai_maxtokens,
        openai_temperature: openai_temperature,
        openai_top_p: openai_top_p,
        azure_openai_model: azure_openai_model,
        azure_openai_base: azure_openai_base,
        azure_openai_version: azure_openai_version,
        azure_openai_maxtokens: azure_openai_maxtokens,
        azure_openai_temperature: azure_openai_temperature,
        openai_embedded_model: openai_embedded_model,
        openai_timeout: openai_timeout,
        azure_openai_top_p: azure_openai_top_p,
        openai_stream: openai_stream,
        azure_openai_embedded_model: azure_openai_embedded_model,
        azure_openai_timeout: azure_openai_timeout,
        azure_openai_stream: azure_openai_stream
    });

    document.getElementById("button_save_openai_changes").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("button_save_openai_changes").disabled = true;

    $.ajax({
        url: '/chatsql/SaveOpenAISetting',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {

            if (result.code_error) {
                document.getElementById("button_save_openai_changes").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_openai_changes").disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }

            document.getElementById("button_save_openai_changes").innerHTML = window.chatbot_changes_saved_button;

            setTimeout(function () {
                document.getElementById("button_save_openai_changes").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_openai_changes").disabled = false;
            }, 3000);

        },
        error: (error) => {
            document.getElementById("button_save_openai_changes").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_openai_changes").disabled = false;
            print_error_result({
                error: error
            });
        }
    })

}










function sql_server_connection() {
    var var_sql_server_connection = document.getElementById('sql_server_connection').value;
    if (var_sql_server_connection == "-") {
        return;
    }
    var data = JSON.stringify({
        sql_server_connection: var_sql_server_connection,
    });
    sql_table_option.clearStore();
    //document.getElementById("button_save_main_changes").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    $.ajax({
        url: "/chatsql/GetTablesFromDatabase",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            var data = result;
            if (data.length > 0) {
                const newChoices = data.map(element => {
                    let table_type = "";

                    if (window.language === "es") {
                        if (element["TABLE_TYPE"] === "BASE TABLE") {
                            table_type = "TABLA";
                        }
                        if (element["TABLE_TYPE"] === "VIEW") {
                            table_type = "VISTA";
                        }
                    } else {
                        table_type = element["TABLE_TYPE"];
                    }

                    return {
                        value: `${element["TABLE_SCHEMA"]}.${element["TABLE_NAME"]}|${table_type}`,
                        label: `${element["TABLE_SCHEMA"]}.${element["TABLE_NAME"]} | ${table_type}`
                    };
                });

                sql_table_option.setChoices(newChoices, 'value', 'label', false);
            }
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    });
}



function sql_btn_execute() {
    var var_sql_server_connection = document.getElementById("sql_server_connection").value;
    var sql_table_option = document.getElementById("sql_table_option").value;
    if (var_sql_server_connection == "-") {
        showAlert({
            msg: "You must to select a string connection.",
            type: "information"
        });
        return;
    }
    if (sql_table_option == "-") {
        showAlert({
            msg: "You must to select a table.",
            type: "information"
        });
        return;
    }
    var data = JSON.stringify({
        sql_server_connection: var_sql_server_connection,
        sql_table_option: sql_table_option
    });
    document.getElementById("sql_btn_execute").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("sql_btn_execute").disabled = true;
    var object_table = document.getElementById("sql_result_table");
    object_table.innerHTML = "";
    var start_datetime = new Date();
    $.ajax({
        url: '/chatsql/SqlExecuteTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("sql_btn_execute").innerHTML = '<i class="fa fa-play" style="color: green"></i> Execute example table';
                document.getElementById("sql_btn_execute").disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            data = data.result;
            if (data.length > 0) {
                var data_table = data[0];
                var columns_name = data[1].toString().split("|");

                create_table_dinamyc(object_table, data_table, columns_name);

                var end_datetime = new Date();

                var difference_datetime = end_datetime.getTime() - start_datetime.getTime();
                var seconds = (difference_datetime) / 1000;

                document.getElementById("sql_text_info").innerHTML = (seconds).toString() + " seconds | " + (data_table.length).toString() + " rows";

            }

            document.getElementById("sql_btn_execute").innerHTML = '<i class="fa fa-play" style="color: green"></i> Execute example table';
            document.getElementById("sql_btn_execute").disabled = false;

        },
        error: (error) => {
            document.getElementById("sql_btn_execute").innerHTML = '<i class="fa fa-play" style="color: green"></i> Execute example table';
            document.getElementById("sql_btn_execute").disabled = false;
            print_error_result({
                error: error
            });
        }
    })

}




function refresh_sql_database_table() {
    //document.getElementById("overlay_sqldatabase_table").style.display = "block";
    //const table = document.getElementById("tableSqlDatabase").getElementsByTagName('tbody')[0];
    //table.innerHTML = "";
    var datatable = $('#tableSqlDatabase').dataTable();
    datatable.fnClearTable();
    var table = document.getElementById("tableSqlDatabase").getElementsByTagName('tbody')[0];
    // Create a new row and set its HTML
    var row = table.insertRow();
    var cell = row.insertCell(0);
    cell.colSpan = 7; // Span across all columns
    cell.innerHTML = '<div style="text-align: center;"><i class="fa fa-circle-o-notch fa-spin"></i></div>';
    while (table.rows.length > 1) {
        table.deleteRow(0);
    }
    $.ajax({
        url: '/chatsql/RefreshSqlDatabaseTable',
        contentType: 'application/json',
        method: 'GET',
        success: (result) => {
            if (result.code_error) {
                //document.getElementById("overlay_sqldatabase_table").style.display = "none";
                datatable.fnClearTable();
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if (result.length > 0) {
                //data_table_sqldatabase(result);
                const sql_server_connection = document.getElementById("sql_server_connection");

                var data_list = [];
                for (var i = 0; i < result.length; i++) {

                    // Create a copy of the element
                    const sql_server_connection_copy = sql_server_connection.cloneNode(true);
                    // Set the value of the cloned connection element
                    sql_server_connection_copy.value = result[i]["secrets"];
                    // Modify the clone or set selected options if needed
                    const sql_server_option = sql_server_connection_copy.querySelector("option[value='" + result[i]["secrets"] + "']");
                    if (sql_server_option) {
                        sql_server_option.selected = true;
                        // Manually add the selected attribute to the option for outerHTML serialization
                        sql_server_option.setAttribute("selected", "selected");
                    }
                    data_list.push([
                        '<span class="number-table">' + (i + 1).toString() + '</span>',
                        '<span style="display: none;">' + result[i]["database_description"] + '</span><div>' + (sql_server_connection_copy.outerHTML).replace("sql_server_connection", "sql_table_server_" + result[i]["id"]).replace('class="form-control"', 'style="width: 150px;"') + '</div>',
                        //'<span style="display: none;">' + result[i]["source_table"] + '</span><div>' + $container.prop('outerHTML') + '</div>',
                        '<span style="display: none;">' + result[i]["source_table"] + '</span><div><input id="tbl_source_table_' + result[i]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + result[i]["source_table"] + '" style="width: calc(100% - 27px);"><button class="button-action-table" id="btn_list_sqldatatable_' + result[i]["id"] + '" data-toggle="modal" data-target="#list_sql_datatable" data-id="' + result[i]["id"] + '"><i class="fa fa-table"></i></button></div>',
                        '<span style="display: none;">' + result[i]["table_name"] + '</span><div><input id="tbl_table_name_' + result[i]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + result[i]["table_name"] + '" style="width: 100%;"></div>',
                        '<span style="display: none;">' + result[i]["table_group"] + '</span><div><input id="tbl_table_group_' + result[i]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + result[i]["table_group"] + '" style="width: 100%;"></div>',
                        '<span style="display: none;">' + result[i]["table_description"] + '</span><div><input id="tbl_table_description_' + result[i]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + result[i]["table_description"] + '" style="width: 100%;"></div>',
                        '<td><button class="button-action-table" id="btn_update_sqldatabaseid_' + result[i]["id"] + '" onclick="update_sqldatabase_table(' + result[i]["id"] + ')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_sqldatabaseid_' + result[i]["id"] + '" onclick="delete_sqldatabase_table(' + result[i]["id"] + ')"><i class="fa fa-fw fa-trash-o"></i></button></td>'
                    ]);
                }
                datatable.fnClearTable();
                datatable.fnAddData(data_list);
                datatable.api().columns.adjust();
            } else {
                datatable.fnClearTable();
            }
            //document.getElementById("overlay_sqldatabase_table").style.display = "none";
        },
        error: (error) => {
            //document.getElementById("overlay_sqldatabase_table").style.display = "none";
            datatable.fnClearTable();
            print_error_result({
                error: error
            });
        }
    })

}
function data_table_sqldatabase(sqldatabase) {
    const table = document.getElementById("tableSqlDatabase").getElementsByTagName('tbody')[0];
    for (let index = 0; index < sqldatabase.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4);
        const cell6 = newRow.insertCell(5);
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<div><input id="tbl_source_table_' + sqldatabase[index]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + sqldatabase[index]["source_table"] + '" style="width: 100%;"></div>';
        cell3.innerHTML = '<div><input id="tbl_table_name_' + sqldatabase[index]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + sqldatabase[index]["table_name"] + '" style="width: 100%;"></div>';
        cell4.innerHTML = '<div><input id="tbl_table_group_' + sqldatabase[index]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="' + sqldatabase[index]["table_group"] + '" style="width: 100%;"></div>';
        cell5.innerHTML = '<div><textarea id="tbl_table_description_' + sqldatabase[index]["id"] + '" class="cell-editable-style" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" rows="2" style="width: 100%;">' + sqldatabase[index]["table_description"] + '</textarea></div>';
        cell6.innerHTML = '<td><button class="button-action-table" id="btn_update_sqldatabaseid_' + sqldatabase[index]["id"] + '" onclick="update_sqldatabase_table(' + sqldatabase[index]["id"] + ')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_sqldatabaseid_' + sqldatabase[index]["id"] + '" onclick="delete_sqldatabase_table(' + sqldatabase[index]["id"] + ')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tableSqlDatabase");
}


function update_sqldatabase_table(object_id) {
    const sql_server_table = document.getElementById("sql_table_server_" + object_id).value;
    const sql_source_table = document.getElementById("tbl_source_table_" + object_id).value;
    const sql_table_name = document.getElementById("tbl_table_name_" + object_id).value;
    const sql_table_group = document.getElementById("tbl_table_group_" + object_id).value;
    const sql_table_description = document.getElementById("tbl_table_description_" + object_id).value;
    if (sql_source_table.length === 0 || sql_server_table === '-' || sql_table_name.length === 0 || sql_table_group.length === 0) {
        return;
    }
    var data = JSON.stringify({
        object_id: object_id,
        sql_server_table: sql_server_table,
        sql_source_table: sql_source_table,
        sql_table_name: sql_table_name,
        sql_table_group: sql_table_group,
        sql_table_description: sql_table_description
    });
    document.getElementById("btn_update_sqldatabaseid_" + object_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_sqldatabaseid_" + object_id).disabled = true;
    $.ajax({
        url: '/chatsql/UpdateSqlDatabaseTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_sqldatabaseid_" + object_id).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_sqldatabaseid_" + object_id).disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            data = data.result;
            if (data.length > 0) {
                refresh_sql_database_table();
                refresh_sql_table_name();
            }
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    });
}

async function delete_sqldatabase_table(object_id) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }

    var data = JSON.stringify({
        object_id: object_id
    });
    document.getElementById("btn_delete_sqldatabaseid_" + object_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_sqldatabaseid_" + object_id).disabled = true;

    $.ajax({
        url: '/chatsql/DeleteSqlDatabaseTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            data = data.result;

            if (data.length > 0) {
                refresh_sql_database_table();
                refresh_sql_table_name();
            }
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    });

}



function sql_save_query() {
    var var_sql_server_connection = document.getElementById('sql_server_connection').value;
    var sql_table_option = document.getElementById('sql_table_option').value;
    var sql_table_name = document.getElementById('sql_table_name').value;
    var sql_table_group = document.getElementById('sql_table_group').value;
    var sql_table_description = document.getElementById('sql_table_description').value;
    if (var_sql_server_connection == "-" || sql_table_option == "-" || sql_table_name == "" || sql_table_description == "" || sql_table_group == "") {
        showAlert({
            msg: "You must to fill all inputs.",
            type: "information"
        });
        return;
    }
    // Prepare data for POST request
    var data = JSON.stringify({
        sql_server_connection: var_sql_server_connection,
        sql_table_option: sql_table_option,
        sql_table_name: sql_table_name,
        sql_table_group: sql_table_group,
        sql_table_description: sql_table_description
    });
    document.getElementById("sql_btn_save").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("sql_btn_save").disabled = true;
    $.ajax({
        url: '/chatsql/SaveSqlDatabaseTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                document.getElementById("sql_btn_save").innerHTML = window.chatsql_database_modal_save_table_button;
                document.getElementById("sql_btn_save").disabled = false;
                return;
            }
            document.getElementById("sql_btn_save").innerHTML = window.chatsql_database_modal_save_table_button;
            document.getElementById("sql_btn_save").disabled = false;
            document.getElementById("sql_table_description").value = "";
            document.getElementById("sql_table_group").value = "";
            refresh_sql_table_name();
            refresh_sql_database_table();
        },
        error: (error) => {
            print_error_result({
                error: error
            });
            document.getElementById("sql_btn_save").innerHTML = window.chatsql_database_modal_save_table_button;
            document.getElementById("sql_btn_save").disabled = false;
        }
    })
}






function refresh_sql_table_name() {
    $.ajax({
        url: "/chatsql/GetSqlTablesNames",
        contentType: 'application/json',
        method: 'GET',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            var data = result;
            if (data.length > 0) {
                // Clear existing options
                $('#table_name').find('option').remove();
                $('#table_name').find('optgroup').remove();
                // Create a map to store groups
                const groups = {};

                // Iterate over the data to populate groups
                for (let index = 0; index < data.length; index++) {
                    const element = data[index];
                    const group = element["table_group"] || "No Group"; // Use "No Group" for null or undefined groups

                    // Check if the group exists in the map
                    if (!groups[group]) {
                        // If not, create an <optgroup> for this group
                        groups[group] = $('<optgroup>').attr('label', group);
                        $('#table_name').append(groups[group]);
                    }

                    // Create and append the <option> element
                    const updatedAt = (element["last_data_updated"] ? ' (' + window.chatbot_updated_at + ' ' + element["last_data_updated"] + ')' : '');
                    const option = $('<option>')
                        .attr('value', element["id"])
                        .attr('data-secret', element["secrets"])
                        .attr('data-source', element["source_table"])
                        .attr('title', 'Table: ' + element["source_table"] + updatedAt)
                        .text(element["table_name"] + updatedAt);

                    // Append the option to the appropriate group
                    groups[group].append(option);
                }
                checkCookieSelect('table_name', 'chatsql_table_name');
            }
        },
        error: (error) => {
            print_error_result({
                error: error
            });
        }
    });
}




function get_list_frequent_questions() {
    var id_table = document.getElementById("table_name").value;
    if (id_table == "" || id_table === undefined || id_table == "undefined") {
        showAlert({
            msg: "You must to select a table.",
            type: "information"
        });
        return;
    }
    // Prepare data for POST request
    var data = JSON.stringify({
        id_table: id_table
    });
    document.getElementById("questions-container").innerHTML = '<div class="question-load"><i class="fa fa-circle-o-notch fa-spin"></i></div>';
    $.ajax({
        url: '/chatsql/GetListFrequentQuestions',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                document.getElementById("questions-container").innerHTML = '';
                return;
            }

            if (result.length == 0) {
                document.getElementById("questions-container").innerHTML = '<div class="question-load">' + window.chatbot_empty_questions + '</div>';
                return;
            }

            // Get the container to display questions
            const container = document.getElementById('questions-container');
            container.innerHTML = ''; // Clear any existing content

            let idCounter = 1; // Initialize a counter for incremental IDs

            // Create and display question elements
            result.forEach(question => {
                const div = document.createElement('div');
                div.classList.add('question');
                div.id = `frequent-question-${idCounter}`; // Set the incremental ID
                /*
                if (question.frequency == 1) {
                    div.innerHTML = `
                        <div class="question-content-${question.id_faqs}">
                            <strong>Question: </strong><span id="${question.id_faqs}" data-question="${question.question}" contenteditable="false">${question.question}</span><br>
                        </div>
                        <div class="buttons" style="display: flex;">
                            <button id="btn-copy-question-${question.id_faqs}" class="button-action-table" onclick="copyQuestion('${question.id_faqs}')"><i class="fa fa-reply"></i></button>
                            <button id="btn-update-question-${question.id_faqs}" class="button-action-table" onclick="updateQuestion('${question.id_faqs}')" style="display: none;"><i class="fa fa-check"></i></button>
                            <button id="btn-toggleEdit-question-${question.id_faqs}" class="button-action-table" onclick="toggleEdit(this, '${question.id_faqs}')"><i class="fa fa-fw fa-edit"></i></button>
                            <button id="btn-delete-question-${question.id_faqs}" class="button-action-table" onclick="deleteQuestion('${question.id_faqs}','${question.question}')"><i class="fa fa-fw fa-trash-o"></i></button>
                        </div>
                    `;
                } else {
                    div.innerHTML = `
                        <strong>Question:</strong> ${question.question}<br>
                        <span class="frequency">Frequency: ${question.frequency}</span>
                    `;
                    // Add onclick event
                    div.onclick = function() {
                        document.querySelector("#message-input").value = question.question;
                        document.querySelector("#message-input").focus();
                    };
                }
                */
                div.innerHTML = `
                    ${question.question}
                `;
                // Add onclick event
                div.onclick = function () {
                    document.querySelector("#message-input").value = question.question;
                    document.querySelector("#message-input").focus();
                };

                container.appendChild(div);
                // Increment the ID counter for the next question
                idCounter++;
            });
        },
        error: (error) => {
            print_error_result({
                error: error
            });
            document.getElementById("questions-container").innerHTML = '';
        }
    })
}
// Function to handle edit and toggle between edit and save
function toggleEdit(button, id_faq) {
    const questionContent = document.getElementById(id_faq);
    const updateContent = document.querySelector('#btn-update-question-' + id_faq);
    const copyContent = document.querySelector('#btn-copy-question-' + id_faq);
    const deleteContent = document.querySelector('#btn-delete-question-' + id_faq);

    const isEditable = questionContent.getAttribute('contenteditable') === "true";

    if (isEditable) {
        // Disable editing
        questionContent.setAttribute('contenteditable', 'false');
        button.innerHTML = '<i class="fa fa-fw fa-edit"></i>'; // Change to edit icon
        updateContent.style.display = "none";
        copyContent.style.display = "block";
        deleteContent.style.display = "block";
        questionContent.style.cursor = "pointer";

        questionContent.innerText = questionContent.getAttribute("data-question");
    } else {
        // Enable editing
        questionContent.setAttribute('contenteditable', 'true');
        questionContent.focus(); // Focus on the text for editing
        button.innerHTML = '<i class="fa fa-close"></i>'; // Change to close icon
        updateContent.style.display = "block";
        copyContent.style.display = "none";
        deleteContent.style.display = "none";
        questionContent.style.cursor = "text";
    }
}

// Function to handle update action
function updateQuestion(id_faqs) {
    const questionContent = document.getElementById(id_faqs);
    var new_question = (questionContent.innerText).trim();
    if (new_question == "") {
        showAlert({
            msg: "You must to fill question.",
            type: "information"
        });
        return;
    }
    // Prepare data for POST request
    var data = JSON.stringify({
        id_faqs: id_faqs,
        new_question: new_question
    });
    document.getElementById("btn-update-question-" + id_faqs).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn-update-question-" + id_faqs).disabled = true;
    $.ajax({
        url: '/chatsql/UpdateQuestionContent',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                document.getElementById("btn-update-question-" + id_faqs).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn-update-question-" + id_faqs).disabled = false;
                return;
            }
            document.getElementById("btn-update-question-" + id_faqs).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
            document.getElementById("btn-update-question-" + id_faqs).disabled = false;

            const questionContent = document.getElementById(id_faqs);
            questionContent.style.cursor = "pointer";
            questionContent.setAttribute('contenteditable', 'false');
            document.getElementById("btn-toggleEdit-question-" + id_faqs).innerHTML = '<i class="fa fa-fw fa-edit"></i>';

            const updateContent = document.querySelector('#btn-update-question-' + id_faqs);
            const copyContent = document.querySelector('#btn-copy-question-' + id_faqs);
            const deleteContent = document.querySelector('#btn-delete-question-' + id_faqs);
            updateContent.style.display = "none";
            copyContent.style.display = "block";
            deleteContent.style.display = "block";
        },
        error: (error) => {
            print_error_result({
                error: error
            });
            document.getElementById("btn-update-question-" + id_faqs).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
            document.getElementById("btn-update-question-" + id_faqs).disabled = false;
        }
    })
}
// Function to handle delete action
async function deleteQuestion(id_faqs) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }
    // Prepare data for POST request
    var data = JSON.stringify({
        id_faqs: id_faqs
    });
    document.getElementById("btn-delete-question-" + id_faqs).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn-delete-question-" + id_faqs).disabled = true;
    $.ajax({
        url: '/chatsql/DeleteQuestionContent',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                document.getElementById("btn-delete-question-" + id_faqs).innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                document.getElementById("btn-delete-question-" + id_faqs).disabled = false;
                return;
            }
            get_list_frequent_questions();
        },
        error: (error) => {
            document.getElementById("btn-delete-question-" + id_faqs).innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
            document.getElementById("btn-delete-question-" + id_faqs).disabled = false;
            print_error_result({
                error: error
            });
        }
    })
}

function copyQuestion(id_faq) {
    const questionContent = document.getElementById(id_faq);
    document.querySelector("#message-input").value = questionContent.innerText;
}



function get_recent_history_conversations() {
    document.getElementById("thought").innerHTML = '<div class="thought-load"><i class="fa fa-circle-o-notch fa-spin"></i></div>';
    $.ajax({
        url: '/chatsql/GetRecentHistoryConversations',
        contentType: 'application/json',
        method: 'GET',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                document.getElementById("thought").innerHTML = '';
                return;
            }
            /*
            if (result.length == 0) {
                document.getElementById("thought").innerHTML = '<div class="question-load">' + window.chatbot_empty_questions + '</div>';
                return;
            }
            */
            iterate_block_thought(result);
        },
        error: (error) => {
            print_error_result({
                error: error
            });
            document.getElementById("thought").innerHTML = '';
        }
    })
}

function history_search_button() {
    var history_search_input = document.getElementById("history-search-input").value;
    // Prepare data for POST request
    var data = JSON.stringify({
        history_search_input: history_search_input
    });
    document.getElementById("thought").innerHTML = '<div class="thought-load"><i class="fa fa-circle-o-notch fa-spin"></i></div>';
    $.ajax({
        url: '/chatsql/SearchHistoryConversations',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                document.getElementById("thought").innerHTML = '';
                return;
            }
            /*
            if (result.length == 0) {
                document.getElementById("thought").innerHTML = '<div class="thought-load">' + window.chatbot_empty_questions + '</div>';
                return;
            }
            */
            iterate_block_thought(result);
        },
        error: (error) => {
            print_error_result({
                error: error
            });
            document.getElementById("thought").innerHTML = '';
        }
    })
}

function iterate_block_thought(thought_data = []) {
    const element_thought = document.getElementById("thought");
    element_thought.innerHTML = '';
    if (element_thought) {
        let idCounter = 1; // Initialize a counter for incremental IDs
        // Create and display question elements
        thought_data.forEach(data => {
            let though_html = `
                <div class="block-thought">
                    <div class="thought-question">
                        <span id="span-thought-text-${idCounter}" class="span-question-text" title="${data.MostRecentQuestion}" onclick="thought_message_text(${idCounter})">${data.MostRecentQuestion}</span>
                        <span class="span-question-time" title="${data.MostRecentCreatedAt}">${data.RecentTimeDescription}</span>
                    </div>
                    <div class="thought-answer">
                        <span class="span-answer-text" title="${data.MostRecentAnswer}">${data.MostRecent50LenAnswer}</span>
                    </div>
                </div>
            `;
            element_thought.innerHTML += though_html;
            idCounter++;
        });
    }
}

function thought_message_text(id_num) {
    const questionSpan = document.getElementById(`span-thought-text-${id_num}`);
    document.querySelector("#message-input").value = questionSpan.innerText;
    document.querySelector("#message-input").focus();
}




