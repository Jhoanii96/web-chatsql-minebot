//window.addEventListener('beforeunload', function (event) {
//    // Lógica que quieres ejecutar al cerrar la pestaña
//    $.post('/keepalive');
//});
var chat_table_array = [];
// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    // Install input filters.
    setInputFilter(document.getElementById("openai_maxtokens"), function (value) {
        return /^-?\d*$/.test(value);
    }, "Must be an integer");
    setInputFilter(document.getElementById("openai_temperature"), function (value) {
        return /^\d*\.?\d*$/.test(value);
    }, "Must be an decimal number");

    

    $("#openai_type").on("change", function (arg) {
        update_openai();
    });
    update_openai();
    // KeepAlive
    //var timeout = 300; // 5 minutes
    //setInterval(function(){
    //    $.post('/keepalive'); 
    //}, timeout * 1000);

    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('change', function() {
        document.body.classList.toggle('skin-dark');
        document.body.classList.toggle('skin-white');
        let newTheme = "";
        if (themeToggle.checked) {
            document.getElementById("btn-mode-white").classList.remove("selected");
            document.getElementById("btn-mode-dark").classList.add("selected");
            newTheme = "skin-dark";
        } else {
            document.getElementById("btn-mode-white").classList.add("selected");
            document.getElementById("btn-mode-dark").classList.remove("selected");
            newTheme = "skin-white";
        }
        // Send the selected theme to the server
        select_theme(newTheme);
    });
    document.getElementById("btn-mode-white").addEventListener("click", function (event) {
        if (!this.classList.contains("selected")) {
            select_theme("skin-white");
            document.body.classList.toggle('skin-dark');
            document.body.classList.toggle('skin-white');
            document.getElementById("btn-mode-white").classList.add("selected");
            document.getElementById("btn-mode-dark").classList.remove("selected");
            document.getElementById('themeToggle').checked = false;
        }
    });
    document.getElementById("btn-mode-dark").addEventListener("click", function (event) {
        if (!this.classList.contains("selected")) {
            select_theme("skin-dark");
            document.body.classList.toggle('skin-dark');
            document.body.classList.toggle('skin-white');
            document.getElementById("btn-mode-white").classList.remove("selected");
            document.getElementById("btn-mode-dark").classList.add("selected");
            document.getElementById('themeToggle').checked = true;
        }
    });
    $('.sidebar-toggle').on('click', function(e) {
        e.preventDefault();
        // Disable the toggle button
        $(this).prop('readonly', true);
        let collapsed = true;
        // Check if the body has the 'sidebar-collapse' class
        if ($('body').hasClass('sidebar-collapse')) {
            collapsed = false;
        } else {
            collapsed = true;
        }
        // Send AJAX request to Flask
        $.ajax({
            url: '/set_sidebar',
            type: 'POST',
            data: JSON.stringify({ collapsed: collapsed }),
            contentType: 'application/json',
            success: function(response) {
                // Re-enable the toggle button on success
                $('.sidebar-toggle').prop('readonly', false);
            },
            error: function() {
                // Re-enable the toggle button in case of an error as well
                $('.sidebar-toggle').prop('readonly', false);
            }
        });
    });

    const message_input = document.getElementById("message-input");
    if (message_input) {
        message_input.setAttribute("style", "height:" + (message_input.scrollHeight) + "px;overflow-y:hidden;");
        message_input.addEventListener("input", OnInput, false);
        
        $("#message-input").keypress(function (e) {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();

                $("#button-submit").click();
            }
        });
    }

    var element_show_details = document.getElementById("show_details");
    if (element_show_details) {
        element_show_details.addEventListener('change', function (event) {
            var show_detail = document.getElementById("show_details").checked;
            if (show_detail == true) {
                $('.sql_query').each(function (i, obj) {
                    obj.classList.remove('hide');
                });
                $('.usage_summary').each(function (i, obj) {
                    obj.classList.remove('hide');
                });
            }
            if (show_detail == false) {
                $('.sql_query').each(function (i, obj) {
                    obj.classList.add('hide');
                });
                $('.usage_summary').each(function (i, obj) {
                    obj.classList.add('hide');
                });
            }
        });
    }

    const navbar_clean_chat = document.getElementById("section_navbar_cleanchat");
    if (navbar_clean_chat) {
        navbar_clean_chat.addEventListener('click', function (event) {
            event.preventDefault();
            clean_chat();
        });
    }

    const PhaseTable = document.getElementById('PhaseTable');
    if (PhaseTable) {
        // Agrega un evento 'input' a todas las celdas editables
        const celdasEditables = PhaseTable.querySelectorAll('td[contenteditable="true"]');
        celdasEditables.forEach(celda => {
            celda.addEventListener('input', detectarCambios);
        });
    }

    const messages_container = document.getElementById("messages-container");
    if (messages_container) {
        messages_container.addEventListener("scroll", function (event) {
            let chatWindow = document.getElementById("messages-container");
            var scroll_height = chatWindow.scrollHeight;
            var current_scroll = chatWindow.scrollTop + chatWindow.clientHeight;
            const goto_bottom = document.getElementById("goto-bottom");
            if (goto_bottom) {
                if (current_scroll > scroll_height - 5) {
                    //console.log(chatWindow.scrollTop, chatWindow.scrollHeight);
                    go_down_scroll = true;
                    goto_bottom.style.display = "none";
                } else {
                    go_down_scroll = false;
                    goto_bottom.style.display = "block";
                }
            }
        });
    }

    const language_switch = document.getElementById("language_switch");
    if (language_switch) {
        language_switch.addEventListener('change', function (event) {
            event.preventDefault();
            var language_value = language_switch.value;
            if (language_value == "es") {
                window.location.href = '/set_language/es';
            } else {
                window.location.href = '/set_language/en';
            }
        });
    }

    const button_save_main_changes = document.getElementById("button_save_main_changes");
    if (button_save_main_changes) {
        button_save_main_changes.addEventListener("click", function (event) {
            event.preventDefault();
            save_main_changes();
        });
    }

    const button_save_openai_changes = document.getElementById("button_save_openai_changes");
    if (button_save_openai_changes) {
        button_save_openai_changes.addEventListener("click", function (event) {
            event.preventDefault();
            save_openai_changes();
        });
    }
});

function select_theme(new_theme = "skin-white") {
    fetch('/set_theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: new_theme })
    });
}

// Función para detectar cambios en la tabla
function detectarCambios() {
    console.log('Se detectó un cambio en la tabla.');
    // Aquí puedes realizar acciones adicionales cuando se detecten cambios.
}

function update_openai() {
    var openai_type = document.getElementById("openai_type").msDropdown.value;

    if (openai_type == "open_ai") {
        document.getElementById("azure_openai_type_section").style.display = "none";
        document.getElementById("openai_type_section").style.display = "block";
    }
    if (openai_type == "azure") {
        document.getElementById("openai_type_section").style.display = "none";
        document.getElementById("azure_openai_type_section").style.display = "block";
    }
}

function load_chat_conversation(history, chat_type = null) {
    for (var i = 0; i < history.length; i++) {
        if (history[i].role == "user") {
            //msg_html = '<div style="align-self: flex-end;max-width: 95%;margin-bottom: 5px;">'
            //msg_html += '<div class="chat-question">'
            //msg_html += '<span style="white-space: break-spaces;">'
            //msg_html += history[i].content
            //msg_html += '</span>'
            //msg_html += '</div>'
            //msg_html += '<span class="text-sm chat-question-date" title="' + history[i].full_date + '">' + history[i].detailed_date + '</span>'
            //msg_html += '</div>'
            const profile_image = document.querySelector("#user_profile_image").cloneNode(true);
            profile_image.removeAttribute("id");
            profile_image.style.width = "25px";
            profile_image.style.height = "25px";
            profile_image.style.margin = "0px";
            let icon_bookmark = "";
            if (history[i].saved_message == 1) {
                icon_bookmark = "fa-bookmark";
            } else {
                icon_bookmark = "fa-bookmark-o";
            }
            var msg_html = `<div class="block-chat-message">
                    ${profile_image.outerHTML} 
                    <div style="max-width: 95%;">
                        <div style="max-width: 95%;margin-left: 1rem;">
                            <div class="text-sm chat-question-date" title="${history[i].full_date}"><span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${history[i].detailed_date}</span></div>
                        </div>
                        <div class="chat-question">
                            <span id="user-question-${history[i].id_message}">${history[i].content}</span>
                            <div style="float: right;">
                                <button id="save-question-${history[i].id_message}" class="button-save-message" title="Guardar" data-saved="${history[i].save_user_message}" data-id-table="${history[i].save_id_table}" onclick="save_user_message('${history[i].id_message}')">
                                    <i class="fa ${icon_bookmark}"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;

            document.getElementById("messages").innerHTML += msg_html;
            let chatWindow = document.getElementById("messages-container");
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
        if (history[i].role == "assistant" && history[i].content !== undefined) {

            var msg_html = '<div class="block-chat-message">';
            msg_html += '<img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">';
            msg_html += '<div style="max-width: 95%;display: flex;flex-direction: column;align-items: flex-start;">';
            msg_html += '<div style="padding-top: 0.5rem;margin-left: 1rem;">';
            msg_html += '<div class="text-sm chat-bot-date" title="' + history[i].full_date + '"><span><b>MineBot GIG</b>&nbsp;|&nbsp;' + history[i].detailed_date + '</span></div>';
            msg_html += '</div>';
            msg_html += '<div class="chat-bot" style="max-width: 100%;">';

            if (chat_type == "sql") {
                var object_table = {};
                object_table["id"] = history[i].id_message;
                object_table["table"] = history[i].table_result;
                chat_table_array.push(object_table);

                const show_details = (document.getElementById("show_details").checked) ? '' : 'hide';
                let answer = window.chatbot_no_records_found;

                const sql_query_markdown = (safeMarkdownRender(history[i].sql_query_markdown)).replace(/<pre>/g, '<pre style="max-height: 150px;overflow: auto;">');
                const table_markdown = (safeMarkdownRender(history[i].content)).replace(/<table>/g, '<table class="chat-table-format">');
                const usage_summary_markdown = (safeMarkdownRender(history[i].usage_summary_markdown)).replace(/<p>/g, '<p style="white-space: break-spaces;">');

                msg_html += `<div class="sql_query ${show_details}">`;
                msg_html += sql_query_markdown;
                msg_html += '</div>';
                msg_html += '<div class="data_table" style="max-height: 450px;overflow: auto;">';
                msg_html += table_markdown;
                msg_html += '</div>';
                msg_html += `<div class="usage_summary ${show_details}">`;
                msg_html += usage_summary_markdown;
                msg_html += '</div>';
                
            } else {
                msg_html = safeMarkdownRender(history[i].content).replace(/<table>/g, '<table class="chat-table-format">');
            }
            
            const chatsqlGraphPermission = window.chatsql_graph_permission === "true";
            if (chat_type == "sql" && chatsqlGraphPermission) {
                if (history[i].sql_mode == "database") {
                    msg_html += `
                        <div style="padding-top: 5px;">
                            <a href="#" data-toggle="modal" data-target="#chatsql_chatgraph_modal" data-id="${history[i].id_message}">${window.chatsql_chart_modal_title}</a>
                            | 
                            <a href="#" onclick="copy_table('${history[i].id_message}')">Copy</a>
                            | 
                            <a href="#" onclick="export_table('${history[i].id_message}')">Export</a>
                        </div>
                    `;
                }
            }

            document.getElementById("messages").innerHTML += msg_html;
            let chatWindow = document.getElementById("messages-container");
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.querySelectorAll('.chat-table-format').forEach(table => {
        enableTableSorting(table);
    });

}

function load_chatflow_conversation(history, chat_type = null) {
    const messagesContainer = document.getElementById("messages");
    const fragment = document.createDocumentFragment();
    const chatWindow = document.getElementById("messages-container");
    let group_id = "";

    const showDetails = document.getElementById("show_details")?.checked ? "" : "hide";
    const chatsqlGraphPermission = window.chatsql_graph_permission === "true";

    for (const msg of history) {
        const id_chat = msg.id_message || generate_id(16);
        const msgDiv = document.createElement("div");
        msgDiv.className = "block-chat-message";

        // 🟣 MENSAJE DEL USUARIO
        if (msg.role === "user") {
            msgDiv.style.justifyContent = "flex-end";
            msgDiv.innerHTML = `
                <div style="max-width:65%;">
                    <div style="text-align:right;">
                        <div class="text-sm chat-question-date" title="${msg.full_date}">
                            <b>${window.chatbot_text_you}</b> | ${msg.detailed_date}
                        </div>
                    </div>
                    <div class="chat-question">
                        <span style="white-space: break-spaces;">${msg.content}</span>
                    </div>
                </div>
            `;
        }

        // 🟣 MENSAJE DEL ASISTENTE
        if (msg.role === "assistant" && msg.content !== undefined) {
            msgDiv.innerHTML = `
                <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width:25px;">
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:flex-start;">
                    <div style="padding-top:0.5rem;margin-left:1rem;">
                        <div class="text-sm chat-bot-date" title="${msg.full_date}">
                            <b>MineBot GIG</b> | ${msg.detailed_date}
                        </div>
                    </div>
                    <div id="chat-assistant-${id_chat}" class="chat-bot" style="max-width:100%;"></div>
                </div>
            `;

            if (msg.group_id) group_id = msg.group_id;

            let innerHTML = "";

            if (chat_type === "sql") {
                chat_table_array.push({ id: id_chat, content_table: msg.content });

                // 🔹 Si el mensaje tiene tabla
                if (msg.table_title !== "-1") {
                    const sql_query = safeMarkdownRender(msg.sql_query_markdown || "")
                        .replace(/<pre>/g, '<pre style="max-height:150px;overflow:auto;">');
                    const summary = safeMarkdownRender(msg.usage_summary_markdown || "")
                        .replace(/<p>/g, '<p style="white-space: break-spaces;">');

                    // 🔹 Mostrar solo primeras 20 filas
                    const tablePreview = renderTablePreview(msg.content, id_chat, 100);

                    innerHTML = `
                        <div class="sql_query ${showDetails}">${sql_query}</div>
                        <div class="data_table" style="max-height:450px;overflow:auto;">
                            ${tablePreview}
                        </div>
                        <div class="usage_summary ${showDetails}">${summary}</div>
                    `;
                } else {
                    innerHTML = safeMarkdownRender(msg.content).replace(/<table>/g, '<table class="chat-table-format">');
                }

                // 🔹 Extra opciones
                if (chatsqlGraphPermission && msg.sql_mode === "database") {
                    innerHTML += `
                        <div style="padding-top:5px;">
                            <a href="#" data-toggle="modal" data-target="#chatsql_chatgraph_modal" data-id="${id_chat}">${window.chatsql_chart_modal_title}</a>
                            | <a href="#" onclick="copy_table('${id_chat}')">Copy</a>
                            | <a href="#" onclick="export_table('${id_chat}')">Export</a>
                        </div>
                    `;
                }

            } else {
                innerHTML = safeMarkdownRender(msg.content).replace(/<table>/g, '<table class="chat-table-format">');
            }

            // Inserta contenido dentro del mensaje
            requestAnimationFrame(() => {
                const target = msgDiv.querySelector(`#chat-assistant-${id_chat}`);
                if (target) target.innerHTML = innerHTML;
            });
        }

        fragment.appendChild(msgDiv);
    }

    // 🟣 BLOQUE FINAL DE REPORTES
    if (history.length > 0 && group_id) {
        const footerDiv = document.createElement("div");
        footerDiv.innerHTML = `
            <div style="display:flex;align-items:center;margin-bottom:15px;">
                <div style="max-width:65%;">
                    <button class="btn-report" ondblclick="generate_report('${group_id}','excel')">${window.chatbot_generate_excel}</button>
                    <button class="btn-report" ondblclick="generate_report('${group_id}','word')" style="margin-left:5px;">Generate Word</button>
                    <button class="btn-report" ondblclick="generate_executive('${group_id}')" style="margin-left:5px;">Executive Report</button>
                    <button class="btn-report" onclick="show_prompts('${group_id}')" style="margin-left:5px;">Logs</button>
                </div>
            </div>
            <span id="report-progress-text" style="color:black;font-size:11px;"></span>
            <div class="block-chat-message">
                <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width:25px;">
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:flex-start;">
                    <div style="padding-top:0.5rem;margin-left:1rem;">
                        <div class="text-sm chat-bot-date"><b>MineBot GIG</b></div>
                    </div>
                    <div class="chat-bot"><p>¿Hay algo más que te gustaría saber sobre el equipo?</p></div>
                </div>
            </div>
        `;
        fragment.appendChild(footerDiv);
        document.getElementById("btn_mode_question").click();
    }

    messagesContainer.innerHTML = "";
    messagesContainer.appendChild(fragment);

    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Habilita sort en tablas visibles
    document.querySelectorAll(".chat-table-format").forEach(enableTableSorting);
}






function load_thought_conversation(history) {
    const element_thought = document.getElementById("thought");
    for (var i = 0; i < history.length; i++) {
        if (element_thought) {
            //thought
            var though_html = '<div class="block-thought">';
            though_html += '<div class="thought-question">';
            though_html += '<span class="span-question-text" title="' + history[i].question + '">' + history[i].question + '</span>';
            though_html += '<span class="span-question-time"></span>';
            though_html += '</div>';
            though_html += '<div class="thought-answer">';
            though_html += '<span class="span-answer-text" title="' + history[i].answer + '...">' + (history[i].answer).substring(0, 50) + '...</span>';
            though_html += '</div>';
            though_html += '</div>';
            element_thought.innerHTML += though_html;
            element_thought.scrollTop = element_thought.scrollHeight;
        }
    }
}

function goto_bottom() {
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    go_down_scroll = true;
    document.getElementById("goto-bottom").style.display = "none";
}




/*
function textarea_document_phase_table(id_element) {
    document.getElementById(id_element).addEventListener('click', function (event) {
        // If not, create a new big textarea
        var id_textarea_prompt = (event.target.id).toString().replace("document_prompt_", "textarea_prompt_");
        var container = document.getElementById('modal_chat_flow_prompts');

        if (!document.getElementById(id_textarea_prompt)) {
            var bigTextarea = document.createElement('textarea');
            bigTextarea.setAttribute('id', id_textarea_prompt);
            bigTextarea.setAttribute('class', "form-control");
            bigTextarea.setAttribute('style', "width: 100%;height: 100%;");
            container.appendChild(bigTextarea);
        }

        var modal = document.getElementById('modal_chat_flow_prompts');
        var overlay = document.getElementById('overlay_chat_flow_prompts');
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // Set the content of the big textarea in the modal
        var textarea_prompt = document.getElementById(id_textarea_prompt);
        textarea_prompt.style.display = 'block';
        // Focus on the textarea
        textarea_prompt.focus();
        textarea_prompt.value = event.target.value;
        // Add input event listener to the common parent for updating the modal content
        document.getElementById(id_textarea_prompt).addEventListener('input', function (aevent) {
            document.getElementById(id_element).value = aevent.target.value;
        });

        // Close the modal when clicking outside the modal content
        //var overlay = document.getElementById('overlay_chat_flow_prompts');
        overlay.addEventListener('click', function () {
            var modal = document.getElementById('modal_chat_flow_prompts');
            var textarea_prompt = document.getElementById(id_textarea_prompt);
            modal.style.display = 'none';
            overlay.style.display = 'none';
            textarea_prompt.style.display = 'none';
            textarea_prompt.value = "";
        });
    });
}
function textarea_phase_prompt_table(id_element) {
    document.getElementById(id_element).addEventListener('click', function (event) {
        // If not, create a new big textarea
        var id_textarea_prompt = (event.target.id).toString().replace("phase_prompt_", "textarea_phase_");
        var container = document.getElementById('modal_chat_flow_prompts');

        if (!document.getElementById(id_textarea_prompt)) {
            var bigTextarea = document.createElement('textarea');
            bigTextarea.setAttribute('id', id_textarea_prompt);
            bigTextarea.setAttribute('class', "form-control");
            bigTextarea.setAttribute('style', "width: 100%;height: 100%;");
            container.appendChild(bigTextarea);
        }

        var modal = document.getElementById('modal_chat_flow_prompts');
        var overlay = document.getElementById('overlay_chat_flow_prompts');
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // Set the content of the big textarea in the modal
        var textarea_prompt = document.getElementById(id_textarea_prompt);
        textarea_prompt.style.display = 'block';
        textarea_prompt.focus();
        textarea_prompt.value = event.target.value;
        // Add input event listener to the common parent for updating the modal content
        document.getElementById(id_textarea_prompt).addEventListener('input', function (aevent) {
            document.getElementById(id_element).value = aevent.target.value;
        });

        // Close the modal when clicking outside the modal content
        //var overlay = document.getElementById('overlay_chat_flow_prompts');
        overlay.addEventListener('click', function () {
            var modal = document.getElementById('modal_chat_flow_prompts');
            var textarea_prompt = document.getElementById(id_textarea_prompt);
            modal.style.display = 'none';
            overlay.style.display = 'none';
            textarea_prompt.style.display = 'none';
            textarea_prompt.value = "";
        });
    });
}
*/
