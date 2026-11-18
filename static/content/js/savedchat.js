// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {

    //document.getElementById("sidebar_chat_section").classList.add("active");
    //load_conversation("", 0);
    //load_dates();
    //load_users();

    var user_name = document.getElementById("user_name");
    if (user_name) {
        user_name.addEventListener('change', function (event) {
            if (user_name.value != "-") {
                load_conversation("", 0);
                load_dates()
            }
        });
    }

    var type_chat = document.getElementById("type_chat");
    type_chat.addEventListener('change', function (event) {
        if (document.getElementById("user_name").value != "-") {
            show_details(type_chat.value);
            load_conversation("", 0);
            load_dates();
        }
    });

    var element_show_details = document.getElementById("show_details");
    if (element_show_details) {
        element_show_details.addEventListener('change', function (event) {

            var show_detail = document.getElementById("show_details").checked;

            if (show_detail == true) {
                $('.long_answer').each(function (i, obj) {
                    obj.style.display = "block";
                });
                $('.short_answer').each(function (i, obj) {
                    obj.style.display = "none";
                });
            }
            if (show_detail == false) {
                $('.long_answer').each(function (i, obj) {
                    obj.style.display = "none";
                });
                $('.short_answer').each(function (i, obj) {
                    obj.style.display = "block";
                });
            }

        });
    }

    load_users();

})

function show_details(type_chat) {
    if (type_chat == 'Sql' || type_chat == 'Pbi') {
        document.getElementById("section_navbar_showdetails").style.display = "block";
    }
    else {
        document.getElementById("section_navbar_showdetails").style.display = "none";
    }
}

function load_conversation(date, time_zone) {
    var data = JSON.stringify({
        type_chat: document.getElementById("type_chat").value,
        created_at: date,
        time_zone: time_zone
    });
    document.getElementById("messages").innerHTML = "";
    $.ajax({
        url: '/savedchat/LoadConversation',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            var data = result;
            console.log('Success:', data);
            print_success_result(data);
        },
        error: (error) => {
            print_error_result(error);
        }
    });

}

function load_dates() {
    var data = JSON.stringify({
        type_chat: document.getElementById("type_chat").value 
    });
    document.getElementById("thought").innerHTML = "";
    $.ajax({
        url: '/savedchat/LoadDates',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            var data = result;
            console.log('Success:', data);
            print_success_result_dates(data);
        },
        error: (error) => {
            print_error_result(error);
        }
    });

}

function load_users() {
    $.ajax({
        url: '/savedchat/LoadUsers',
        contentType: 'application/json',
        method: 'GET',
        success: (result) => {
            var data = result;
            console.log('Success:', data);

            if (data.code_error) {
                showAlert({
                    msg: data.code_error, 
                    type: "error"
                });
                return;
            }
            if (data.error) {
                showAlert({
                    msg: data.error, 
                    type: "error"
                });
                return;
            }
            data = data.result
            if (data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    $('#user_name').find('option').end().append('<option value="' + data[i]["id"] + '">' + data[i]["user_name"] + '</option>').val(data[i]["id"]);
                }
            }
            
        },
        error: (error) => {
            print_error_result(error);
        }
    });

}

async function print_success_result(data) {
    /*
    var date_now = new Date();
    var full_date = [date_now.getFullYear(), ("0" + (date_now.getMonth() + 1)).slice(-2), ("0" + date_now.getDate()).slice(-2)].join('-') + ' ' +
        [("0" + date_now.getHours()).slice(-2), ("0" + date_now.getMinutes()).slice(-2), ("0" + date_now.getSeconds()).slice(-2)].join(':');
    //var short_time = [("0" + date_now.getHours()).slice(-2), ("0" + date_now.getMinutes()).slice(-2)].join(':');
    var short_time = formatAMPM(date_now);
    msg_html = '<div style="align-self: flex-end;max-width: 75%;margin-bottom: 5px;">' 
    msg_html += '<div class="chat-question">'
    msg_html += '<span>'
    msg_html += message 
    msg_html += '</span>'
    msg_html += '</div>'
    msg_html += '<span class="text-sm chat-question-date" title="' + full_date + '">' + short_time + '</span>'
    msg_html += '</div>'
    */
    if (data.code_error) {
        showAlert({
            msg: data.code_error, 
            type: "error"
        });
        return;
    }
    if (data.error) {
        showAlert({
            msg: data.error, 
            type: "error"
        });
        return;
    }
    data = data.result
    if (data.length == 0) {
        return;
    }

    var date_now = new Date(data[0]["created_at"]);
    var full_date = [date_now.getFullYear(), ("0" + (date_now.getMonth() + 1)).slice(-2), ("0" + date_now.getDate()).slice(-2)].join('-') + ' ' +
        [("0" + date_now.getHours()).slice(-2), ("0" + date_now.getMinutes()).slice(-2), ("0" + date_now.getSeconds()).slice(-2)].join(':');
    document.getElementById("messages").innerHTML += '<div class="divider-text">' + full_date + '</div>';
    for (var i = 0; i < data.length; i++) {
        if (data[i]["type_conversation"] == "Question") {
            var date_now = new Date(data[i]["created_at"]);
            var full_date = [date_now.getFullYear(), ("0" + (date_now.getMonth() + 1)).slice(-2), ("0" + date_now.getDate()).slice(-2)].join('-') + ' ' +
                [("0" + date_now.getHours()).slice(-2), ("0" + date_now.getMinutes()).slice(-2), ("0" + date_now.getSeconds()).slice(-2)].join(':');
            var short_time = formatAMPM(date_now);

            msg_html = '<div style="align-self: flex-end;max-width: 75%;margin-bottom: 5px;">'
            msg_html += '<div class="chat-question">'
            msg_html += '<span style="white-space: break-spaces;">'
            msg_html += data[i]["conversation"]
            msg_html += '</span>'
            msg_html += '</div>'
            msg_html += '<span class="text-sm chat-question-date" title="' + full_date + '">' + short_time + '</span>'
            msg_html += '</div>'

            document.getElementById("messages").innerHTML += msg_html;
            let chatWindow = document.getElementById("messages-container");
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
        if (data[i]["type_conversation"] == "Answer") {
            var date_now = new Date(data[i]["created_at"]);
            var full_date = [date_now.getFullYear(), ("0" + (date_now.getMonth() + 1)).slice(-2), ("0" + date_now.getDate()).slice(-2)].join('-') + ' ' +
                [("0" + date_now.getHours()).slice(-2), ("0" + date_now.getMinutes()).slice(-2), ("0" + date_now.getSeconds()).slice(-2)].join(':');
            var short_time = formatAMPM(date_now);

            msg_html = '<div style="display: flex; align-items: flex-end; margin-bottom: 5px; ">'
            msg_html += '<img src="../static/dist/img/chatGPT.png" alt="bot" style="width: 25px;">'
            msg_html += '<div style="max-width: 75%;">'
            msg_html += '<div class="chat-bot">'

            var show_details = document.getElementById("show_details").checked;

            var answer = data[i]["conversation"];
            answer = transform_table(answer);

            if (data[i]["conversation_detail"] != "") {

                var answer_detail = data[i]["conversation_detail"];
                answer_detail = transform_table(answer_detail);

                if (show_details) {
                    msg_html += '<div class="short_answer" style="white-space: break-spaces;display: none;">'
                    msg_html += answer
                    msg_html += '</div>'
                    msg_html += '<div class="long_answer" style="white-space: break-spaces;">'
                    msg_html += answer_detail
                    msg_html += '</div>'
                } else {
                    msg_html += '<div class="short_answer" style="white-space: break-spaces;">'
                    msg_html += answer
                    msg_html += '</div>'
                    msg_html += '<div class="long_answer" style="white-space: break-spaces;display: none;">'
                    msg_html += answer_detail
                    msg_html += '</div>'
                }

            } else {
                msg_html += '<div class="short_answer" style="white-space: break-spaces;">'
                msg_html += answer
                msg_html += '</div>'
            }

            msg_html += '</div>'
            msg_html += '<div style="max-width: 75%;padding-top: 0.5rem;margin-left: 1rem;">'
            msg_html += '<span class="text-sm chat-bot-date" title="' + full_date + '">' + short_time + '</span>'
            msg_html += '</div>'
            msg_html += '</div>'
            msg_html += '</div>'

            document.getElementById("messages").innerHTML += msg_html;
            let chatWindow = document.getElementById("messages-container");
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
        await sleep(100);
    }
    var date_now = new Date(data[data.length - 1]["created_at"]);
    var full_date = [date_now.getFullYear(), ("0" + (date_now.getMonth() + 1)).slice(-2), ("0" + date_now.getDate()).slice(-2)].join('-') + ' ' +
        [("0" + date_now.getHours()).slice(-2), ("0" + date_now.getMinutes()).slice(-2), ("0" + date_now.getSeconds()).slice(-2)].join(':');
    document.getElementById("messages").innerHTML += '<div class="divider-text">' + full_date + '</div>';
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;

}

async function print_success_result_dates(data) {
    
    if (data.code_error) {
        console.log(data.code_error);
        showAlert({
            msg: data.code_error, 
            type: "error"
        });
        return;
    }
    if (data.error) {
        console.log(data.error);
        showAlert({
            msg: data.error, 
            type: "error"
        });
        return;
    }
    data = data.result
    if (data.length == 0) {
        return;
    }
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var getlocale = getLang();
    list_date = []
    for (var i = 0; i < data.length; i++) {
        item = {}
        let date = new Date(data[i]["created_at"]);
        let year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
        let month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(date);
        let day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
        item["created_at"] = `${year}-${month}-${day}`;
        item["locale_date"] = new Date(data[i]["created_at"]).toLocaleDateString();
        item["long_date"] = new Date(data[i]["created_at"]).toLocaleDateString(getlocale, options);
        //item["locale_timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        item["locale_timezone"] = -(new Date().getTimezoneOffset());
        list_date.push(item);
    }
    data = Array.from(new Set(list_date.map(JSON.stringify))).map(JSON.parse); 

    for (var i = 0; i < data.length; i++) {
        //thought
        though_html = '<div class="block-thought">'
        though_html += '<div class="thought-answer">'
        though_html += '<span id="date_selected_' + ((i + 1).toString()) + '" class="span-answer-text" title="Short Date: ' + (data[i]["locale_date"]) + '\nLong Date: ' + (data[i]["long_date"]) + '" data-value="' + (data[i]["created_at"]) + '" data-timezone="' + (data[i]["locale_timezone"]) + '" onclick="date_selected(' + ((i + 1).toString()) + ')">' + (data[i]["long_date"]) + '</span>'
        though_html += '</div>'
        though_html += '</div>'

        document.getElementById("thought").innerHTML += though_html;
        let thoughtWindow = document.getElementById("thought");
        thoughtWindow.scrollTop = thoughtWindow.scrollHeight;

        await sleep(100);
    }
    
}

function date_selected(id) {
    var date_value = document.getElementById("date_selected_" + id.toString()).getAttribute("data-value");
    var timezone_value = document.getElementById("date_selected_" + id.toString()).getAttribute("data-timezone");

    load_conversation(date_value, timezone_value)

}



