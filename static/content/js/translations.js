
// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    transform_table_to_datatable({
        object_name: "#tableTranslations",
        column_defs: [
            { className: 'translations-table-style-1', targets: 0 },
            { className: 'translations-table-style-2', targets: 1 },
            { className: 'translations-table-style-3', targets: 2 },
            { className: 'translations-table-style-5', targets: 4 } 
        ]
    });
    
    refresh_translations_table();
    document.getElementById("button_refresh").addEventListener("click", function (event) {
        event.preventDefault();
        refresh_translations_table();
    });
});



function refresh_translations_table() {
    var datatable = $('#tableTranslations').dataTable();
    datatable.fnClearTable();
    var table = document.getElementById("tableTranslations").getElementsByTagName('tbody')[0];
    // Create a new row and set its HTML
    var row = table.insertRow();
    var cell = row.insertCell(0);
    cell.colSpan = 6; // Span across all columns
    cell.innerHTML = '<div style="text-align: center;"><i class="fa fa-circle-o-notch fa-spin"></i></div>';
    while (table.rows.length > 1) {
        table.deleteRow(0);
    }
    $.ajax({
        url: '/translations/ReadTranslationsTable',
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
            if (result.length > 0) {
                var data_list = [];
                for (var i = 0; i < result.length; i++) {
                    let language = "";
                    if (result[i]["lang"] == "en") {
                        language = window.chatbot_language_english;
                    } else {
                        language = window.chatbot_language_spanish;
                    }
                    data_list.push([
                        '<span class="number-table">' + (i + 1).toString() + '</span>',
                        '<span style="display: none;">' + result[i]["key"] + '</span><input id="key_' + result[i]["id"] + '" value="' + result[i]["key"] + '" style="background: transparent;border: none;width: 100%;" readonly>',
                        '<div>' + language + '</div>',
                        '<div><textarea id="translation_' + result[i]["id"] + '" rows="2" class="cell-editable-style" style="width: 100%;">' + result[i]["name"] + '</textarea></div>',
                        '<td><button class="button-action-table" id="btn_update_translations_' + result[i]["id"] + '" onclick="update_translations_table(' + result[i]["id"] + ')"><i class="fa fa-fw fa-edit"></i></button></td>' 
                    ]);
                }
                datatable.fnClearTable();
                datatable.fnAddData(data_list);
            } else {
                datatable.fnClearTable();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}


function update_translations_table(id_row) {
    const translation = document.getElementById("translation_" + id_row).value;
    if (translation.length === 0) {
        return;
    }
    var data = JSON.stringify({
        id_row: id_row,
        translation: translation 
    });
    document.getElementById("btn_update_translations_" + id_row).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_translations_" + id_row).disabled = true;
    $.ajax({
        url: '/translations/UpdateTranslationsTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_translations_" + id_row).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_translations_" + id_row).disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            if (result == "OK") {
                refresh_translations_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}




