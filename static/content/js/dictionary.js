
// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    checkCookieSelect('table_name', 'dictionary_table_name');
    refresh_dictionary_table();
    set_object_popup("section_navbar_setting");
    
    document.getElementById("table_name").addEventListener("change", function (event) {
        event.preventDefault();
        updateCookie('dictionary_table_name', document.getElementById("table_name").value);
        refresh_dictionary_table();
    });
    document.getElementById("button_generate_dictionary").addEventListener("click", function (event) {
        event.preventDefault();
        update_data_dictionary();
    });
    document.getElementById("button_save_all").addEventListener("click", function (event) {
        event.preventDefault();
        saveAllDictionary();
    });
    document.getElementById("button_refresh").addEventListener("click", function (event) {
        event.preventDefault();
        refresh_dictionary_table();
    });
    document.getElementById("button_save_openai_changes").addEventListener("click", function (event) {
        event.preventDefault();
        save_openai_changes();
    });
});

async function update_data_dictionary() {
    var table_dictionary = document.querySelector("#tableDictionary > tbody").innerHTML;
    if (table_dictionary != "") {
        //var confirmacion = confirm("Are you sure you want to reload dictionary?. This action will replace all data.");
        //if (!confirmacion) {
        //    return;
        //}
        const confirmacion = await showConfirmDialog({ message: "Are you sure you want to reload dictionary?. This action will replace all data." });
        if (!confirmacion) {
            return;
        }
    }
    const table_name = document.getElementById("table_name");
    const table_selected = table_name.options[table_name.selectedIndex];
    if (table_name.value == "-1") {
        return;
    }
    var data = JSON.stringify({
        id_table: table_name.value, 
        sql_server: table_selected.getAttribute("data-secret"), 
        source_table: table_selected.getAttribute("data-source"), 
    });
    document.getElementById("table_name").disabled = true;
    document.getElementById("box_table_dictionary").style.overflow = "hidden";
    document.getElementById("overlay_dictionary_table").style.display = "block";
    document.getElementById("button_generate_dictionary").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("button_generate_dictionary").disabled = true;
    document.getElementById("button_add_row").disabled = true;
    document.getElementById("button_save_all").disabled = true;
    document.getElementById("button_refresh").disabled = true;
    $.ajax({
        url: "/dictionary/ReloadDataDictionary",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {

            if (result.code_error) {
                document.getElementById("table_name").disabled = false;
                document.getElementById("box_table_dictionary").style.overflow = "auto";
                document.getElementById("button_generate_dictionary").innerHTML = window.dictionary_generate_dictionary_button;
                document.getElementById("button_generate_dictionary").disabled = false;
                document.getElementById("button_add_row").disabled = false;
                document.getElementById("button_save_all").disabled = false;
                document.getElementById("button_refresh").disabled = false;
                sendNotification(result.code_error);
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            document.getElementById("table_name").disabled = false;
            document.getElementById("box_table_dictionary").style.overflow = "auto";
            document.getElementById("button_generate_dictionary").innerHTML = window.dictionary_generate_dictionary_button;
            document.getElementById("button_generate_dictionary").disabled = false;
            document.getElementById("button_add_row").disabled = false;
            document.getElementById("button_save_all").disabled = false;
            document.getElementById("button_refresh").disabled = false;
            refresh_dictionary_table();
            sendNotification(window.chatbot_notification_dictionary_loaded);
        },
        error: (error) => {
            document.getElementById("table_name").disabled = false;
            document.getElementById("box_table_dictionary").style.overflow = "auto";
            document.getElementById("button_generate_dictionary").innerHTML = window.dictionary_generate_dictionary_button;
            document.getElementById("button_generate_dictionary").disabled = false;
            document.getElementById("button_add_row").disabled = false;
            document.getElementById("button_save_all").disabled = false;
            document.getElementById("button_refresh").disabled = false;
            console.log(error.toString());
            showAlert({
                msg: error.toString(), 
                type: "error"
            });
        }
    })

}


function addRowBelow() {
    const row_id = uuidv4();
    const table = document.getElementById("tableDictionary").getElementsByTagName('tbody')[0];
    const newRow = table.insertRow(-1);
    newRow.id = row_id;
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    const cell4 = newRow.insertCell(3);
    const cell5 = newRow.insertCell(4);
    const cell6 = newRow.insertCell(5);
    const cell7 = newRow.insertCell(6);
    const cell8 = newRow.insertCell(7);
    cell1.innerHTML = '<span class="number-table"></span>';
    cell2.innerHTML = '<div id="column_name_' + row_id + '"  class="cell-editable-style" contenteditable="true" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>';
    cell3.innerHTML = '<div id="data_type_' + row_id + '"  class="cell-editable-style" contenteditable="true" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>';
    cell4.innerHTML = '<div class="cell-editable-style" style="display: flex;align-items: center;"><textarea id="description_' + row_id + '" rows="3" style="width: 100%;border: none;background-color: transparent;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea><button class="button-action-table" id="btn_generate_description_chatgpt_' + row_id + '" onclick="generate_description_chatgpt(\'' + row_id + '\')" title="' + window.dictionary_title_generate_with_chatgpt + '"><img src="../static/dist/img/sqlv7/li_bot.svg" alt="Robot" style="width: 17px;vertical-align: top;margin-right: 3px;"></button></div>';
    cell5.innerHTML = '<textarea id="examples_' + row_id + '"  class="cell-editable-style" rows="3" style="width: 100%;background-color: transparent;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>';
    cell6.innerHTML = '<div><input type="radio" id="last_date_updated_at_' + row_id + '" name="last_date_updated"></div>';
    cell6.style.textAlign = "center";
    cell6.style.verticalAlign = "middle";
    cell7.innerHTML = '<div id="updated_at_' + row_id + '" style="text-align: center;">' + window.chatbot_now + '</div>';
    cell8.innerHTML = '<td><button class="button-action-table" onclick="delete_newrow_table(this)"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    
    refreshTableNumber("tableDictionary");

    const tableBody = document.getElementById('tableDictionary');
    const lastRow = tableBody.lastElementChild;
    lastRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
function delete_newrow_table(boton) {
    var fila = boton.parentNode.parentNode; // Obtener la fila que contiene el botón
    fila.parentNode.removeChild(fila); // Eliminar la fila
    refreshTableNumber("tableDictionary");
}

function saveAllDictionary() {
    // Cache DOM elements
    const tableName = document.getElementById("table_name");
    const overlay = document.getElementById("overlay_dictionary_table");
    const generateBtn = document.getElementById("button_generate_dictionary");
    const saveBtn = document.getElementById("button_save_all");
    const addRowBtn = document.getElementById("button_add_row");
    const refreshBtn = document.getElementById("button_refresh");
    const table = document.getElementById("tableDictionary");

    // Validate table selection
    const idTable = tableName.value;
    if (idTable === "-1") return;

    // Validate table existence
    if (!table) {
        console.error("Data table not found");
        return;
    }

    // Collect table data
    const tableData = [];
    const rows = table.rows;
    
    if (rows.length < 2) return; // No data rows (header only)

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const rowId = row.id;
        
        if (!rowId) {
            console.warn(`Row at index ${rowIndex} missing ID, skipping`);
            continue;
        }

        const columnNameElem = document.getElementById(`column_name_${rowId}`);
        const dataTypeElem = document.getElementById(`data_type_${rowId}`);
        const descriptionElem = document.getElementById(`description_${rowId}`);
        const examplesElem = document.getElementById(`examples_${rowId}`);
        const lastUpdatedCheckbox = document.getElementById(`last_date_updated_at_${rowId}`);

        if (!columnNameElem || !dataTypeElem || !descriptionElem || !examplesElem || !lastUpdatedCheckbox) {
            console.warn(`Row ${rowId} missing required elements, skipping`);
            continue;
        }

        tableData.push({
            row_id: rowId,
            column_name: columnNameElem.textContent.trim(),
            data_type: dataTypeElem.textContent.trim(),
            description: descriptionElem.value.trim(),
            examples: examplesElem.value.trim(),
            last_date_updated: lastUpdatedCheckbox.checked ? 1 : 0
        });
    }

    // UI state management
    const disableUI = () => {
        tableName.disabled = true;
        overlay.style.display = "block";
        [generateBtn, saveBtn, addRowBtn, refreshBtn].forEach(btn => btn.disabled = true);
        saveBtn.innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    };

    const enableUI = () => {
        tableName.disabled = false;
        overlay.style.display = "none";
        [generateBtn, saveBtn, addRowBtn, refreshBtn].forEach(btn => btn.disabled = false);
        saveBtn.innerHTML = window.chatbot_save_button;
    };

    disableUI();

    // Prepare and send request
    fetch("/dictionary/SaveAllDictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_table: idTable, tableData })
    })
    .then(async response => {
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || "Request failed");
        }
        return response.json();
    })
    .then(result => {
        if (result.code_error) {
            showAlert({ msg: result.code_error, type: "error" });
            return;
        }
        refresh_dictionary_table();
    })
    .catch(error => {
        console.error("Save error:", error);
        showAlert({ msg: error.message, type: "error" });
    })
    .finally(() => {
        enableUI();
    });
}

function refresh_dictionary_table() {
    const id_table = document.getElementById("table_name").value;
    if (id_table == "-1") {
        const table = document.getElementById("tableDictionary").getElementsByTagName('tbody')[0];
        table.innerHTML = "";
        document.getElementById("overlay_dictionary_table").style.display = "none";
        return;
    }
    document.getElementById("overlay_dictionary_table").style.display = "block";
    var data = JSON.stringify({
        id_table: id_table 
    });

    const table = document.getElementById("tableDictionary").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/dictionary/ReadDictionaryTable',
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
            if (result.length > 0) {
                data_table_dictionary(result);
            }
            document.getElementById("overlay_dictionary_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function data_table_dictionary(data) {
    const table = document.getElementById("tableDictionary").getElementsByTagName('tbody')[0];
    for (let index = 0; index < data.length; index++) {
        const newRow = table.insertRow(-1);
        newRow.id = data[index]["Id"];
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4);
        const cell6 = newRow.insertCell(5);
        const cell7 = newRow.insertCell(6);
        const cell8 = newRow.insertCell(7);
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<div id="column_name_' + data[index]["Id"] + '" class="cell-editable-style" contenteditable="true" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' + data[index]["Column_Name"] + '</div>';
        cell3.innerHTML = '<div id="data_type_' + data[index]["Id"] + '" class="cell-editable-style" contenteditable="true" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' + data[index]["Data_Type"] + '</div>';
        cell4.innerHTML = '<div class="cell-editable-style" style="display: flex;align-items: center;"><textarea id="description_' + data[index]["Id"] + '" rows="3" style="width: 100%;border: none;background-color: transparent;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' + data[index]["Description"] + '</textarea><button class="button-action-table" id="btn_generate_description_chatgpt_' + data[index]["Id"] + '" onclick="generate_description_chatgpt(\'' + data[index]["Id"] + '\')" title="' + window.dictionary_title_generate_with_chatgpt + '"><img src="../static/dist/img/sqlv7/li_bot.svg" alt="Robot" style="width: 17px;vertical-align: top;margin-right: 3px;"></button></div>';
        cell5.innerHTML = '<textarea id="examples_' + data[index]["Id"] + '" class="cell-editable-style" rows="3" style="width: 100%;background-color: transparent;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' + data[index]["Example"] + '</textarea>';
        cell6.innerHTML = '<div><input type="radio" id="last_date_updated_at_' + data[index]["Id"] + '" name="last_date_updated" ' + data[index]["last_date_updated"] + '></div>';
        cell6.style.textAlign = "center";
        cell6.style.verticalAlign = "middle";
        cell7.innerHTML = '<div id="updated_at_' + data[index]["Id"] + '">' + data[index]["Updated_At"] + '</div>';
        //cell8.innerHTML = '<td><button class="button-action-table" id="btn_update_dictionary_' + data[index]["Id"] + '" onclick="update_dictionary_table(\'' + data[index]["Id"] + '\')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_dictionary_' + data[index]["Id"] + '" onclick="delete_dictionary_table(\'' + data[index]["Id"] + '\')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
        cell8.innerHTML = '<td><button class="button-action-table" id="btn_delete_dictionary_' + data[index]["Id"] + '" onclick="delete_dictionary_table(\'' + data[index]["Id"] + '\')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tableDictionary");
}


function generate_description_chatgpt(id_row) {
    const select_table_name = document.getElementById("table_name");
    if (select_table_name.value == "-1") {
        return;
    }
    const selectedOption = select_table_name.options[select_table_name.selectedIndex];
    var dictionary_user_prompt = document.getElementById("dictionary_user_prompt").value;
    var column_name = document.getElementById("column_name_" + id_row).innerText;
    var data_type = document.getElementById("data_type_" + id_row).innerText;
    var examples = document.getElementById("examples_" + id_row).value;
    const language = document.getElementById("dictionary_language_description").value;
    var data = JSON.stringify({
        openai_object: OpenAIObject(),
        dictionary_user_prompt: dictionary_user_prompt,
        full_table_name: selectedOption.getAttribute("data-table"),
        column_name: column_name, 
        data_type: data_type, 
        examples: examples, 
        language: language  
    });
    document.getElementById("btn_generate_description_chatgpt_"+ id_row).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_generate_description_chatgpt_"+ id_row).disabled = true;
    $.ajax({
        url: '/dictionary/GenerateDescriptionChatgpt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_generate_description_chatgpt_"+ id_row).innerHTML = '<img src="../static/dist/img/sqlv7/li_bot.svg" alt="Robot" style="width: 17px;vertical-align: top;margin-right: 3px;">';
                document.getElementById("btn_generate_description_chatgpt_"+ id_row).disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            document.getElementById("description_" + id_row).value = result;
            document.getElementById("btn_generate_description_chatgpt_"+ id_row).innerHTML = '<img src="../static/dist/img/sqlv7/li_bot.svg" alt="Robot" style="width: 17px;vertical-align: top;margin-right: 3px;">';
            document.getElementById("btn_generate_description_chatgpt_"+ id_row).disabled = false;
        },
        error: (error) => {
            console.log(error);
        }
    });
}






function update_dictionary_table(id_row, with_refresh = 0) {
    const id_table = document.getElementById("table_name").value;
    var column_name = document.getElementById("column_name_" + id_row).innerText;
    var data_type = document.getElementById("data_type_" + id_row).innerText;
    var description = document.getElementById("description_" + id_row).value;
    var examples = document.getElementById("examples_" + id_row).value;
    if (column_name == "" || data_type == "") {
        return;
    }
    var data = JSON.stringify({
        id_row: id_row,
        id_table: id_table, 
        column_name: column_name, 
        data_type: data_type, 
        description: description, 
        examples: examples 
    });
    document.getElementById("btn_update_dictionary_" + id_row).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_dictionary_" + id_row).disabled = true;
    $.ajax({
        url: '/dictionary/UpdateDictionaryTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_dictionary_" + id_row).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_dictionary_" + id_row).disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            if (with_refresh == 1) {
                refresh_dictionary_table();
            } else {
                document.getElementById("btn_update_dictionary_" + id_row).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_dictionary_" + id_row).disabled = false;
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function delete_dictionary_table(id_row) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        id_row: id_row
    });
    document.getElementById("btn_delete_dictionary_" + id_row).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_dictionary_" + id_row).disabled = true;

    $.ajax({
        url: '/dictionary/DeleteDictionaryTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_delete_dictionary_" + id_row).innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                document.getElementById("btn_delete_dictionary_" + id_row).disabled = true;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            refresh_dictionary_table();
        },
        error: (error) => {
            console.log(error);
        }
    });

}



function save_main_changes() {
    var dictionary_user_prompt = document.getElementById('dictionary_user_prompt').value;
    data = JSON.stringify({
        dictionary_user_prompt: dictionary_user_prompt 
    });
    document.getElementById("button_save_main_changes").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("button_save_main_changes").disabled = true;
    $.ajax({
        url: "/dictionary/SaveMainSetting",
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
            console.log(error.toString());
            showAlert({
                msg: error.toString(), 
                type: "error"
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
    
    if (openai_timeout == 0) {
        openai_timeout = 60;
    }
    if (azure_openai_timeout == 0) {
        azure_openai_timeout = 60;
    }

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
        url: '/dictionary/SaveOpenAISetting',
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
            console.log(error.toString());
            showAlert({
                msg: error.toString(), 
                type: "error"
            });
        }
    })

}



