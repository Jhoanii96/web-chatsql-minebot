var option_roles_html = "";
// Object to store checkbox states
var checkboxStates = {};
var option_gender = `
<select id="option_gender_{row_number}" style="border: none;width: 100%;background-color: transparent;">
    <option value="-1">Unknown</option>
    <option value="0">Male</option>
    <option value="1">Female</option>
</select>
`;

// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    refresh_user_table();
    refresh_userrole_table();
    refresh_module_table();
    load_users();
    refresh_copy_historical_area();
    document.getElementById("select_role_permission").addEventListener("change", function () {
        refresh_permissions();
    });
    document.getElementById("select_role_flow_permission").addEventListener("change", function () {
        refresh_flow_permissions();
    });
});

function refresh_user_table() {
    document.getElementById("overlay_user_table").style.display = "block";
    const table = document.getElementById("tableUser").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/user/ReadUserTable',
        contentType: 'application/json',
        method: 'GET',
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
                var roles = data[0];
                var data_user = data[1];
                data_dropdown_roles(roles);
                data_table_user(data_user);
            }
            document.getElementById("overlay_user_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}
function data_table_user(data) {
    const table = document.getElementById("tableUser").getElementsByTagName('tbody')[0];
    for (let index = 0; index < data.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4);
        const cell6 = newRow.insertCell(5);
        const cell7 = newRow.insertCell(6);
        const cell8 = newRow.insertCell(7);
        var password_action = '';
        var email_action = '';
        if (data[index]["is_azure_user"] == true) {
            email_action = '<div id="email_' + (index + 1).toString() + '">' + data[index]["email"] + '</div>';
        } else {
            email_action = '<div id="email_' + (index + 1).toString() + '" contenteditable="true">' + data[index]["email"] + '</div>';
            password_action = '<input type="password" id="password_' + (index + 1).toString() + '" class="form-control" value="' + data[index]["password"] + '" onkeydown="clearInput(this)" onkeyup="clearInput(this)" style="border-style: none;background-color: transparent;">';
        }
        cell1.innerHTML = '<span id="id_user_' + (index + 1).toString() + '" data-id="' + data[index]["id_user"] + '" class="number-table">0</span>';;
        cell2.innerHTML = '<div id="username_' + (index + 1).toString() + '" contenteditable="true">' + data[index]["user_name"] + '</div>';
        cell3.innerHTML = '<div id="lastname_' + (index + 1).toString() + '" contenteditable="true">' + data[index]["last_name"] + '</div>';
        cell4.innerHTML = option_gender.replace("{row_number}", (index + 1).toString());
        cell5.innerHTML = email_action;
        cell6.innerHTML = password_action;
        cell7.innerHTML = option_roles_html.replace("{row_number}", (index + 1).toString());
        cell8.innerHTML = '<td><button class="button-action-table" id="btn_update_user_' + (index + 1).toString() + '" onclick="update_user_table(' + (index + 1).toString() + ')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_user_' + (index + 1).toString() + '" onclick="delete_user_table(' + (index + 1).toString() + ')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tableUser");
    for (let index = 0; index < data.length; index++) {
        document.getElementById("role_select_" + (index + 1).toString()).value = data[index]["id_role"];
        document.getElementById("option_gender_" + (index + 1).toString()).value = data[index]["gender"];
    }
}

function data_dropdown_roles(roles) {
    option_roles_html = '<select id="role_select_{row_number}" style="border: none;width: 100%;background-color: transparent;">';
    for (let index = 0; index < roles.length; index++) {
        const id = roles[index]["id_role"].toString();
        const element = roles[index]["role_name"];
        option_roles_html += '<option value="' + id + '">' + element + '</option>';
    }
    option_roles_html += '</select>';
}

function save_user() {
    var input_username = document.getElementById("input_username").value;
    var input_lastname = document.getElementById("input_lastname").value;
    var select_gender = document.getElementById("select_gender").msDropdown.value;
    var input_email = document.getElementById("input_email").value;
    var input_password = document.getElementById("input_password").value;
    var input_rpassword = document.getElementById("input_rpassword").value;
    var select_role = document.getElementById("select_role").msDropdown.value;
    if (input_password != input_rpassword) {
        return;
    }
    var data = JSON.stringify({
        input_username: input_username, 
        input_lastname: input_lastname, 
        select_gender: select_gender, 
        input_email: input_email, 
        input_password: input_password, 
        select_role: select_role  
    });
    document.getElementById("button_save_user").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_user").disabled = true;
    $.ajax({
        url: '/user/SaveUser',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_user").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_user").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_user").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_user").disabled = false;
            document.getElementById("input_username").value = "";
            document.getElementById("input_lastname").value = "";
            document.getElementById("input_email").value = "";
            document.getElementById("input_password").value = "";
            document.getElementById("input_rpassword").value = "";
            refresh_user_table();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function update_user_table(row_number) {
    var id_user = document.getElementById("id_user_" + (row_number).toString());
    var id_user_guid = id_user.getAttribute("data-id");
    var username_value = document.getElementById("username_" + (row_number).toString()).innerText;
    var lastname_value = document.getElementById("lastname_" + (row_number).toString()).innerText;
    var option_gender_value = document.getElementById("option_gender_" + (row_number).toString()).value;
    var email_value = document.getElementById("email_" + (row_number).toString()).innerText;
    var password_value = "";
    if (document.getElementById("password_" + (row_number).toString())) {
        password_value = document.getElementById("password_" + (row_number).toString()).value;
    }
    var role_select_value = document.getElementById("role_select_" + (row_number).toString()).value;
    var data = JSON.stringify({
        id_user_guid: id_user_guid,
        username_value: username_value, 
        lastname_value: lastname_value, 
        option_gender_value: option_gender_value, 
        email_value: email_value, 
        password_value: password_value, 
        role_select_value: role_select_value 
    });
    document.getElementById("btn_update_user_" + row_number).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_user_" + row_number).disabled = true;
    $.ajax({
        url: '/user/UpdateUser',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_user_" + row_number).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_user_" + row_number).disabled = false;
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
                refresh_user_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}
async function delete_user_table(row_number) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }
    var element_id = document.getElementById("id_user_" + (row_number).toString());
    var id_user = element_id.getAttribute("data-id");
    var data = JSON.stringify({
        id_user: id_user
    });
    document.getElementById("btn_delete_user_" + row_number).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_user_" + row_number).disabled = true;
    $.ajax({
        url: '/user/DeleteUser',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            var data = result;
            if (result.code_error) {
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            console.log('Success:', data);
            data = data.result;
            if (data.length > 0) {
                refresh_user_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}





function refresh_userrole_table(reload_user_table = 0) {
    document.getElementById("overlay_userrole_table").style.display = "block";
    const table = document.getElementById("tableUserRole").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/user/ReadUserRoleTable',
        contentType: 'application/json',
        method: 'GET',
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
            var userrole = data.result;
            if (userrole.length > 0) {
                data_table_userrole(userrole);
                $('#select_role').find('option').remove();
                for (let index = 0; index < userrole.length; index++) {
                    const id = userrole[index]['id_role'];
                    const role_name = userrole[index]['role_name'];
                    $('#select_role').append('<option value="' + id + '" data-image="static/dist/img/users/8666609_user_icon.png">' + role_name + '</option>');
                }
                $('#select_role_permission').find('option').remove();
                $('#select_role_permission').append('<option value="-">Select</option>');
                $('#select_role_flow_permission').find('option').remove();
                $('#select_role_flow_permission').append('<option value="-">Select</option>');
                for (let index = 0; index < userrole.length; index++) {
                    const id = userrole[index]['id_role'];
                    const role_name = userrole[index]['role_name'];
                    $('#select_role_permission').append('<option value="' + id + '">' + role_name + '</option>');
                    $('#select_role_flow_permission').append('<option value="' + id + '">' + role_name + '</option>');
                }
                try {
                    var select_role = document.getElementById("select_role");
                    if (select_role.msDropdown === undefined) {
                        MsDropdown.make('#select_role');
                    } else {
                        select_role.msDropdown.refresh();
                    }
                } catch (e) {
                    alert(e.message);
                }

                if (reload_user_table == 1) {
                    refresh_user_table();
                }
            }
            document.getElementById("overlay_userrole_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function data_table_userrole(data) {
    const table = document.getElementById("tableUserRole").getElementsByTagName('tbody')[0];
    for (let index = 0; index < data.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4);
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<div id="userrole_name_' + data[index]["id_role"] + '" contenteditable="true">' + data[index]["role_name"] + '</div>';
        cell3.innerHTML = '<div id="userrole_name_en_' + data[index]["id_role"] + '" contenteditable="true">' + data[index]["role_name_en"] + '</div>';
        cell4.innerHTML = '<div id="userrole_name_es_' + data[index]["id_role"] + '" contenteditable="true">' + data[index]["role_name_es"] + '</div>';
        cell5.innerHTML = '<td><button class="button-action-table" id="btn_update_userrole_' + data[index]["id_role"] + '" onclick="update_userrole_table(\'' + data[index]["id_role"] + '\')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_userrole_' + data[index]["id_role"] + '" onclick="delete_userrole_table(\'' + data[index]["id_role"] + '\')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tableUserRole");
}

function save_userrole() {
    var input_rolename = document.getElementById("input_rolename").value;
    if (input_rolename.length === 0) {
        return;
    }
    var data = JSON.stringify({
        role_name: input_rolename 
    });
    document.getElementById("button_save_userrole").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_userrole").disabled = true;
    $.ajax({
        url: '/user/SaveUserRole',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_userrole").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_userrole").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_userrole").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_userrole").disabled = false;
            document.getElementById("input_rolename").value = "";
            refresh_userrole_table(1);
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function update_userrole_table(id_object) {
    var userrole_name = document.getElementById("userrole_name_" + id_object).innerText;
    var userrole_name_en = document.getElementById("userrole_name_en_" + id_object).innerText;
    var userrole_name_es = document.getElementById("userrole_name_es_" + id_object).innerText;
    if (userrole_name.length === 0 || userrole_name_en.length === 0 || userrole_name_es.length === 0) {
        return;
    }
    var data = JSON.stringify({
        id_role: id_object, 
        role_name: userrole_name, 
        role_name_en: userrole_name_en, 
        role_name_es: userrole_name_es  
    });
    document.getElementById("btn_update_userrole_" + id_object).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_userrole_" + id_object).disabled = true;
    $.ajax({
        url: '/user/UpdateUserRole',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_userrole_" + id_object).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_userrole_" + id_object).disabled = false;
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
                refresh_userrole_table(1);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function delete_userrole_table(id_object) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        id_role: id_object
    });
    document.getElementById("btn_delete_userrole_" + id_object).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_userrole_" + id_object).disabled = true;
    $.ajax({
        url: '/user/DeleteUserRole',
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
                refresh_userrole_table(1);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}






function refresh_module_table() {
    document.getElementById("overlay_module_table").style.display = "block";
    const table = document.getElementById("tableModule").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/user/ReadModuleTable',
        contentType: 'application/json',
        method: 'GET',
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
            var module = data.result;
            if (module.length > 0) {
                data_table_module(module);
                refresh_permissions();
                refresh_flow_permissions();
            }
            document.getElementById("overlay_module_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}
function data_table_module(data) {
    const table = document.getElementById("tableModule").getElementsByTagName('tbody')[0];
    for (let index = 0; index < data.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        var status = data[index]["status"] ? 'checked' : '';
        var module_all_no_actions = '';
        var module_all_status = '';
        if (data[index]["id_module"] != '00000000-0000-0000-0000-000000000000') {
            module_all_status = '<input type="checkbox" id="status_' + data[index]["id_module"] + '" ' + status + '>';
            module_all_no_actions = '<td><button class="button-action-table" id="btn_update_module_' + data[index]["id_module"] + '" onclick="update_module_table(\'' + data[index]["id_module"] + '\')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_module_' + data[index]["id_module"] + '" onclick="delete_module_table(\'' + data[index]["id_module"] + '\')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
        }
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<div id="module_name_' + data[index]["id_module"] + '" contenteditable="true">' + data[index]["module_name"] + '</div>';
        cell3.innerHTML = module_all_status;
        cell4.innerHTML = module_all_no_actions;
    
    }
    refreshTableNumber("tableModule");
}

function save_module() {
    document.getElementById("button_save_module").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_module").disabled = true;
    var input_module = (document.getElementById("input_module").value).toString();
    if (input_module.length === 0) {
        document.getElementById("button_save_module").innerHTML = window.chatbot_save_button;
        document.getElementById("button_save_module").disabled = false;
        return;
    }
    var data = JSON.stringify({
        module_name: input_module  
    });
    $.ajax({
        url: '/user/SaveModule',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_module").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_module").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_module").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_module").disabled = false;
            document.getElementById("input_module").value = "";
            refresh_module_table();
        },
        error: (error) => {
            console.log(error);
        }
    });
}
function update_module_table(id_object) {
    document.getElementById("btn_update_module_" + id_object).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_module_" + id_object).disabled = true;
    var module_name = document.getElementById("module_name_" + id_object).innerText;
    var status = document.getElementById("status_" + id_object).checked ? 1 : 0;
    if (module_name.length === 0) {
        document.getElementById("btn_update_module_" + id_object).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
        document.getElementById("btn_update_module_" + id_object).disabled = false;
        return;
    }
    var data = JSON.stringify({
        id_module: id_object,
        module_name: module_name, 
        status: status 
    });
    $.ajax({
        url: '/user/UpdateModule',
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
                refresh_module_table();
            }

            //document.getElementById("btn_update_roleid_" + row_id).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
            //document.getElementById("btn_update_roleid_" + row_id).disabled = false;
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function delete_module_table(id_object) {
    //var confirmacion = confirm(window.chatbot_delete_item_error);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item_error });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        id_module: id_object
    });
    document.getElementById("btn_delete_module_" + id_object).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_module_" + id_object).disabled = true;
    $.ajax({
        url: '/user/DeleteModule',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            var data = result;
            console.log('Success:', data);
            data = data.result;
            if (data.length > 0) {
                refresh_module_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}













function refresh_permissions() {
    // Get the container div
    const container = document.getElementById("checkboxContainer");
    container.innerHTML = "";
    id_role = document.getElementById("select_role_permission").value;
    if (id_role == "-") {
        return;
    }
    var data = JSON.stringify({
        id_role: id_role   
    });
    document.getElementById("select_role_message").style.display = "block";
    checkboxStates = {};
    $.ajax({
        url: '/user/ReadPermissions',
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
            var module = data.result;
            if (module.length > 0) {
                // Loop to create and append checkboxes
                for (let i = 0; i < module.length; i++) {
                    // Create div element
                    const div = document.createElement("div");
                    div.className = "checkbox";
                    // Create input element
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = "permission_" + module[i]["id_module"];
                    input.dataset.id = module[i]["id_module"];
                    input.name = module[i]["module_name"];
                    input.className = "form-check-input";
                    if (module[i]["actived"] == true){
                        input.checked = true;
                    }
                    // Create label element
                    const label = document.createElement("label");
                    label.htmlFor = "permission_" + module[i]["id_module"];
                    label.className = "form-check-label";
                    label.textContent = module[i]["module_name"];
                    // Append input and label to div
                    div.appendChild(input);
                    div.appendChild(label);
                    // Append div to container
                    container.appendChild(div);
                    checkboxStates[module[i]["id_module"]] = module[i]["actived"];
                    handleAllCheckbox("form-check-input", "permission_00000000-0000-0000-0000-000000000000");
                }
            }
            document.getElementById("select_role_message").style.display = "none";
        },
        error: (error) => {
            document.getElementById("select_role_message").style.display = "none";
            console.log(error);
        }
    });
}

function refresh_flow_permissions() {
    // Get the container div
    const container = document.getElementById("checkboxFlowContainer");
    container.innerHTML = "";
    id_role = document.getElementById("select_role_flow_permission").value;
    if (id_role == "-") {
        return;
    }
    var data = JSON.stringify({
        id_role: id_role   
    });
    document.getElementById("select_role_flow_message").style.display = "block";
    $.ajax({
        url: '/user/ReadFlowPermissions',
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
            result.forEach(flow => {
                const div = document.createElement('div');
                div.classList.add('checkbox');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `flow_${flow.id}`;
                checkbox.value = flow.id;
                if (flow.actived) {
                    checkbox.checked = true;
                }

                const label = document.createElement('label');
                label.classList.add('form-check-label');
                label.htmlFor = checkbox.id;
                label.textContent = `${flow.phase_category} | ${flow.phase_name}`;

                div.appendChild(checkbox);
                div.appendChild(label);
                container.appendChild(div);
            });
            document.getElementById("select_role_flow_message").style.display = "none";
        },
        error: (error) => {
            document.getElementById("select_role_flow_message").style.display = "none";
            console.log(error);
        }
    });
}




function handleAllCheckbox(groupClass, allCheckboxId) {
    const checkboxes = document.querySelectorAll('.' + groupClass);
    const allCheckbox = document.getElementById(allCheckboxId);
    allCheckbox.addEventListener('change', function() {
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = allCheckbox.checked;
            updateCheckboxState(checkbox);
        });
        saveCheckboxStates();
    });
    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            if (!this.checked) {
                allCheckbox.checked = false;
            } else {
                // Check if all other checkboxes are checked
                const allChecked = Array.from(checkboxes).every(function(checkbox) {
                    return checkbox.checked;
                });
                allCheckbox.checked = allChecked;
            }
            updateCheckboxState(this);
            saveCheckboxStates();
        });
    });
}
// Function to update checkbox state in the object
function updateCheckboxState(checkbox) {
    checkboxStates[checkbox.dataset.id] = checkbox.checked ? 1 : 0;
}
// Function to save checkbox states using AJAX
function saveCheckboxStates() {
    // Here you would implement your AJAX call to send checkboxStates to the server
    console.log("Checkbox states:", checkboxStates);
}

function update_permission() {
    document.getElementById("button_update_permission").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_update_permission").disabled = true;
    var id_role = (document.getElementById("select_role_permission").value).toString();
    if (input_module.length === 0) {
        document.getElementById("button_update_permission").innerHTML = window.chatbot_save_button;
        document.getElementById("button_update_permission").disabled = false;
        return;
    }
    var data = JSON.stringify({
        id_role: id_role,
        permissions: checkboxStates
    });
    $.ajax({
        url: '/user/UpdatePermissions',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_update_permission").innerHTML = window.chatbot_save_button;
                document.getElementById("button_update_permission").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_update_permission").innerHTML = window.chatbot_save_button;
            document.getElementById("button_update_permission").disabled = false;
            refresh_permissions();
        },
        error: (error) => {
            document.getElementById("button_update_permission").innerHTML = window.chatbot_save_button;
            document.getElementById("button_update_permission").disabled = false;
            console.log(error);
        }
    });
}

function update_flow_permission() {
    document.getElementById("button_update_flow_permission").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_update_flow_permission").disabled = true;
    
    const roleSelect = document.getElementById('select_role_flow_permission');
    const id_role = roleSelect.value;
    if (id_role === '-') {
        document.getElementById("button_update_flow_permission").innerHTML = window.chatbot_save_button;
        document.getElementById("button_update_flow_permission").disabled = false;
        return;
    }

    const permissions = Array.from(document.querySelectorAll('#checkboxFlowContainer input'))
        .map(checkbox => ({
            id_flow: checkbox.value,
            actived: checkbox.checked ? 1 : 0
        }));
    var data = JSON.stringify({
        id_role: id_role,
        permissions: permissions 
    });
    $.ajax({
        url: '/user/UpdateFlowPermissions',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_update_flow_permission").innerHTML = window.chatbot_save_button;
                document.getElementById("button_update_flow_permission").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_update_flow_permission").innerHTML = window.chatbot_save_button;
            document.getElementById("button_update_flow_permission").disabled = false;
            refresh_flow_permissions();
        },
        error: (error) => {
            document.getElementById("button_update_flow_permission").innerHTML = window.chatbot_save_button;
            document.getElementById("button_update_flow_permission").disabled = false;
            console.log(error);
        }
    });
}



function load_users() {
    $.ajax({
        url: '/user/LoadUsers',
        contentType: 'application/json',
        method: 'GET',
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
            var users = data.result;
            if (users.length > 0) {
                $('#select_origin_user').find('option').remove();
                $('#select_origin_user').append('<option value="-">' + window.chatbot_select + '</option>');
                $('#select_destination_user').find('option').remove();
                $('#select_destination_user').append('<option value="-">' + window.chatbot_select + '</option>');
                for (let index = 0; index < users.length; index++) {
                    const id = users[index]['id_user'];
                    const name = users[index]['user'];
                    const role_name = users[index]['role_name'];
                    $('#select_origin_user').append('<option value="' + id + '">' + name + '</option>');
                    if (role_name != "Admin") {
                        $('#select_destination_user').append('<option value="' + id + '">' + name + '</option>');
                    }
                }
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function copy_user_dataset() {
    var select_origin_user = document.getElementById("select_origin_user").value;
    var select_destination_user = document.getElementById("select_destination_user").value;
    if (select_origin_user == "-") {
        showAlert({
            msg: "Select a origin user.", 
            type: "information"
        });
        return;
    }
    if (select_destination_user == "-") {
        showAlert({
            msg: "Select a destination user.", 
            type: "information"
        });
        return;
    }
    //var confirmacion = confirm(window.user_confirmation_copy_user_dataset);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.user_confirmation_copy_user_dataset });
    if (!confirmacion) {
        return;
    }
    document.getElementById("button_update_user_dataset").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_update_user_dataset").disabled = true;
    var data = JSON.stringify({
        origin_user: select_origin_user,
        destination_user: select_destination_user
    });
    $.ajax({
        url: '/user/CopyUserDataset',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_update_user_dataset").innerHTML = window.chatbot_save_button;
                document.getElementById("button_update_user_dataset").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_update_user_dataset").innerHTML = window.chatbot_save_button;
            document.getElementById("button_update_user_dataset").disabled = false;
            refresh_copy_historical_area();
        },
        error: (error) => {
            document.getElementById("button_update_user_dataset").innerHTML = window.chatbot_save_button;
            document.getElementById("button_update_user_dataset").disabled = false;
            console.log(error);
        }
    });
}


function refresh_copy_historical_area() {
    $.ajax({
        url: '/user/RefreshCopyHistoricalArea',
        contentType: 'application/json',
        method: 'GET',
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
            var historical = data.result;
            if (historical.length > 0) {
                document.getElementById("copy_historical_area").innerHTML = "";
                var historical_markdown = "";
                for (let index = 0; index < historical.length; index++) {
                    const user_origin = historical[index]['user_origin'];
                    const user_destination = historical[index]['user_destination'];
                    const created_at = historical[index]['created_at'];
                    historical_markdown += "- " + created_at + ": " + user_origin + " to " + user_destination + " ";
                }
                document.getElementById("copy_historical_area").innerHTML = safeMarkdownRender(historical_markdown);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}



