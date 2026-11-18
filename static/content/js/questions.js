
// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    checkCookieSelect('table_name', 'chatsql_table_name');
    chat_type();
    refresh_questions_table();
    document.getElementById("question_chat_type").addEventListener("change", function (event) {
        event.preventDefault();
        refresh_questions_table();
        chat_type();
    });

    document.getElementById("table_name").addEventListener("change", function (event) {
        event.preventDefault();
        refresh_questions_table();
    });
});

function chat_type() {
    const question_chat_type = document.getElementById("question_chat_type").value;
    if (question_chat_type == "Sql") {
        document.getElementById("sql_tablename").style.display = "block";
    } else {
        document.getElementById("sql_tablename").style.display = "none";
    }
}




function save_question() {
    var question_chat_type = document.getElementById("question_chat_type").value;
    var id_table = document.getElementById("table_name").value;
    var input_question = document.getElementById("input_question").value;
    if (input_question.length === 0) {
        return;
    }
    var data = JSON.stringify({
        question_chat_type: question_chat_type, 
        id_table: id_table, 
        input_question: input_question  
    });
    document.getElementById("button_save_question").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_question").disabled = true;
    $.ajax({
        url: '/questions/SaveQuestions',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_question").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_question").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_question").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_question").disabled = false;
            refresh_questions_table(); 
        },
        error: (error) => {
            console.log(error);
        }
    });
}



function refresh_questions_table() {
    const question_chat_type = document.getElementById("question_chat_type").value;
    const id_table = document.getElementById("table_name").value;
    const table = document.getElementById("tableQuestions").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    document.getElementById("overlay_questions_table").style.display = "block";
    if (id_table == "-1" || id_table === undefined || id_table == "undefined") {
        document.getElementById("overlay_questions_table").style.display = "none";
        return;
    }

    var data = JSON.stringify({
        question_chat_type: question_chat_type, 
        id_table: id_table 
    });

    $.ajax({
        url: '/questions/ReadFrequentQuestionsTable',
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
                document.getElementById("overlay_questions_table").style.display = "none";
                return;
            }
            console.log('Success:', result);
            if (result.length > 0) {
                data_table_questions(result);
            }
            document.getElementById("overlay_questions_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function data_table_questions(data) {
    const table = document.getElementById("tableQuestions").getElementsByTagName('tbody')[0];
    for (let index = 0; index < data.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4);
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<div id="source_table_' + data[index]["Id"] + '">' + data[index]["Source_Table"] + '</div>';
        cell3.innerHTML = '<div id="question_' + data[index]["Id"] + '" class="question-table-column-input-row" contenteditable="true">' + data[index]["Question"] + '</div>';
        cell4.innerHTML = '<div id="created_at_' + data[index]["Id"] + '">' + data[index]["Created_At"] + '</div>';
        cell5.innerHTML = '<td><button class="button-action-table" id="btn_update_questions_' + data[index]["Id"] + '" onclick="update_questions_table(\'' + data[index]["Id"] + '\')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_questions_' + data[index]["Id"] + '" onclick="delete_questions_table(\'' + data[index]["Id"] + '\')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tableQuestions");
}

function update_questions_table(id_row) {
    var question = document.getElementById("question_" + id_row).innerText;
    if (question.length === 0) {
        return;
    }
    var data = JSON.stringify({
        id_row: id_row,
        question: question 
    });
    document.getElementById("btn_update_questions_" + id_row).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_questions_" + id_row).disabled = true;
    $.ajax({
        url: '/questions/UpdateFrequentQuestionsTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_questions_" + id_row).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_questions_" + id_row).disabled = false;
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
                refresh_questions_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function delete_questions_table(id_row) {
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
    document.getElementById("btn_delete_questions_" + id_row).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_questions_" + id_row).disabled = true;

    $.ajax({
        url: '/questions/DeleteFrequentQuestionsTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_delete_questions_" + id_row).innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                document.getElementById("btn_delete_questions_" + id_row).disabled = true;
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
                refresh_questions_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });

}





