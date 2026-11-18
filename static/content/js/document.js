
var documents = [];
var file_extension = "";

window.addEventListener('load', function () {
    var dropzone = document.getElementById("dropzone");
    //update_inputs();
    //get_list_namespaces();
    dropzone.ondrop = function (e) {
        e.preventDefault();
        this.className = "dropzone";
        setname(e.dataTransfer.files);
        upload(e.dataTransfer.files);
    };

    dropzone.ondragover = function () {
        this.className = "dropzone dragover";
        return false;
    };

    dropzone.ondragleave = function () {
        this.className = "dropzone";
        return false;
    };

    function setname(files) {
        if (files.lenght > 1) {
            return;
        }
        const result = getFileNameAndExtension(files[0].name);
        document.getElementById("dropzone").innerHTML = '<span id="dropzone-text">' + (files[0].name) + '</span>';
        document.getElementById("file_name").value = (result.name).trim();
        file_extension = result.extension;
    }
    function upload(files) {
        if (files.lenght > 1) {
            return;
        }
        documents[0] = files[0];
    }

    const dropZoneElement = document.getElementById("dropzone");
    dropZoneElement.addEventListener("click", function (e) {
        document.getElementById("FilesUpload").click();
    });

    const FilesUpload = document.getElementById('FilesUpload');
    FilesUpload.addEventListener('change', function (e) {
        if (e.target.files[0]) {
            const result = getFileNameAndExtension(e.target.files[0].name);
            document.getElementById('dropzone').innerHTML = '<span id="dropzone-text">' + (e.target.files[0].name) + '</span>';
            document.getElementById("file_name").value = (result.name).trim();
            file_extension = result.extension;
            documents[0] = e.target.files[0];
            const file = e.target.files[0];

            document.getElementById("block_excel_sheets").style.display = "none";
            if (result.extension == "pdf") {
                document.getElementById("blob_path").value = "ChatGPT/Files/PDF";
            }
            else if (result.extension == "xls" || result.extension == "xlsx") {
                document.getElementById("block_excel_sheets").style.display = "block";
                if (file) {
                    const reader = new FileReader();

                    reader.onload = function (e) {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });

                        // Get the sheet names
                        const sheetNames = workbook.SheetNames;

                        // Print the sheet names
                        //console.log('Sheet Names:', sheetNames);
                        $('#excel_sheets').find('option').remove().end().append('<option value="-">Select</option>');
                        for (var i = 0; i < sheetNames.length; i++) {
                            $('#excel_sheets').append('<option value="' + sheetNames[i] + '">' + sheetNames[i] + '</option>');
                        }
                    };

                    reader.readAsArrayBuffer(file);
                }
                document.getElementById("blob_path").value = "ChatGPT/Files/Excel";
            }
            else if (result.extension == "doc" || result.extension == "docx") {
                document.getElementById("blob_path").value = "ChatGPT/Files/Word";
            }
            else if (result.extension == "csv") {
                document.getElementById("blob_path").value = "ChatGPT/Files/CSV";
            }
            else if (result.extension == "ppt" || result.extension == "pptx") {
                document.getElementById("blob_path").value = "ChatGPT/Files/PowerPoint";
            }

        }
    });


    const type_uploaded_file = document.getElementById('type_uploaded_file');
    type_uploaded_file.addEventListener('change', function (e) {
        if (type_uploaded_file.value == "files") {
            document.getElementById("block_url").style.display = "none";
            document.getElementById("dropzone").style.display = "flex";
            document.getElementById("block_excel_sheets").style.display = "none";
            document.getElementById("input_url_path").value = "";
            document.getElementById("file_name").value = "";
        }

        if (type_uploaded_file.value == "url") {
            document.getElementById("dropzone").style.display = "none";
            document.getElementById("block_url").style.display = "block";
            document.getElementById("block_excel_sheets").style.display = "none";
            document.getElementById("input_url_path").value = "";
            document.getElementById("blob_path").value = "ChatGPT/Files/URL";
            document.getElementById("file_name").value = "UrlContent_" + getFormattedDateTime();
        }
    });
    document.getElementById("btn_upload_document").addEventListener('click', submitBlobFile);
    document.getElementById("btn_load_container").addEventListener('click', GetListContainers);
    GetListContainers();
    get_list_namespaces();
})

function update_inputs() {
    var selected_option = document.getElementById("upload_options").value;

    if (selected_option === "upload_blob_pinecone") {

        document.getElementById("dropzone").style.display = "block";
        document.getElementById("block_blob_container").style.display = "block";
        document.getElementById("block_blob_path").style.display = "block";

    } else if (selected_option === "upload_pinecone") {

        document.getElementById("dropzone").style.display = "none";
        document.getElementById("block_blob_container").style.display = "block";
        document.getElementById("block_blob_path").style.display = "block";

    } else if (selected_option === "upload_blob") {

        document.getElementById("dropzone").style.display = "block";
        document.getElementById("block_blob_container").style.display = "block";
        document.getElementById("block_blob_path").style.display = "block";

    }

}

function submitBlobFile(event) {
    event.preventDefault();

    document.getElementById("btn_upload_document").innerHTML = window.documents_uploading_file + '&nbsp;&nbsp;<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_upload_document").disabled = true;

    var excel_sheets = document.getElementById("excel_sheets").value;
    var input_url_path = document.getElementById("input_url_path").value;
    var type_uploaded_file = document.getElementById("type_uploaded_file").value;
    var file_document = new File([""], "filename");
    var result = {name: "", extension: ""};
    var file_name = document.getElementById("file_name").value + "." + file_extension;
    if (type_uploaded_file == "files") {
        result = getFileNameAndExtension(file_name);
    } else {
        result = {name: document.getElementById("file_name").value, extension: "txt"};
    }

    var new_file_name = result.name;
    var new_extension = result.extension;
    var file_unique_name = new_file_name + "_" + uuidv4hex();
    var json_metadata = getAllMetadata();
    
    var data = new FormData();
    data.append('blob_container', document.getElementById("blob_container").value);
    data.append('blob_path', document.getElementById("blob_path").value);
    data.append('file_name', new_file_name);
    data.append('file_unique_name', file_unique_name);
    data.append('file_extension', new_extension);
    data.append('excel_sheet', excel_sheets);
    data.append('input_url_path', input_url_path);
    data.append('type_uploaded_file', type_uploaded_file);
    data.append('json_metadata', json_metadata);

    if (type_uploaded_file == "files") {
        if (documents.length == 0) {
            showAlert({
                msg: "You must to open a file.", 
                type: "information"
            });
            return;
        } else {
            if (result.extension == "xlsx") {
                if (excel_sheets == "-") {
                    showAlert({
                        msg: "You must to select a sheet.", 
                        type: "information"
                    });
                    return;
                }
            }
        }
        file_document = documents[0]
    } else if (type_uploaded_file == "url") {
        if (input_url_path == "") {
            showAlert({
                msg: "You must to insert a url.", 
                type: "information"
            });
            return;
        }
    }
    
    data.append('file', file_document);
    document.getElementById("response").innerHTML = window.documents_uploading_file + ": <b>" + document.getElementById("file_name").value + "</b>...";

    $.ajax({
        url: '/documents/UploadDocumentToBlob',
        data: data,
        method: 'POST',
        processData: false,
        contentType: false,
        success: (result) => {
            if (result.error) {
                document.getElementById("btn_upload_document").innerHTML = window.documents_upload_file;
                document.getElementById("btn_upload_document").disabled = false;
                showAlert({
                    msg: result.error, 
                    type: "error"
                });
                return;
            }

            if (typeof result === 'undefined') {
                document.getElementById("btn_upload_document").innerHTML = window.documents_upload_file;
                document.getElementById("btn_upload_document").disabled = false;
                showAlert({
                    msg: "Error: undefined", 
                    type: "error"
                });
                return;
            }

            var result = result.result;
            if (result.length > 0) {

                document.getElementById("response").innerHTML += window.documents_uploaded_successful + ' ' + result;

                //get_vector_count(result);

                if (new_extension != "xlsx" && new_extension != "csv") {
                    upload_pdf_to_pinecone(new_file_name, file_unique_name, new_extension, type_uploaded_file, 1);
                } else {
                    document.getElementById("btn_upload_document").innerHTML = window.documents_upload_file;
                    document.getElementById("btn_upload_document").disabled = false;
                    get_list_namespaces();
                }

            }

        },
        error: (error) => {
            document.getElementById("btn_upload_document").innerHTML = window.documents_upload_file;
            document.getElementById("btn_upload_document").disabled = false;
            showAlert({
                msg: error.statusText, 
                type: "error"
            });
            console.log(error);
        }
    })
}

async function upload_pdf_to_pinecone(file_name, file_unique_name, new_extension, type_uploaded_file, is_all) {

    var json_metadata = getAllMetadata();

    var data = JSON.stringify({
        blob_container: document.getElementById("blob_container").value,
        blob_path: document.getElementById("blob_path").value,
        json_metadata: json_metadata,
        file_name: file_name,
        file_unique_name: file_unique_name,
        file_extension: new_extension, 
        type_uploaded_file: type_uploaded_file, 
        input_url_path: document.getElementById("input_url_path").value,
        is_all: is_all,
        openai_object: OpenAIObject()
    });

    document.getElementById("response").innerHTML += '\n' + window.documents_uploading_to_pinecone;

    const response = await fetch("/documents/UploadPdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data
    });

    // Create a new TextDecoder to decode the streamed response text
    const decoder = new TextDecoder();

    // Set up a new ReadableStream to read the response body
    const reader = response.body.getReader();
    let chunks = "";

    // Read the response stream as chunks and append them to the chat log
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks = decoder.decode(value);
        if (chunks.startsWith("Error:")) {
            console.error(chunks);
            showAlert({
                msg: chunks, 
                type: "error"
            });
            document.getElementById("btn_upload_document").innerHTML = window.documents_upload_file;
            document.getElementById("btn_upload_document").disabled = false;
            sendNotification(window.documents_upload_file);
            return;
        }
        document.getElementById("response").innerHTML += "\n" + chunks;
    }
    document.getElementById("btn_upload_document").innerHTML = window.documents_upload_file;
    document.getElementById("btn_upload_document").disabled = false;
    get_list_namespaces();
    sendNotification(window.chatbot_notification_document_uploaded);
}

function get_list_namespaces() {
    document.getElementById("block_files_pdf").classList.add("text-line");
    document.getElementById("block_files_pdf").innerHTML = "";

    $.ajax({
        url: '/documents/GetListNamespaces',
        dataType: 'json',
        method: 'POST',
        processData: false,
        contentType: false,
        success: (result) => {
            if (result.error) {
                showAlert({
                    msg: result.error, 
                    type: "error"
                });
                return;
            }
            if (typeof result === 'undefined') {
                showAlert({
                    msg: "Error: undefined", 
                    type: "error"
                });
                return;
            }
            var result = result.result;
            if (result.length > 0) {
                var data_result = ''
                var count = 0;
                for (var i = 0; i < result.length; i++) {
                    if (result[i] != '') {
                        count += 1;
                        data_result += '<div id="namespace-' + (count).toString() + '" class="section-list-namespace"><span class="list-namespace">' + (count).toString() + '. ' + result[i]['extension'] + ' | ' + result[i]['document_name'] + '</span><div id="remove-namespace-' + (count).toString() + '" class="list-namespace-remove" data-confirm="0" data-namespace="' + result[i]['document_name'] + '" data-namespaceunique="' + result[i]['document_unique'] + '">' + window.chatbot_delete + '</div></div>';
                    }
                }
                document.getElementById("block_files_pdf").innerHTML = data_result;
                document.getElementById("block_files_pdf").classList.remove("text-line");
                document.getElementById("block_files_pdf").style.width = "100%";

                var buttons = document.querySelectorAll('.list-namespace-remove');
                for (var i = 0; i < buttons.length; i++) {
                    buttons[i].addEventListener("click", click_remove_namespace);
                    buttons[i].addEventListener("mouseout", mouse_out_namespace);
                }

            }

        },
        error: (error) => {
            showAlert({
                msg: error.statusText, 
                type: "error"
            });
            console.log(error);
        }
    })
}

function click_remove_namespace(event) {
    var element_id = event.srcElement.id;
    var data_element = document.getElementById(element_id).getAttribute("data-namespace");
    var data_elementunique = document.getElementById(element_id).getAttribute("data-namespaceunique");
    var current_state = document.getElementById(element_id).getAttribute("data-confirm");
    if (current_state == "0") {
        console.log(event.srcElement.id);
        document.getElementById(element_id).setAttribute("data-confirm", "1");
        document.getElementById(element_id).innerHTML = window.chatbot_really_delete;
    }
    if (current_state == "1") {
        console.log(event.srcElement.id);

        var keyvault_name = localStorage.getItem("modal_keyvault_name");
        var data = new FormData();
        data.append('namespace_name', data_element);
        data.append('namespaceunique_name', data_elementunique);

        document.getElementById(element_id).removeEventListener('mouseout', mouse_out_namespace, false);
        document.getElementById(element_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
        document.getElementById(element_id).style.display = "block";
        document.getElementById(element_id).style.pointerEvents = "none";

        $.ajax({
            url: '/documents/DeleteNamespace',
            data: data,
            dataType: 'json',
            method: 'POST',
            processData: false,
            contentType: false,
            success: (result) => {
                if (result.error) {
                    showAlert({
                        msg: result.error, 
                        type: "error"
                    });
                    return;
                }

                if (typeof result === 'undefined') {
                    showAlert({
                        msg: "Error: undefined", 
                        type: "error"
                    });
                    return;
                }

                var result = result.result;
                if (result.length > 0) {

                    get_list_namespaces();

                }

            },
            error: (error) => {
                showAlert({
                    msg: error.statusText, 
                    type: "error"
                });
                console.log(error);
            }
        })


    }

}
function mouse_out_namespace(event) {
    var element_id = event.srcElement.id;
    document.getElementById(element_id).setAttribute("data-confirm", "0");
    document.getElementById(element_id).innerHTML = window.chatbot_delete;
}

function GetListContainers() {

    document.getElementById("btn_load_container").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_load_container").disabled = true;

    $.ajax({
        url: '/documents/GetListContainers',
        dataType: 'json',
        method: 'POST',
        processData: false,
        contentType: false,
        success: (result) => {
            if (result.error) {
                document.getElementById("btn_load_container").innerHTML = window.chatbot_refresh_button;
                document.getElementById("btn_load_container").disabled = false;
                showAlert({
                    msg: result.error, 
                    type: "error"
                });
                return;
            }

            if (typeof result === 'undefined') {
                document.getElementById("btn_load_container").innerHTML = window.chatbot_refresh_button;
                document.getElementById("btn_load_container").disabled = false;
                showAlert({
                    msg: "Error: undefined", 
                    type: "error"
                });
                return;
            }

            var result = result.result;
            if (result.length > 0) {

                $('#blob_container').find('option').remove().end().append('<option value="-">' + window.documents_blob_container_select + '</option>');

                for (var i = 0; i < result.length; i++) {
                    $('#blob_container').append('<option value="' + result[i] + '">' + result[i] + '</option>');
                }

                if ($('#blob_container').find("option:contains('raw')").length) {
                    document.getElementById("blob_container").value = "raw";
                }

            }
            document.getElementById("btn_load_container").innerHTML = window.chatbot_refresh_button;
            document.getElementById("btn_load_container").disabled = false;

        },
        error: (error) => {
            document.getElementById("btn_load_container").innerHTML = window.chatbot_refresh_button;
            document.getElementById("btn_load_container").disabled = false;
            showAlert({
                msg: error.statusText, 
                type: "error"
            });
            console.log(error);
        }
    })
}


function addRowMetadata() {
    var table = document.getElementById("metadataTable").getElementsByTagName('tbody')[0];
    var newRow = table.insertRow(table.rows.length);
    var cell1 = newRow.insertCell(0);
    var cell2 = newRow.insertCell(1);
    var cell3 = newRow.insertCell(2);

    cell1.innerHTML = '<input class="document-table-column-input-row" type="text" placeholder="Key">';
    cell2.innerHTML = '<input class="document-table-column-input-row" type="text" placeholder="Value">';
    cell3.innerHTML = '<button class="button-action-table" onclick="deleteRowMetadata(this)"><i class="fa fa-fw fa-trash-o"></i></button>';
}
function deleteRowMetadata(button) {
    var row = button.parentNode.parentNode;
    row.parentNode.removeChild(row);
}
function getAllMetadata() {
    var table = document.getElementById("metadataTable");
    var metadataArray = [];

    for (var i = 1; i < table.rows.length; i++) {
        var key = table.rows[i].cells[0].querySelector('input').value;
        var value = table.rows[i].cells[1].querySelector('input').value;

        if (key && value) {
            metadataArray.push({ key: key, value: value });
        }
    }

    var jsonString = '{';

    for (var i = 0; i < metadataArray.length; i++) {
        jsonString += '"' + metadataArray[i].key + '":"' + metadataArray[i].value + '"';

        if (i < metadataArray.length - 1) {
            jsonString += ',';
        }
    }

    jsonString += '}';

    //console.log(metadataArray);
    return jsonString;
    // Do something with metadataArray, e.g., send to server or process further
}

