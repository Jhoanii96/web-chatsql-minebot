var stop_chat = false;

//#region Print Message for ChatGpt and ChatPdf and ChatFlow
async function print_content_result_stream(response, message, controller) {
    // Create a new TextDecoder to decode the streamed response text
    const decoder = new TextDecoder();

    // Set up a new ReadableStream to read the response body
    const reader = response.body.getReader();
    let chunks = "";
    evaluate_stop_chat("start");
    var stringid = generate_id(15);
    var printed_message_html = false;
    stop_chat = false;
    var messages_assistant = "";

    // Read the response stream as chunks and append them to the chat log
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (stop_chat == true) {
            controller.abort();
            break;
        }

        chunks = decoder.decode(value);
        if (chunks.startsWith("Error:")) {
            showAlert({
                msg: chunks, 
                type: "error"
            });
            //document.getElementById("before_load").style.display = "none";
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            return;
        }
        if (printed_message_html == false) {
            const dateTime = getCurrentDateTime();
            var msg_html = '<div style="display: flex; align-items: flex-end; margin-bottom: 5px; ">'
            msg_html += '<img src="../static/dist/img/chatGPT.png" alt="bot" style="width: 25px;border-radius: 5px;">'
            msg_html += '<div style="max-width: 75%;">'
            msg_html += '<div id="chat-log-' + stringid + '" class="chat-bot">'
            msg_html += '</div>'
            msg_html += '<div style="max-width: 75%;padding-top: 0.5rem;margin-left: 1rem;">'
            msg_html += '<span class="text-sm chat-bot-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>'
            msg_html += '</div>'
            msg_html += '</div>'
            msg_html += '</div>'

            document.getElementById("messages").innerHTML += msg_html;
            printed_message_html = true;
        }

        const chatlog = document.querySelector("#chat-log-" + stringid);
        messages_assistant += chunks;
        messages_assistant = messages_assistant.replaceAll('`', '').replaceAll('markdown', '').replaceAll('plaintext', '');
        chatlog.innerHTML = (safeMarkdownRender(messages_assistant)).replace(/<table>/g, '<table class="chat-table-format">');

        let chatWindow = document.getElementById("messages-container");
        chatWindow.scrollTop = chatWindow.scrollHeight;

    }

    evaluate_stop_chat("stop");

    if (stop_chat == true) {
        document.getElementById("message-input").value = message;
        document.getElementById("message-input").focus();

        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        return "";
    } else {
        const element_thought = document.getElementById("thought");
        if (element_thought) {
            //thought
            var though_html = '<div class="block-thought">';
            though_html += '<div class="thought-question">';
            though_html += '<span class="span-question-text" title="' + message + '">' + message + '</span>';
            though_html += '<span class="span-question-time"></span>';
            though_html += '</div>';
            though_html += '<div class="thought-answer">';
            though_html += '<span class="span-answer-text" title="' + (messages_assistant).substring(0, 100) + '...">' + (messages_assistant).substring(0, 50) + '...</span>';
            though_html += '</div>';
            though_html += '</div>';
            element_thought.innerHTML += though_html;
            element_thought.scrollTop = element_thought.scrollHeight;
        }
        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        document.getElementById("message-input").focus();
        return messages_assistant;
    }

}
//#endregion

//#region Print Message for ChatSql and ChatPbi
function print_content_result(data, id_string = "") {
    const dateTime = getCurrentDateTime();
    const assistant_date = `
    <div class="text-sm chat-bot-date" title="${dateTime.full_date}">
        <span><b>MineBot GIG</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
    </div>
    `;
    document.getElementById("chat-assistant-date-" + id_string).innerHTML = assistant_date;
    var msg_html = '';
    
    const show_details = (document.getElementById("show_details").checked) ? '' : 'hide';
    let answer = window.chatbot_no_records_found;

    const sql_query_markdown = (safeMarkdownRender(data.sql_query_markdown)).replace(/<pre>/g, '<pre style="max-height: 150px;overflow: auto;">');
    const table_markdown = (safeMarkdownRender(data.table_markdown)).replace(/<table>/g, `<table id="table-${id_string}" class="chat-table-format">`);
    const usage_summary_markdown = (safeMarkdownRender(data.usage_summary_markdown)).replace(/<p>/g, '<p style="white-space: break-spaces;">');

    msg_html += `<div class="sql_query ${show_details}">`;
    msg_html += sql_query_markdown;
    msg_html += '</div>';
    msg_html += '<div class="data_table" style="max-height: 450px;overflow: auto;">';
    msg_html += table_markdown;
    msg_html += '</div>';
    msg_html += `<div class="usage_summary ${show_details}">`;
    msg_html += usage_summary_markdown;
    msg_html += '</div>';

    const chatsqlGraphPermission = window.chatsql_graph_permission === "true";
    if (chatsqlGraphPermission) {
        msg_html += `
            <div style="padding-top: 5px;">
                <a href="#" data-toggle="modal" data-target="#chatsql_chatgraph_modal" data-id="${id_string}">${window.chatsql_chart_modal_title}</a>
                | 
                <a href="#" onclick="copy_table('${id_string}')">Copy</a>
                | 
                <a href="#" onclick="export_table('${id_string}')">Export</a>
            </div>
        `;
    }

    document.getElementById("chat-assistant-" + id_string).innerHTML = msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    enableTableSorting(document.getElementById(`table-${id_string}`));
}


function general_print_content_result(data, message) {
    const dateTime = getCurrentDateTime();
    var msg_html = '<div style="display: flex; align-items: flex-end; margin-bottom: 5px; ">';
    msg_html += '<img src="../static/dist/img/chatGPT.png" alt="bot" style="width: 25px;">';
    msg_html += '<div style="max-width: 95%;">';
    msg_html += '<div class="chat-bot">';
    const show_details = document.getElementById("show_details").checked;
    const answer = (safeMarkdownRender(data.answer)).replace(/<table>/g, '<table class="chat-table-format">');
    if (data.answer_detail) {
        const answer_detail = (safeMarkdownRender(data.answer_detail)).replace(/<table>/g, '<table class="chat-table-format">');
        if (show_details) {
            msg_html += '<div class="short_answer" style="display: none;">';
            msg_html += answer;
            msg_html += '</div>';
            msg_html += '<div class="long_answer">';
            msg_html += answer_detail;
            msg_html += '</div>';
        } else {
            msg_html += '<div class="short_answer">';
            msg_html += answer;
            msg_html += '</div>';
            msg_html += '<div class="long_answer" style="display: none;">';
            msg_html += answer_detail;
            msg_html += '</div>';
        }

    } else {
        msg_html += '<div class="short_answer">';
        msg_html += answer;
        msg_html += '</div>';
    }
    msg_html += '</div>';
    msg_html += '<div style="max-width: 95%;padding-top: 0.5rem;margin-left: 1rem;">';
    msg_html += '<span class="text-sm chat-bot-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>';
    msg_html += '</div>';
    msg_html += '</div>';
    msg_html += '</div>';

    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const element_thought = document.getElementById("thought");
    if (element_thought) {
        //thought
        var though_html = '<div class="block-thought">';
        though_html += '<div class="thought-question">';
        though_html += '<span class="span-question-text" title="' + message + '">' + message + '</span>';
        though_html += '<span class="span-question-time"></span>';
        though_html += '</div>';
        though_html += '<div class="thought-answer">';
        though_html += '<span class="span-answer-text" title="' + (data.answer).substring(0, 100) + '...">' + (data.answer).substring(0, 50) + '...</span>';
        though_html += '</div>';
        though_html += '</div>';
        element_thought.innerHTML += though_html;
        element_thought.scrollTop = element_thought.scrollHeight;
    }
}
async function print_content_assistant_stream(response, message, controller) {
    // Create a new TextDecoder to decode the streamed response text
    const decoder = new TextDecoder();

    // Set up a new ReadableStream to read the response body
    const reader = response.body.getReader();
    let chunks = "";
    evaluate_stop_chat("start");
    var stringid = generate_id(15);
    var printed_message_html = false;
    stop_chat = false;
    var messages_assistant = "";

    // Read the response stream as chunks and append them to the chat log
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (stop_chat == true) {
            controller.abort();
            break;
        }

        chunks = decoder.decode(value);
        if (chunks.startsWith("Error:")) {
            showAlert({
                msg: chunks, 
                type: "error"
            });
            //document.getElementById("before_load").style.display = "none";
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            return;
        }
        if (printed_message_html == false) {
            const dateTime = getCurrentDateTime();
            //var msg_html = '<div style="display: flex; align-items: flex-end; margin-bottom: 5px; ">'
            //msg_html += '<img src="../static/dist/img/chatGPT.png" alt="bot" style="width: 25px;border-radius: 5px;">'
            //msg_html += '<div style="max-width: 75%;">'
            //msg_html += '<div id="chat-log-' + stringid + '" class="chat-bot">'
            //msg_html += '</div>'
            //msg_html += '<div style="max-width: 75%;padding-top: 0.5rem;margin-left: 1rem;">'
            //msg_html += '<span class="text-sm chat-bot-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>'
            //msg_html += '</div>'
            //msg_html += '</div>'
            //msg_html += '</div>'

            var msg_html = '<div class="block-chat-message">';
            msg_html += '<img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">';
            msg_html += '<div style="max-width: 95%;">';
            msg_html += '<div style="max-width: 95%;padding-top: 0.5rem;margin-left: 1rem;">';
            msg_html += '<div class="text-sm chat-bot-date" title="' + dateTime.full_date + '"><span><b>MineBot GIG</b>&nbsp;|&nbsp;' + dateTime.short_time + '</span></div>';
            msg_html += '</div>';
            msg_html += '<div id="chat-log-' + stringid + '" class="chat-bot">';
            msg_html += '</div>';

            document.getElementById("messages").innerHTML += msg_html;
            printed_message_html = true;
        }

        const chatlog = document.querySelector("#chat-log-" + stringid);
        messages_assistant += chunks;
        messages_assistant = messages_assistant.replaceAll('`', '').replaceAll('markdown', '').replaceAll('plaintext', '');
        chatlog.innerHTML = (safeMarkdownRender(messages_assistant)).replace(/<table>/g, '<table class="chat-table-format">');

        let chatWindow = document.getElementById("messages-container");
        chatWindow.scrollTop = chatWindow.scrollHeight;

    }

    evaluate_stop_chat("stop");

    if (stop_chat == true) {
        document.getElementById("message-input").value = message;
        document.getElementById("message-input").focus();

        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        return "";
    } else {
        const element_thought = document.getElementById("thought");
        if (element_thought) {
            //thought
            var though_html = '<div class="block-thought">';
            though_html += '<div class="thought-question">';
            though_html += '<span class="span-question-text" title="' + message + '">' + message + '</span>';
            though_html += '<span class="span-question-time"></span>';
            though_html += '</div>';
            though_html += '<div class="thought-answer">';
            though_html += '<span class="span-answer-text" title="' + (messages_assistant).substring(0, 100) + '...">' + (messages_assistant).substring(0, 50) + '...</span>';
            though_html += '</div>';
            though_html += '</div>';
            element_thought.innerHTML += though_html;
            element_thought.scrollTop = element_thought.scrollHeight;
        }
        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        document.getElementById("message-input").focus();
        return messages_assistant;
    }

}
async function print_sqlphase_assistant_stream(response, message, controller) {
    // Create a new TextDecoder to decode the streamed response text
    const decoder = new TextDecoder();

    // Set up a new ReadableStream to read the response body
    const reader = response.body.getReader();
    let chunks = "";
    evaluate_stop_chat("start");
    const id_chat = generate_id(15);
    var printed_message_html = false;
    stop_chat = false;
    var messages_assistant = "";

    // Read the response stream as chunks and append them to the chat log
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (stop_chat == true) {
            controller.abort();
            break;
        }

        chunks = decoder.decode(value);
        if (chunks.startsWith("Error:")) {
            showAlert({
                msg: chunks, 
                type: "error"
            });
            //document.getElementById("before_load").style.display = "none";
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            document.getElementById("flow_clean_chat").classList.remove("disabled");
            evaluate_stop_chat("stop");
            break;
        }
        if (printed_message_html == false) {
            const dateTime = getCurrentDateTime();
            var msg_html = `
            <div class="block-chat-message">
                <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
                <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
                    <div style="padding-top: 0.5rem;margin-left: 1rem;">
                        <div class="text-sm chat-bot-date" title="${dateTime.full_date}">
                            <span><b>MineBot GIG</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
                        </div>
                    </div>
                    <div id="chat-assistant-${id_chat}" class="chat-bot" style="max-width: 100%;">
                    </div>
                </div>
            </div>
            `;

            document.getElementById("messages").innerHTML += msg_html;
            printed_message_html = true;
        }

        const chatlog = document.querySelector("#chat-assistant-" + id_chat);
        messages_assistant += chunks;
        const trimmedContent = messages_assistant.trim();
        const cleanedContent = trimmedContent.replace(/^```\s*|\s*```$/g, '');
        chatlog.innerHTML = (safeMarkdownRender(cleanedContent)).replace(/<table>/g, '<table class="chat-table-format">');

        let chatWindow = document.getElementById("messages-container");
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    evaluate_stop_chat("stop");

    if (stop_chat == true) {
        document.getElementById("message-input").value = message;
        document.getElementById("message-input").focus();

        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        return "";
    } else {
        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        document.getElementById("message-input").focus();
        return messages_assistant;
    }

}
//#endregion


//#region Print Message for ChatFlow
async function print_phases_result_stream(response, controller) {
    // Create a new TextDecoder to decode the streamed response text
    const decoder = new TextDecoder();
    // Set up a new ReadableStream to read the response body
    const reader = response.body.getReader();
    let chunks = "";
    var printed_user_html = false;
    var printed_assistant_html = false;
    var chat_type = "";
    var role_name = "";
    var role_image = "";
    var stringid = "";
    var uid_phase = "";
    var load_flag = false;
    var messages_assistant = "";
    var messages_user = "";
    stop_chat = false;
    // Read the response stream as chunks and append them to the chat log
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (stop_chat == true) {
            controller.abort();
            break;
        }
        chunks = decoder.decode(value);
        if (chunks.indexOf("[uid_phase]:") !== -1) {
            uid_phase = chunks.replace("[uid_phase]:", "");
            continue;
        }
        if (chunks.indexOf("[chat-assistant-foot]") !== -1 && uid_phase != "") {
            document.getElementById("block-chat-assistant-foot-" + uid_phase).style.display = "flex";
            continue;
        }
        if (chunks.indexOf("Error:") !== -1) {
            showAlert({
                msg: chunks, 
                type: "error"
            });
            //document.getElementById("before_load").style.display = "none";
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            stop_chat = true;
            break;
        }
        if (chunks.indexOf("[user]") !== -1 || chunks.indexOf("[assistant]") !== -1 || chunks.indexOf("[report generate]") !== -1) {
            chat_type = chunks.split("|")[0];
            if (chat_type.indexOf("[report generate]") !== -1) {
                chat_type = chat_type.split("|")[0];
            } else {
                role_name = chunks.split("|")[1];
                role_image = chunks.split("|")[2];
            }
        }
        if (chat_type == "[user]" && printed_user_html == false) {
            stringid = generate_id(32);
            var dateTime = getCurrentDateTime();
            var msg_html = '<div style="align-self: flex-end;max-width: 65%;margin-bottom: 5px;display: flex;flex-direction: column;">';
            msg_html += '<div class="block-user-right-info"><div class="user-right-info">';
            if (window.global_role_name == "Guess") {
                msg_html += '<span>' + role_name + ' - Question</span>';
            } else {
                msg_html += '<span>' + role_name + '</span>';
            }
            //msg_html += '&nbsp;';
            //msg_html += '<img src="static/' + role_image + '" alt="image" style="width: 30px;">';
            msg_html += '</div>';
            msg_html += '</div>';
            msg_html += '<div id="chat-user-' + stringid + '" class="chat-question" style="white-space: break-spaces;align-self: flex-end;">';
            msg_html += `<svg xml:space="preserve" viewBox="0 0 100 60" y="0" x="0" xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.1" style="width: 20px;">
            <g class="ldl-scale" style="transform-origin: 50% 50%; transform: rotate(0deg) scale(0.6, 0.6);">
            <g class="ldl-ani">
            <g class="ldl-layer">
            <g class="ldl-ani" style="transform-origin: 50px 50px; opacity: 1; animation: 1.33333s linear -1.33333s infinite normal forwards running blink-d5afa192-add8-4a9e-b714-a18786892ee4;">
            <circle fill="#d65a62" r="10" cy="50" cx="20" style="fill: rgb(255, 255, 255);"></circle></g></g><g class="ldl-layer">
            <g class="ldl-ani" style="transform-origin: 50px 50px; opacity: 1; animation: 1.33333s linear -1.11111s infinite normal forwards running blink-d5afa192-add8-4a9e-b714-a18786892ee4;"><circle fill="#ea7c60" r="10" cy="50" cx="50" style="fill: rgb(245, 253, 255);"></circle></g></g><g class="ldl-layer"><g class="ldl-ani" style="transform-origin: 50px 50px; opacity: 1; animation: 1.33333s linear -0.888889s infinite normal forwards running blink-d5afa192-add8-4a9e-b714-a18786892ee4;"><circle fill="#f0af6b" r="10" cy="50" cx="80" style="fill: rgb(231, 246, 255);"></circle></g></g><metadata xmlns:d="https://loading.io/stock/"><d:name>ellipse</d:name>
            <d:tags>dot,point,circle,waiting,typing,sending,message,ellipse,spinner</d:tags>
            <d:license>by</d:license>
            <d:slug>igf6j3</d:slug></metadata></g></g></svg>`;
            msg_html += '</div>'
            msg_html += '<span class="text-sm chat-question-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>'
            msg_html += '</div>'
            messages_user = "";
            document.getElementById("messages").innerHTML += msg_html;
            if (go_down_scroll == true) {
                let chatWindow = document.getElementById("messages-container");
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            printed_user_html = true;
            printed_assistant_html = false;
            load_flag = false;
        }
        if (chat_type == "[user]" && printed_user_html == true && chunks.indexOf("[user]") === -1) {
            const chatlog = document.querySelector("#chat-user-" + stringid);
            if (load_flag == false) {
                chatlog.innerHTML = "";
                load_flag = true;
            }
            if (chunks.startsWith("image[|]")) {
                //var image_evidence = hexToBase64((chunks.split("[|]")[1]).toString());
                //conversation_images.push(image_evidence);
                //var base64_image = decodeURIComponent(chunks.split("[|]")[1]);
                //console.log(base64_image);
                messages_user += '<br><img style="width: 350px;" src="' + chunks.split("[|]")[1] + '" alt="Image ' + generate_id(5) + '"><br>';
            } else {
                messages_user += chunks;
            }
            chatlog.innerHTML = transform_table(messages_user);
            if (go_down_scroll == true) {
                let chatWindow = document.getElementById("messages-container");
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }
        if (chat_type == "[assistant]" && printed_assistant_html == false) {
            stringid = generate_id(32);
            var dateTime = getCurrentDateTime();
            var msg_html = '<div style="display: flex;margin-bottom: 5px;flex-direction: column;max-width: 65%;">';
            msg_html += '<div class="block-user-left-info">';
            msg_html += '<div class="user-left-info">';
            if (window.global_role_name == "Guess") {
                msg_html += '<span>' + role_name + ' - Answer</span>';
            } else {
                msg_html += '<span>' + role_name + '</span>';
            }
            //msg_html += '&nbsp;';
            //msg_html += '<img src="static/' + role_image + '" alt="image" style="width: 30px;">';
            msg_html += '</div>';
            msg_html += '</div>';
            msg_html += '<div id="chat-assistant-' + stringid + '" class="chat-assistant-role" style="align-self: flex-start;">'
            msg_html += `<svg xml:space="preserve" viewBox="0 0 100 60" y="0" x="0" xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.1" style="width: 20px;">
            <g class="ldl-scale" style="transform-origin: 50% 50%; transform: rotate(0deg) scale(0.6, 0.6);">
            <g class="ldl-ani">
            <g class="ldl-layer">
            <g class="ldl-ani" style="transform-origin: 50px 50px; opacity: 1; animation: 1.33333s linear -1.33333s infinite normal forwards running blink-d5afa192-add8-4a9e-b714-a18786892ee4;">
            <circle fill="#d65a62" r="10" cy="50" cx="20" style="fill: rgb(0 0 0);"></circle></g></g><g class="ldl-layer">
            <g class="ldl-ani" style="transform-origin: 50px 50px; opacity: 1; animation: 1.33333s linear -1.11111s infinite normal forwards running blink-d5afa192-add8-4a9e-b714-a18786892ee4;"><circle fill="#ea7c60" r="10" cy="50" cx="50" style="fill: rgb(0 0 0);"></circle></g></g><g class="ldl-layer"><g class="ldl-ani" style="transform-origin: 50px 50px; opacity: 1; animation: 1.33333s linear -0.888889s infinite normal forwards running blink-d5afa192-add8-4a9e-b714-a18786892ee4;"><circle fill="#f0af6b" r="10" cy="50" cx="80" style="fill: rgb(0 0 0);"></circle></g></g><metadata xmlns:d="https://loading.io/stock/"><d:name>ellipse</d:name>
            <d:tags>dot,point,circle,waiting,typing,sending,message,ellipse,spinner</d:tags>
            <d:license>by</d:license>
            <d:slug>igf6j3</d:slug></metadata></g></g></svg>`;
            msg_html += '</div>';
            msg_html += '<div class="chat-assistant-role-foot">';
            msg_html += '<span class="text-sm chat-assistant-role-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>';
            msg_html += '<div id="block-chat-assistant-foot-' + uid_phase + '" class="chat-assistant-role-save" style="display: none;">'
            msg_html += '<input type="checkbox" id="chat-assistant-foot-input-' + uid_phase + '" style="margin: 0px 2px;" onchange="save_assistant_answer(\'' + uid_phase + '\')">'
            msg_html += '<label id="chat-assistant-foot-label-' + uid_phase + '" for="chat-assistant-foot-input-' + uid_phase + '" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save response</label>'
            msg_html += '</div>';
            msg_html += '</div>';
            msg_html += '</div>';
            document.getElementById("messages").innerHTML += msg_html;
            messages_assistant = "";
            if (go_down_scroll == true) {
                let chatWindow = document.getElementById("messages-container");
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            printed_user_html = false;
            printed_assistant_html = true;
            load_flag = false;
        }
        if (chat_type == "[assistant]" && printed_assistant_html == true && chunks.indexOf("[assistant]") === -1) {
            const chatlog = document.querySelector("#chat-assistant-" + stringid);
            if (load_flag == false) {
                chatlog.innerHTML = "";
                load_flag = true;
            }
            messages_assistant += chunks;
            //chatlog.innerHTML += chunks;
            //chatlog.innerHTML = transform_table(messages_assistant);
            //messages_assistant = md.render(messages_assistant);
            messages_assistant = messages_assistant.replaceAll('`', '').replaceAll('markdown', '').replaceAll('plaintext', '');
            chatlog.innerHTML = (safeMarkdownRender(messages_assistant)).replace(/<table>/g, '<table class="chat-table-format">');
            //.replace(/<p>/g, '<p style="margin-top: 0px;margin-right: 0px;margin-bottom: 0px;margin-left: 0px;">');
            //updateText("chat-assistant-" + stringid);
            if (go_down_scroll == true) {
                let chatWindow = document.getElementById("messages-container");
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }
        if (chat_type == "[report generate]") {
            var report_id = chunks.split("|")[1];
            var msg_html = '<div style="display: flex; align-items: center; margin-bottom: 5px; ">'
            msg_html += '<div style="max-width: 65%;">'
            msg_html += '<button id="btn-report-pdf-' + report_id + '" class="btn-report" ondblclick="generate_report(\'' + report_id + '\', \'pdf\')">'
            msg_html += 'Generate PDF'
            msg_html += '</button>'
            msg_html += '<button id="btn-report-word-' + report_id + '" class="btn-report" ondblclick="generate_report(\'' + report_id + '\', \'word\')" style="margin-left: 5px;">'
            msg_html += 'Generate Word'
            msg_html += '</button>'
            // Editar para que el flow no aparesca
            if (window.global_role_name != "Guess") {
                msg_html += '<button id="btn-analyze-text-' + report_id + '" class="btn-report" ondblclick="open_analyze_text(\'' + report_id + '\')" style="margin-left: 5px;">'
                msg_html += 'Analyze Text'
                msg_html += '</button>'
            }
            msg_html += '</div>'
            msg_html += '<div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;">'
            msg_html += '<input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers(\'' + report_id + '\')">'
            msg_html += '<label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>'
            msg_html += '</div>'
            msg_html += '</div>'
            msg_html += '<span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">'
            msg_html += '</span>'
            document.getElementById("messages").innerHTML += msg_html;
            if (go_down_scroll == true) {
                let chatWindow = document.getElementById("messages-container");
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }
    }
    if (stop_chat == true) {
        button_mode_section("Question");
        document.getElementById("message-input").focus();
        //document.getElementById("before_load").style.display = "none";
        document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
        document.getElementById("button-submit").disabled = false;
        evaluate_stop_chat("stop");
    } else {
        if (object_phases.length > 0) {
            phase_iteration(object_phases.shift());
        } else {
            button_mode_section("Question");
            document.getElementById("message-input").focus();
            //document.getElementById("before_load").style.display = "none";
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            evaluate_stop_chat("stop");
        }
    }
}

function print_sqlphases_content_result(data, id_string = '') {
    var msg_html = '';
    const show_details = (document.getElementById("show_details").checked) ? '' : 'hide';
    let answer = window.chatbot_no_records_found;

    const title_table_markdown = safeMarkdownRender(data.title_table_markdown);
    const sql_query_markdown = (safeMarkdownRender(data.sql_query_markdown)).replace(/<pre>/g, '<pre style="max-height: 150px;overflow: auto;">');
    //const table_markdown = (safeMarkdownRender(data.table_markdown)).replace(/<table>/g, `<table id="table-${id_string}" class="chat-table-format">`);
    const tablePreview = renderTablePreview(data.table_markdown, id_string, 100);
    const usage_summary_markdown = (safeMarkdownRender(data.usage_summary_markdown)).replace(/<p>/g, '<p style="white-space: break-spaces;">');

    msg_html += `
        <div class="sql_query ${show_details}">
           ${title_table_markdown + sql_query_markdown}
        </div>
        <div class="data_table" style="max-height: 450px;overflow: auto;">
            ${tablePreview}
        </div>
        <div class="usage_summary ${show_details}">
            ${usage_summary_markdown}
        </div>
    `;
    
    /*
    if ((data.table_result).length > 0) {
        var object_to_html_table = createTableFromObjects(data.table_result, (data.column_order).split("|"), chat_id + "__1");
        answer = object_to_html_table.outerHTML;
    }
    const answer_detail = (md.render(data.answer_detail)).toString().replace(/{{table_result}}/g, (answer).replaceAll("__1", "__2"));
    if (answer_detail) {
        if (show_details) {
            msg_html += '<div class="short_answer" style="overflow: auto;max-height: 450px;display: none;">';
            msg_html += answer;
            msg_html += '</div>';
            msg_html += '<div class="long_answer" style="overflow: auto;max-height: 450px;">';
            msg_html += answer_detail;
            msg_html += '</div>';
        } else {
            msg_html += '<div class="short_answer" style="overflow: auto;max-height: 450px;">';
            msg_html += answer;
            msg_html += '</div>';
            msg_html += '<div class="long_answer" style="overflow: auto;max-height: 450px;display: none;">';
            msg_html += answer_detail;
            msg_html += '</div>';
        }

    } else {
        msg_html += '<div class="short_answer" style="overflow: auto;">';
        msg_html += answer;
        msg_html += '</div>';
    }
    */

    const chatsqlGraphPermission = window.chatsql_graph_permission === "true";
    if (chatsqlGraphPermission) {
        msg_html += `
            <div style="padding-top: 5px;">
                <a href="#" data-toggle="modal" data-target="#chatsql_chatgraph_modal" data-id="${id_string}">${window.chatsql_chart_modal_title}</a>
                | 
                <a href="#" onclick="copy_table('${id_string}')">Copy</a>
                | 
                <a href="#" onclick="export_table('${id_string}')">Export</a>
            </div>
        `;
    }
    
    //msg_html += '</div>';

    if (document.getElementById("chat-assistant-" + id_string)) {
        document.getElementById("chat-assistant-" + id_string).innerHTML = msg_html;
    }
    //highlight_language_sql();
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
}


function sqlgeneral_content_result(data, message) {
    const dateTime = getCurrentDateTime();
    var msg_html = '<div style="display: flex; align-items: flex-end; margin-bottom: 5px; ">';
    msg_html += '<img src="../static/dist/img/chatGPT.png" alt="bot" style="width: 25px;">';
    msg_html += '<div style="max-width: 95%;">';
    msg_html += '<div class="chat-bot">';
    const show_details = document.getElementById("show_details").checked;
    const answer = (safeMarkdownRender(data.answer)).replace(/<table>/g, '<table class="chat-table-format">');
    if (data.answer_detail) {
        const answer_detail = (safeMarkdownRender(data.answer_detail)).replace(/<table>/g, '<table class="chat-table-format">');
        if (show_details) {
            msg_html += '<div class="short_answer" style="display: none;">';
            msg_html += answer;
            msg_html += '</div>';
            msg_html += '<div class="long_answer">';
            msg_html += answer_detail;
            msg_html += '</div>';
        } else {
            msg_html += '<div class="short_answer">';
            msg_html += answer;
            msg_html += '</div>';
            msg_html += '<div class="long_answer" style="display: none;">';
            msg_html += answer_detail;
            msg_html += '</div>';
        }

    } else {
        msg_html += '<div class="short_answer">';
        msg_html += answer;
        msg_html += '</div>';
    }
    msg_html += '</div>';
    msg_html += '<div style="max-width: 95%;padding-top: 0.5rem;margin-left: 1rem;">';
    msg_html += '<span class="text-sm chat-bot-date" title="' + dateTime.full_date + '">' + dateTime.short_time + '</span>';
    msg_html += '</div>';
    msg_html += '</div>';
    msg_html += '</div>';

    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const element_thought = document.getElementById("thought");
    if (element_thought) {
        //thought
        var though_html = '<div class="block-thought">';
        though_html += '<div class="thought-question">';
        though_html += '<span class="span-question-text" title="' + message + '">' + message + '</span>';
        though_html += '<span class="span-question-time"></span>';
        though_html += '</div>';
        though_html += '<div class="thought-answer">';
        though_html += '<span class="span-answer-text" title="' + (data.answer).substring(0, 100) + '...">' + (data.answer).substring(0, 50) + '...</span>';
        though_html += '</div>';
        though_html += '</div>';
        element_thought.innerHTML += though_html;
        element_thought.scrollTop = element_thought.scrollHeight;
    }
}










//#endregion






function stop_chat_button() {
    stop_chat = true;
}

function evaluate_stop_chat(status = "stop", id_message = "") {
    //const openai_type = document.getElementById("openai_type").msDropdown.value;
    //const openai_stream = document.getElementById("openai_stream").checked;
    //const azure_openai_stream = document.getElementById("azure_openai_stream").checked;
    const btn_mode_flujo = document.getElementById("btn_mode_flujo");
    const flow_clean_chat = document.getElementById("flow_clean_chat");
    const button_submit = document.getElementById("button-submit");
    const e_stop_chat_button = document.getElementById("stop-chat-button");

    if (status === "stop") {
        if (e_stop_chat_button) {
            e_stop_chat_button.style.display = "none";
        }
        if (btn_mode_flujo) {
            btn_mode_flujo.disabled = false;
        }
        if (flow_clean_chat) {
            flow_clean_chat.classList.remove("disabled");
        }
        if (button_submit) {
            button_submit.innerHTML = '<i class="fa fa-send"></i>';
            button_submit.disabled = false;
        }
        showStaticMessage({toggle: "hide"});
        controlStopwatch("stop");

        // Remove the last loading assistant message
        if (id_message !== '') {
            const block_chat_message = document.getElementById("block-chat-message-" + id_message);
            
            if (block_chat_message) {
                const chat_assistant = document.getElementById("chat-assistant-" + id_message);
                if (chat_assistant.querySelector("svg")) {
                    block_chat_message.remove();
                }
            }
        }
    }
    if (status == "start") {
        if (e_stop_chat_button) {
            e_stop_chat_button.style.display = "block";
        }
        if (btn_mode_flujo) {
            btn_mode_flujo.disabled = true;
        }
        if (flow_clean_chat) {
            flow_clean_chat.classList.add("disabled");
        }
        if (button_submit) {
            button_submit.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
            button_submit.disabled = true;
        }
    }

    /*
    if (openai_type == "open_ai" && openai_stream) {
        if (status == "stop") {
            e_stop_chat_button.style.display = "none";
        }
        if (status == "start") {
            e_stop_chat_button.style.display = "block";
        }
    }
    if (openai_type == "azure" && azure_openai_stream) {
        if (status == "stop") {
            e_stop_chat_button.style.display = "none";
        }
        if (status == "start") {
            e_stop_chat_button.style.display = "block";
        }
    }
    */
}



function print_error_result({error = null, id_chat_assistant = "", message = ""}) {
    let error_text = "Unknown Error";

    // Check if there is a JSON response with a specific error
    if (error.responseJSON) {
        const { code_error, sql_query_error } = error.responseJSON;
        if (code_error) {
            error_text = code_error;
            if (sql_query_error) {
                error_text += `\n\nFull Query:\n${sql_query_error}\n\nThe query was copied to clipboard.`;
            }
        } else {
            error_text = error.responseText || "Unknown Error.";
        }
    } else {
        error_text = error.responseText || error_text;
    }

    // Handle network, abort, and CORS issues specifically
    if (error.statusText === 'abort') {
        error_text = 'Request was aborted';
    } else if (error.status === 0) {
        error_text = "Network error, CORS issue, or aborted request.";
    }

    // Display alert and log the error
    showAlert({
        msg: error_text,
        type: "error"
    });
    // Handle network, abort, and CORS issues specifically
    if (error.statusText === 'abort') {
        error_text = 'Fetch error: Request was aborted';
    } else if (error.status === 0) {
        error_text = "Request failed: Network error, CORS issue, or aborted request.";
    } else {
        error_text = `Fetch error: ${error_text}`;
    }
    console.log(error_text);

    // Update UI elements if they exist
    const chatAssistant = document.getElementById(id_chat_assistant);
    if (chatAssistant) {
        chatAssistant.innerHTML = error_text;
    }

    const before_load = document.getElementById("before_load");
    const message_input = document.getElementById("message-input");
    const button_submit = document.getElementById("button-submit");

    if (message_input && message !== "") {
        message_input.value = message;
        message_input.focus();
    }
    if (button_submit) {
        button_submit.innerHTML = '<i class="fa fa-send"></i>';
        button_submit.disabled = false;
    }
    if (before_load) {
        before_load.style.display = "none";
    }

}






