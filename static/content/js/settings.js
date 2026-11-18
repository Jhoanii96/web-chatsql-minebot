var option_phaselist_html = "";
var option_settings_role_image = `
<select class="form-control" class="settings_role_image_tbl" id="settings_role_image_{row_number}" style="width: 150px;background-color: transparent;">
    <option value="dist/img/users/1.png" data-image="static/dist/img/users/1.png">Image 1</option>
    <option value="dist/img/users/2.png" data-image="static/dist/img/users/2.png">Image 2</option>
    <option value="dist/img/users/3.png" data-image="static/dist/img/users/3.png">Image 3</option>
    <option value="dist/img/users/4.png" data-image="static/dist/img/users/4.png">Image 4</option>
    <option value="dist/img/users/5.png" data-image="static/dist/img/users/5.png">Image 5</option>
    <option value="dist/img/users/6.png" data-image="static/dist/img/users/6.png">Image 6</option>
    <option value="dist/img/users/7.png" data-image="static/dist/img/users/7.png">Image 7</option>
</select>
`;

// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    try {
        //MsDropdown.make('#settings_phase_type');
        MsDropdown.make('#settings_role_image');
    } catch (e) {
        alert(e.message);
    }
    refresh_sqlserver_table();
    refresh_roleconfig_table();
    refresh_phasetype_table();
});

function save_secret_sqlserver() {
    var secrets = document.getElementById("secrets").value;
    var database_description = document.getElementById("database_description").value;
    if (secrets.length === 0 || database_description.length === 0) {
        return;
    }
    var data = JSON.stringify({
        secrets: secrets,
        database_description: database_description
    });
    document.getElementById("button_save_secret_sqlserver").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_secret_sqlserver").disabled = true;
    $.ajax({
        url: '/settings/save_sqlserver',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_secret_sqlserver").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_secret_sqlserver").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_secret_sqlserver").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_secret_sqlserver").disabled = false;
            refresh_sqlserver_table();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function refresh_sqlserver_table() {
    document.getElementById("overlay_sqlsecrets_table").style.display = "block";
    const table = document.getElementById("tableSqlSecrets").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/settings/ReadSqlTable',
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
            var secrets = data.result;
            if (secrets.length > 0) {
                data_table_secrets(secrets);
            }
            document.getElementById("overlay_sqlsecrets_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function data_table_secrets(secrets) {
    const table = document.getElementById("tableSqlSecrets").getElementsByTagName('tbody')[0];
    for (let index = 0; index < secrets.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<span>' + secrets[index]["secrets"] + '</span>';
        cell3.innerHTML = '<span>' + secrets[index]["database_description"] + '</span>';
        cell4.innerHTML = '<td><button class="button-action-table" id="btn_delete_sqlid_' + secrets[index]["id"] + '" onclick="delete_sqlserver_table(' + secrets[index]["id"] + ')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tableSqlSecrets");
}

async function delete_sqlserver_table(secret_id) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        secret_id: secret_id
    });
    document.getElementById("btn_delete_sqlid_" + secret_id).innerHTML = window.chatbot_deleting;
    document.getElementById("btn_delete_sqlid_" + secret_id).disabled = true;
    $.ajax({
        url: '/settings/delete_sqlsecret',
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
                refresh_sqlserver_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}










function save_phase_type() {
    var settings_phase_name = document.getElementById("settings_phase_name").value;
    var settings_chat_type = document.getElementById("settings_chat_type").value;
    if (settings_phase_name.length === 0 || settings_chat_type.length === 0) {
        return;
    }
    var data = JSON.stringify({
        settings_phase_name: settings_phase_name,
        settings_chat_type: settings_chat_type
    });
    document.getElementById("button_save_phasetype").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_phasetype").disabled = true;
    $.ajax({
        url: '/settings/save_phasetype',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_phasetype").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_phasetype").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_phasetype").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_phasetype").disabled = false;
            refresh_phasetype_table();
            refresh_roleconfig_table();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function refresh_phasetype_table() {
    document.getElementById("overlay_phasetype_table").style.display = "block";
    const table = document.getElementById("tablePhaseType").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/settings/ReadPhaseTypeTable',
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
            var phase = data.result;
            if (phase.length > 0) {
                data_table_phasetype(phase);
                $('#settings_phase_type').find('option').remove();
                for (let index = 0; index < phase.length; index++) {
                    const id = phase[index]['id'];
                    const phase_name = phase[index]['phase_name'];
                    $('#settings_phase_type').append('<option value="' + id + '">' + phase_name + '</option>');
                }
                try {
                    var settings_phase_type = document.getElementById("settings_phase_type");
                    if (settings_phase_type.msDropdown === undefined) {
                        MsDropdown.make('#settings_phase_type');
                    } else {
                        settings_phase_type.msDropdown.refresh();
                    }
                } catch (e) {
                    alert(e.message);
                }
            }
            document.getElementById("overlay_phasetype_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function data_table_phasetype(phase) {
    const table = document.getElementById("tablePhaseType").getElementsByTagName('tbody')[0];
    for (let index = 0; index < phase.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        cell1.innerHTML = '<span class="number-table"></span>';
        cell2.innerHTML = '<div id="phase_name_' + phase[index]["id"] + '" contenteditable="true">' + phase[index]["phase_name"] + '</div>';
        cell3.innerHTML = '<div id="chat_type_' + phase[index]["id"] + '" contenteditable="true">' + phase[index]["chat_type"] + '</div>';
        cell4.innerHTML = '<td><button class="button-action-table" id="btn_update_phaseid_' + phase[index]["id"] + '" onclick="update_phasetype_table(' + phase[index]["id"] + ')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_phaseid_' + phase[index]["id"] + '" onclick="delete_phasetype_table(' + phase[index]["id"] + ')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    }
    refreshTableNumber("tablePhaseType");
}

function update_phasetype_table(phase_id) {
    var settings_phase_name = document.getElementById("phase_name_" + phase_id).innerText;
    var settings_chat_type = document.getElementById("chat_type_" + phase_id).innerText;
    if (settings_phase_name.length === 0 || settings_chat_type.length === 0) {
        return;
    }
    var data = JSON.stringify({
        phase_id: phase_id,
        settings_phase_name: settings_phase_name,
        settings_chat_type: settings_chat_type
    });
    document.getElementById("btn_update_phaseid_" + phase_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_phaseid_" + phase_id).disabled = true;
    $.ajax({
        url: '/settings/update_phasetype',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("btn_update_phaseid_" + phase_id).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
                document.getElementById("btn_update_phaseid_" + phase_id).disabled = false;
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
                refresh_phasetype_table();
            }
            document.getElementById("btn_update_phaseid_" + phase_id).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
            document.getElementById("btn_update_phaseid_" + phase_id).disabled = false;
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function delete_phasetype_table(phase_id) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }

    var data = JSON.stringify({
        phase_id: phase_id
    });

    document.getElementById("btn_delete_phaseid_" + phase_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_phaseid_" + phase_id).disabled = true;

    $.ajax({
        url: '/settings/delete_phasetype',
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
                refresh_phasetype_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });

}






function save_role_config() {
    document.getElementById("button_save_roleconfig").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button_save_roleconfig").disabled = true;
    var settings_role_name = document.getElementById("settings_role_name").value;
    var settings_role_prompt = document.getElementById("settings_role_prompt").value;
    var settings_phase_type = document.getElementById("settings_phase_type").value;
    var settings_role_image = document.getElementById("settings_role_image").value;
    if (settings_role_name.length === 0 || settings_role_prompt.length === 0) {
        document.getElementById("button_save_roleconfig").innerHTML = window.chatbot_save_button;
        document.getElementById("button_save_roleconfig").disabled = false;
        return;
    }
    var data = JSON.stringify({
        settings_role_name: settings_role_name,
        settings_role_prompt: settings_role_prompt,
        settings_phase_type: settings_phase_type,
        settings_role_image: settings_role_image 
    });
    $.ajax({
        url: '/settings/save_roleconfiguration',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_roleconfig").innerHTML = window.chatbot_save_button;
                document.getElementById("button_save_roleconfig").disabled = false;
                showAlert({
                    msg: result.code_error, 
                    type: "error"
                });
                return;
            }
            var data = result;
            console.log('Success:', data);
            document.getElementById("button_save_roleconfig").innerHTML = window.chatbot_save_button;
            document.getElementById("button_save_roleconfig").disabled = false;
            refresh_roleconfig_table();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function refresh_roleconfig_table() {
    document.getElementById("overlay_roleconfig_table").style.display = "block";
    const table = document.getElementById("tableRoleConfig").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/settings/ReadRoleConfigurationTable',
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
                var role = data[0];
                var phase = data[1];
                data_phase_list(phase);
                data_table_roleconfig(role);
            }
            document.getElementById("overlay_roleconfig_table").style.display = "none";
        },
        error: (error) => {
            console.log(error);
        }
    });
}
function data_table_roleconfig(role) {
    const table = document.getElementById("tableRoleConfig").getElementsByTagName('tbody')[0];
    for (let index = 0; index < role.length; index++) {
        const newRow = table.insertRow(-1);
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4);
        const cell6 = newRow.insertCell(5);
        cell1.innerHTML = '<span id="role_id_' + (index + 1).toString() + '" data-id="' + role[index]["id_role"] + '" class="number-table"></span>';
        cell2.innerHTML = '<div id="role_name_' + (index + 1).toString() + '" contenteditable="true">' + role[index]["role_name"] + '</div>';
        cell3.innerHTML = '<textarea id="role_description_' + (index + 1).toString() + '" rows="3" style="width: 100%;border: none;background-color: transparent;">' + role[index]["role_description"] + '</textarea>';
        cell4.innerHTML = option_phaselist_html.replace("{row_number}", (index + 1).toString());
        cell5.innerHTML = option_settings_role_image.replace("{row_number}", (index + 1).toString());
        cell6.innerHTML = '<td><button class="button-action-table" id="btn_update_roleid_' + (index + 1).toString() + '" onclick="update_roleconfig_table(' + (index + 1).toString() + ')"><i class="fa fa-fw fa-edit"></i></button><button class="button-action-table" id="btn_delete_roleid_' + (index + 1).toString() + '" onclick="delete_roleconfig_table(' + (index + 1).toString() + ')"><i class="fa fa-fw fa-trash-o"></i></button></td>';
    
    }
    refreshTableNumber("tableRoleConfig");
    for (let index = 0; index < role.length; index++) {
        document.getElementById("settings_phase_type_" + (index + 1).toString()).value = role[index]["id_phase_type"];
        document.getElementById("settings_role_image_" + (index + 1).toString()).value = role[index]["role_image"];
        MsDropdown.make('#settings_role_image_' + (index + 1).toString());
    }
}
function data_phase_list(result) {
    option_phaselist_html = '<select id="settings_phase_type_{row_number}" style="border: none;width: 150px;background-color: transparent;">';
    for (let index = 0; index < result.length; index++) {
        const id = result[index]['id_phase'];
        const element = result[index]['phase_name'];
        option_phaselist_html += '<option value="' + id + '">' + element + '</option>';
    }
    option_phaselist_html += '</select>';
}

function update_roleconfig_table(row_id) {
    document.getElementById("btn_update_roleid_" + row_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_update_roleid_" + row_id).disabled = true;
    var element_role_id = document.getElementById("role_id_" + (row_id).toString());
    var role_id = element_role_id.getAttribute("data-id");
    var settings_role_name = document.getElementById("role_name_" + (row_id).toString()).innerText;
    var settings_role_prompt = document.getElementById("role_description_" + (row_id).toString()).value;
    var settings_phase_type = document.getElementById("settings_phase_type_" + (row_id).toString()).value;
    var settings_role_image = document.getElementById("settings_role_image_" + (row_id).toString()).value;
    if (settings_role_name.length === 0 || settings_role_prompt.length === 0) {
        document.getElementById("btn_update_roleid_" + row_id).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
        document.getElementById("btn_update_roleid_" + row_id).disabled = false;
        return;
    }
    var data = JSON.stringify({
        role_id: role_id,
        settings_role_name: settings_role_name, 
        settings_role_prompt: settings_role_prompt, 
        settings_phase_type: settings_phase_type, 
        settings_role_image: settings_role_image, 
    });
    $.ajax({
        url: '/settings/update_roleconfiguration',
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
                refresh_roleconfig_table();
            }
            //document.getElementById("btn_update_roleid_" + row_id).innerHTML = '<i class="fa fa-fw fa-edit"></i>';
            //document.getElementById("btn_update_roleid_" + row_id).disabled = false;
        },
        error: (error) => {
            console.log(error);
        }
    });
}

async function delete_roleconfig_table(row_id) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatbot_delete_item });
    if (!confirmacion) {
        return;
    }
    var element_role_id = document.getElementById("role_id_" + (row_id).toString());
    var role_id = element_role_id.getAttribute("data-id");
    var data = JSON.stringify({
        role_id: role_id
    });
    document.getElementById("btn_delete_roleid_" + row_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_delete_roleid_" + row_id).disabled = true;
    $.ajax({
        url: '/settings/delete_roleconfiguration',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            var data = result;
            console.log('Success:', data);
            data = data.result;

            if (data.length > 0) {
                refresh_roleconfig_table();
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}


async function refreshLastDataByDate() {
    const button = document.getElementById("button_refresh_last_data_by_date");
    button.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    button.disabled = true;
    try {
        const response = await fetch('/settings/RefreshLastDataUpdated', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        const reader = response.body.getReader();
        // Create a new TextDecoder to decode the streamed response text
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks = decoder.decode(value);
            document.getElementById("response").innerHTML += chunks + "\n";
            let chatWindow = document.getElementById("response");
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        button.innerHTML = window.chatbot_save_button;
        button.disabled = false;
    }
}




