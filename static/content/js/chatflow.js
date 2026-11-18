//#region GlobalVariables
const chat = new ChatHistory('chatflow');
const content = new ContentHistory('chatflow');
//const chatContent = new ContentHistorySQLite('chatsql');

// Declare myChart globally so that it's accessible throughout the script
let myChart;
const placeholder_search_add = (window.flow_new_permission == "True" ? window.chatbot_search_add : window.chatbot_search);

const option_sql_tables = document.getElementById("list_sql_tables_{row_id}");
var option_documents_html = "";
var object_phases = [];
var go_down_scroll = true;
var id_report = "";

// OpenAI Select for Table
const option_openai_models = document.createElement('select');
option_openai_models.id = "list_openai_models_{row_id}";
option_openai_models.className = "elements-table";
const openai_model = document.getElementById('openai_model');
const azure_openai_model = document.getElementById('azure_openai_model');
const flow_final_question_model_select = document.getElementById('flow_final_question_model_select');
// Create optgroup elements
const openai_model_group = document.createElement('optgroup');
openai_model_group.label = 'OpenAI';
const azure_openai_model_group = document.createElement('optgroup');
azure_openai_model_group.label = 'Azure';
// Classify options into optgroups based on value or some logic
Array.from(openai_model.options).forEach(option => {
    // Clone the option to avoid removing it from the original select
    const new_option = option.cloneNode(true);
    // Concatenate the constant value to the option's value
    new_option.value = "open_ai|" + new_option.value;
    openai_model_group.appendChild(new_option); // Clone to avoid removing from original
});
Array.from(azure_openai_model.options).forEach(option => {
    // Clone the option to avoid removing it from the original select
    const new_option = option.cloneNode(true);
    // Concatenate the constant value to the option's value
    new_option.value = "azure|" + new_option.value;
    azure_openai_model_group.appendChild(new_option); // Clone to avoid removing from original
});
// Append optgroups to the new select
// Append model groups to the main options container
option_openai_models.append(openai_model_group, azure_openai_model_group);

// If the flow select element exists, append model groups to it as well
if (flow_final_question_model_select) {
    flow_final_question_model_select.append(openai_model_group.cloneNode(true),
        azure_openai_model_group.cloneNode(true));
}

var sql_objects = [];
var data_graph = [];

const choise_input_equipment = new Choices(`#input_equipment`, {
    placeholder: true,
    placeholderValue: window.chatbot_search || 'Search...',
    itemSelectText: '',
    shouldSort: false
});

const selectPhaseName = document.getElementById('select_phase_name');
const choicesPhaseName = new Choices(selectPhaseName, {
    duplicateItemsAllowed: false,
    addItems: false,
    searchEnabled: true,
    placeholder: true,
    itemSelectText: '',
    searchPlaceholderValue: window.chatbot_search + '...',
    shouldSort: false,
    placeholderValue: placeholder_search_add, // Your custom placeholder
    addItemFilter: (value) => {   // Optional: filter to avoid empty tags
        return value && value.trim() !== '';
    },
    // This lets us customize how each option looks in the dropdown
    callbackOnCreateTemplates: function (template) {
        return {
            choice: (classNames, data) => {
                const cookieValue = getCookie("chatflow_select_phase_name");
                let highlighted_value = "";
                let selected_value = "false";
                let data_label = "";
                if (cookieValue && cookieValue == data.value) {
                    highlighted_value = "is-highlighted";
                    selected_value = "true";
                }
                if (data.customProperties) {
                    if (data.customProperties.favorite) {
                        data_label = `${data.customProperties.favorite === "1" ? '⭐ ' : ''}${data.label}`;
                    }
                }
                // Each dropdown choice
                return template(`
                    <div 
                        id="choices--select_phase_name-item-choice-${data.id}"
                        class="choices__item choices__item--choice is-selected choices__item--selectable ${highlighted_value}"
                        role="option"
                        data-choice=""
                        data-id="${data.id}"
                        data-value="${data.value}"
                        data-choice-selectable=""
                        aria-selected="${selected_value}"
                        >
                        <div class="choice-label">${data_label}</div>
                        ${data.customProperties && data.customProperties.comments
                        ? `<div class="choice-description">${data.customProperties.comments}</div>`
                        : ''
                    }
                    </div>
                `);
            }
        };
    }
});
const selectPhaseCategory = document.getElementById('select_phase_category');
const choicesPhaseCategory = new Choices(selectPhaseCategory, {
    placeholder: true,
    placeholderValue: placeholder_search_add,
    shouldSort: false,
    searchPlaceholderValue: window.chatbot_search + '...',
    itemSelectText: ''
});

//#endregion

// Restricts input for the given textbox to the given inputFilter function.
window.addEventListener('load', function () {
    //$('#select_phase_category').select2({
    //    tags: true,
    //    createTag: function (params) {
    //        var term = $.trim(params.term);
    //        // Check if the term is not empty
    //        if (term === '') {
    //            return null;
    //        }
    //        return {
    //            id: term,  // New value's ID
    //            text: term,  // New value's text
    //            newTag: true  // Marks the option as a new tag
    //        };
    //    },
    //    searchInputPlaceholder: placeholder_search_add
    //});
    //$('#select_phase_name').select2({
    //    tags: true,
    //    createTag: function (params) {
    //        var term = $.trim(params.term);
    //        // Check if the term is not empty
    //        if (term === '') {
    //            return null;
    //        }
    //        return {
    //            id: term,  // New value's ID
    //            text: term,  // New value's text
    //            newTag: true  // Marks the option as a new tag
    //        };
    //    },
    //    searchInputPlaceholder: placeholder_search_add
    //});


    const tableBody = document.querySelector("#PhaseTable > tbody");

    if (tableBody) {
        new Sortable(tableBody, {
            animation: 150,
            ghostClass: "bright-background-class",
            onEnd: (evt) => {
                refreshTableNumber("PhaseTable");
                // console.log(`Row moved from ${evt.oldIndex} → ${evt.newIndex}`);
            },
        });
    } else {
        console.warn("PhaseTable tbody not found.");
    }

    checkChoiceCookieSelect(choicesPhaseCategory, 'chatflow_select_phase_category');
    checkCookieChecked('show_right_message', true);
    refresh_sql_phase_name(1);
    reset_buttons_category();

    set_object_popup("section_navbar_chatflow");
    set_object_popup("section_navbar_setting");
    set_object_popup("btn_mode_flujo");

    selectPhaseCategory.addEventListener('change', (event) => {
        if (event.detail) {
            const addedValue = event.detail.value;
            if (addedValue == "-") {
                reset_buttons_category();
                choicesPhaseName.clearStore();
                choicesPhaseName.setChoices([{ value: '-', label: window.chatbot_select, selected: true }], 'value', 'label', false);
                const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
                table.innerHTML = "";
                choise_input_equipment.setChoiceByValue("-");
                document.getElementById("input_start_date").value = "";
                document.getElementById("input_end_date").value = "";
                document.getElementById("input_start_time").value = "";
                document.getElementById("input_end_time").value = "";
                document.getElementById("section_phase_name").style.display = "none";
                document.getElementById("span_phase_name").innerHTML = "";
                document.getElementById("input_doc_title").value = "";
                document.getElementById("btn_add_row_below").disabled = true;
                document.getElementById("btn_load_phases_table").disabled = true;
                document.getElementById("button_save_phases").disabled = true;
                reset_buttons_sqlphase_name();
            } else {
                const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
                table.innerHTML = "";
                choise_input_equipment.setChoiceByValue("-");
                document.getElementById("input_start_date").value = "";
                document.getElementById("input_end_date").value = "";
                document.getElementById("input_start_time").value = "";
                document.getElementById("input_end_time").value = "";
                document.getElementById("input_doc_title").value = "";
                reset_buttons_category();
                setCookie("chatflow_select_phase_category", addedValue);
                refresh_sql_phase_name();
            }
        } else {
            reset_buttons_category();
            choicesPhaseName.clearStore();
            choicesPhaseName.setChoices([{ value: '-', label: window.chatbot_select, selected: true }], 'value', 'label', false);
            const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
            table.innerHTML = "";
            choise_input_equipment.setChoiceByValue("-");
            document.getElementById("input_start_date").value = "";
            document.getElementById("input_end_date").value = "";
            document.getElementById("input_start_time").value = "";
            document.getElementById("input_end_time").value = "";
            document.getElementById("section_phase_name").style.display = "none";
            document.getElementById("span_phase_name").innerHTML = "";
            document.getElementById("btn_add_row_below").disabled = true;
            document.getElementById("btn_load_phases_table").disabled = true;
            document.getElementById("button_save_phases").disabled = true;
            reset_buttons_sqlphase_name();
        }
    });
    selectPhaseCategory.addEventListener('addItem', (event) => {
        //var data = e.params.data;
        //const flow_new_permission = (window.flow_new_permission == "True" ? true : false);
        //// Check if the selected option is a new tag
        //if (data.newTag && flow_new_permission) {
        //    console.log('New tag added:', data.text);
        //    // Activate a custom listener (replace with your functionality)
        //    add_new_category(data.text);
        //} else {
        //    if (data.id == "-") {
        //        reset_buttons_category();
        //        choicesPhaseName.clearStore();
        //        choicesPhaseName.setChoices([{ value: '-', label: window.chatbot_select, selected: true }], 'value', 'label', false);
        //        const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
        //        table.innerHTML = "";
        //        choise_input_equipment.setChoiceByValue("-");
        //        document.getElementById("input_start_date").value = "";
        //        document.getElementById("input_end_date").value = "";
        //        document.getElementById("input_start_time").value = "";
        //        document.getElementById("input_end_time").value = "";
        //        document.getElementById("section_phase_name").style.display = "none";
        //        document.getElementById("span_phase_name").innerHTML = "";
        //        reset_buttons_sqlphase_name();
        //    } else {
        //        const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
        //        table.innerHTML = "";
        //        choise_input_equipment.setChoiceByValue("-");
        //        document.getElementById("input_start_date").value = "";
        //        document.getElementById("input_end_date").value = "";
        //        document.getElementById("input_start_time").value = "";
        //        document.getElementById("input_end_time").value = "";
        //        reset_buttons_category();
        //        setCookie("chatflow_select_phase_category", data.id);
        //        refresh_sql_phase_name();
        //    }
        //}
    });
    selectPhaseName.addEventListener('change', (event) => {
        if (event.detail) {
            const addedValue = event.detail.value;
            const allChoices = choicesPhaseName._store.choices;
            const choiceObj = allChoices.find(c => c.value === addedValue);
            const addedLabel = choiceObj.label;
            if (addedValue == "-") {
                reset_buttons_sqlphase_name();
                const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
                table.innerHTML = "";
                choise_input_equipment.setChoiceByValue("-");
                document.getElementById("input_start_date").value = "";
                document.getElementById("input_end_date").value = "";
                document.getElementById("input_start_time").value = "";
                document.getElementById("input_end_time").value = "";
                document.getElementById("section_phase_name").style.display = "none";
                document.getElementById("span_phase_name").innerHTML = "";
                document.getElementById("input_doc_title").value = "";
                document.getElementById("btn_add_row_below").disabled = true;
                document.getElementById("btn_load_phases_table").disabled = true;
                document.getElementById("button_save_phases").disabled = true;
            } else {
                choise_input_equipment.setChoiceByValue("-");
                document.getElementById("input_start_date").value = "";
                document.getElementById("input_end_date").value = "";
                document.getElementById("input_start_time").value = "";
                document.getElementById("input_end_time").value = "";
                document.getElementById("section_phase_name").style.display = "block";
                document.getElementById("span_phase_name").innerHTML = addedLabel;
                document.getElementById("input_doc_title").value = "";
                reset_buttons_sqlphase_name();
                setCookie("chatflow_select_phase_name", addedValue);
                refresh_favorite_icon_button();
                load_phases_table();
            }
        } else {
            reset_buttons_sqlphase_name();
            const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
            table.innerHTML = "";
            choise_input_equipment.setChoiceByValue("-");
            document.getElementById("input_start_date").value = "";
            document.getElementById("input_end_date").value = "";
            document.getElementById("input_start_time").value = "";
            document.getElementById("input_end_time").value = "";
            document.getElementById("section_phase_name").style.display = "none";
            document.getElementById("span_phase_name").innerHTML = "";
            document.getElementById("input_doc_title").value = "";
            document.getElementById("btn_add_row_below").disabled = true;
            document.getElementById("btn_load_phases_table").disabled = true;
            document.getElementById("button_save_phases").disabled = true;
        }
    });
    selectPhaseName.addEventListener('addItem', (event) => {
        const addedValue = event.detail.value;       // the value user added/selected
        const addedLabel = event.detail.label;
        // If it's not in knownOptions, it's a new tag created by the user
        const flow_new_permission = (window.flow_new_permission == "True" ? true : false);
        // Check if the selected option is a new tag
        //if (addedValue == '--' && flow_new_permission) {
        //    console.log('New tag added:', addedLabel);
        //    // Activate a custom listener (replace with your functionality)
        //    add_new_phase_name(addedLabel);
        //} else {
        //    if (addedValue == "-") {
        //        reset_buttons_sqlphase_name();
        //        const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
        //        table.innerHTML = "";
        //        choise_input_equipment.setChoiceByValue("-");
        //        document.getElementById("input_start_date").value = "";
        //        document.getElementById("input_end_date").value = "";
        //        document.getElementById("input_start_time").value = "";
        //        document.getElementById("input_end_time").value = "";
        //        document.getElementById("section_phase_name").style.display = "none";
        //        document.getElementById("span_phase_name").innerHTML = "";
        //    } else {
        //        choise_input_equipment.setChoiceByValue("-");
        //        document.getElementById("input_start_date").value = "";
        //        document.getElementById("input_end_date").value = "";
        //        document.getElementById("input_start_time").value = "";
        //        document.getElementById("input_end_time").value = "";
        //        document.getElementById("section_phase_name").style.display = "block";
        //        document.getElementById("span_phase_name").innerHTML = addedLabel;
        //        reset_buttons_sqlphase_name();
        //        setCookie("chatflow_select_phase_name", addedValue);
        //        refresh_favorite_icon_button();
        //        load_phases_table();
        //    }
        //}
    });

    document.querySelector('#input_phase_category').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            save_sqlcategory_data();
        }
    });
    document.querySelector('#input_phase_name').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            save_sqlphase_name_data();
        }
    });

    // Phase Incident Modal
    checkCookieButtonFlow('chatflow_chat_type', 'Flow');
    const button_save_phases = document.getElementById("button_save_phases");
    if (button_save_phases) {
        button_save_phases.addEventListener("click", function (event) {
            event.preventDefault();
            save_phases_config();
        });
    }
    document.getElementById("btn_mode_flujo").addEventListener("click", function (event) {
        button_mode_section('Flow');
        document.getElementById("message-input").setAttribute("disabled", false);
        document.getElementById("button-submit").setAttribute("disabled", false);
        updateCookie('chatflow_chat_type', 'Flow');
        document.getElementById("message-form").classList.remove('message-form-question');
        document.getElementById("message-form").classList.add('message-form-flow');
        document.getElementById("message-input").classList.remove('message-input-question');
        document.getElementById("message-input").classList.add('message-input-flow');
    });
    document.getElementById("btn_mode_question").addEventListener("click", function (event) {
        button_mode_section('Question');
        document.getElementById("message-input").removeAttribute("disabled");
        document.getElementById("button-submit").removeAttribute("disabled");
        updateCookie('chatflow_chat_type', 'Question');
        document.getElementById("message-form").classList.remove('message-form-flow');
        document.getElementById("message-form").classList.add('message-form-question');
        document.getElementById("message-input").classList.remove('message-input-flow');
        document.getElementById("message-input").classList.add('message-input-question');
    });
    const btn = document.getElementById("btn_mode_flujo");
    if (btn) {
        // Create a one-time handler
        const oneTimeHandler = async function (event) {
            event.preventDefault();
            // Only execute if the button has the 'selected' class
            if (this.classList.contains("selected")) {
                // Disable the button
                this.disabled = true;

                try {
                    await read_start_phases.call(this);
                } catch (error) {
                    console.error("Error in read_start_phases:", error);
                } finally {
                    // Optionally re-enable if you want to allow another click later
                    // this.disabled = false;
                }
            }
        };

        // Attach the one-time handler
        btn.addEventListener('dblclick', oneTimeHandler);
    } else {
        console.error("Element with ID 'btn_mode_flujo' not found");
    }
    document.getElementById("button-submit").addEventListener("click", async function (event) {
        event.preventDefault();
        var btn_mode_question = document.getElementById("btn_mode_question");
        var question = (document.getElementById("message-input").value).trim();
        if (btn_mode_question.classList.contains("selected")) {
            submit_question(question);
        }
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
    document.getElementById("show_right_message").addEventListener("change", function (event) {
        event.preventDefault();
        if (event.currentTarget.checked) {
            setCookie("show_right_message", "true");
        } else {
            setCookie("show_right_message", "false");
        }
    });

    const fechaInicio = document.getElementById("input_start_date");
    const fechaFin = document.getElementById("input_end_date");

    if (fechaInicio && fechaFin) {
        // Cuando cambia la fecha de inicio
        fechaInicio.addEventListener("change", () => {
            if (fechaInicio.value) {
                // Establece la mínima fecha posible en el input de fin
                fechaFin.min = fechaInicio.value;

                // Si la fecha fin ya es menor que inicio, corrige
                if (fechaFin.value && fechaFin.value < fechaInicio.value) {
                    fechaFin.value = fechaInicio.value;
                }
            }
        });

        // Cuando cambia la fecha de fin
        fechaFin.addEventListener("change", () => {
            if (fechaInicio.value && fechaFin.value < fechaInicio.value) {
                fechaFin.value = fechaInicio.value; // Corrige automáticamente
            }
        });
    }




    document.getElementById("flow_clean_chat").addEventListener("click", function (event) {
        event.preventDefault();
        clean_chat();
    });

    load_chatflow_conversation(content.getHistory(), "sql");
});

function button_mode_section(selected) {
    if (selected == "Flow") {
        document.getElementById("btn_mode_flujo").classList.add("selected");
        document.getElementById("btn_mode_question").classList.remove("selected");
    } else {
        document.getElementById("btn_mode_flujo").classList.remove("selected");
        document.getElementById("btn_mode_question").classList.add("selected");
    }
}

function reset_buttons_category() {
    const btn_update_category = document.getElementById("btn_update_category");
    const btn_save_category = document.getElementById("btn_save_category");
    const btn_cancel_category = document.getElementById("btn_cancel_category");
    const btn_delete_category = document.getElementById("btn_delete_category");
    if (selectPhaseCategory) {
        if (selectPhaseCategory.value === "-") {
            selectPhaseCategory.parentElement.style.display = '';
            if (btn_update_category) {
                btn_update_category.style.display = "none";
            }
            if (btn_save_category) {
                btn_save_category.style.display = "none";
            }
            if (btn_cancel_category) {
                btn_cancel_category.style.display = "none";
            }
            if (btn_delete_category) {
                btn_delete_category.style.display = "none";
            }
            document.getElementById("input_phase_category").style.display = "none";
        } else {
            selectPhaseCategory.parentElement.style.display = '';
            if (btn_update_category) {
                btn_update_category.style.display = "block";
            }
            if (btn_save_category) {
                btn_save_category.style.display = "none";
            }
            if (btn_cancel_category) {
                btn_cancel_category.style.display = "none";
            }
            if (btn_delete_category) {
                btn_delete_category.style.display = "block";
            }
            document.getElementById("input_phase_category").style.display = "none";
        }
    }
}
function reset_buttons_sqlphase_name() {
    const phase_name = document.getElementById('select_phase_name');
    const btn_update_phasename = document.getElementById("btn_update_phasename");
    const btn_favorite_phasename = document.getElementById("btn_favorite_phasename");
    const btn_duplicate_phasename = document.getElementById("btn_duplicate_phasename");
    const btn_comment_phasename = document.getElementById("btn_comment_phasename");
    const btn_save_phasename = document.getElementById("btn_save_phasename");
    const btn_cancel_phasename = document.getElementById("btn_cancel_phasename");
    const btn_delete_phasename = document.getElementById("btn_delete_phasename");
    if (phase_name) {
        if (phase_name.value === "-") {
            phase_name.parentElement.style.display = '';
            if (btn_update_phasename) {
                btn_update_phasename.style.display = "none";
            }
            if (btn_favorite_phasename) {
                btn_favorite_phasename.style.display = "none";
            }
            if (btn_duplicate_phasename) {
                btn_duplicate_phasename.style.display = "none";
            }
            if (btn_comment_phasename) {
                btn_comment_phasename.style.display = "none";
            }
            if (btn_save_phasename) {
                btn_save_phasename.style.display = "none";
            }
            if (btn_cancel_phasename) {
                btn_cancel_phasename.style.display = "none";
            }
            if (btn_delete_phasename) {
                btn_delete_phasename.style.display = "none";
            }
            document.getElementById("input_phase_name").style.display = "none";
        } else {
            phase_name.parentElement.style.display = '';
            if (btn_update_phasename) {
                btn_update_phasename.style.display = "block";
            }
            if (btn_favorite_phasename) {
                btn_favorite_phasename.style.display = "block";
            }
            if (btn_comment_phasename) {
                btn_comment_phasename.style.display = "block";
            }
            if (btn_duplicate_phasename) {
                btn_duplicate_phasename.style.display = "block";
            }
            if (btn_save_phasename) {
                btn_save_phasename.style.display = "none";
            }
            if (btn_cancel_phasename) {
                btn_cancel_phasename.style.display = "none";
            }
            if (btn_delete_phasename) {
                btn_delete_phasename.style.display = "block";
            }
            document.getElementById("input_phase_name").style.display = "none";
        }
    }
}

function update_sqlcategory_data() {
    const btn_update_category = document.getElementById("btn_update_category");
    const btn_save_category = document.getElementById("btn_save_category");
    const btn_cancel_category = document.getElementById("btn_cancel_category");
    const btn_delete_category = document.getElementById("btn_delete_category");
    if (selectPhaseCategory) {
        if (selectPhaseCategory.value === "-") {
            document.getElementById("input_phase_category").value = "-";
        } else {
            selectPhaseCategory.parentElement.style.display = 'none';
            if (btn_update_category) {
                btn_update_category.style.display = "none";
            }
            if (btn_save_category) {
                btn_save_category.style.display = "block";
            }
            if (btn_cancel_category) {
                btn_cancel_category.style.display = "block";
            }
            if (btn_delete_category) {
                btn_delete_category.style.display = "none";
            }
            document.getElementById("input_phase_category").style.display = "block";
            const allChoices = choicesPhaseCategory._store.choices;
            const choiceObj = allChoices.find(c => c.value === selectPhaseCategory.value);
            document.getElementById("input_phase_category").value = choiceObj.label;
            document.getElementById("input_phase_category").focus();
        }
    }
}
function update_sqlphase_name_data() {
    const phase_name = document.getElementById('select_phase_name');
    const btn_update_phasename = document.getElementById("btn_update_phasename");
    const btn_favorite_phasename = document.getElementById("btn_favorite_phasename");
    const btn_duplicate_phasename = document.getElementById("btn_duplicate_phasename");
    const btn_comment_phasename = document.getElementById("btn_comment_phasename");
    const btn_save_phasename = document.getElementById("btn_save_phasename");
    const btn_cancel_phasename = document.getElementById("btn_cancel_phasename");
    const btn_delete_phasename = document.getElementById("btn_delete_phasename");
    if (phase_name) {
        if (phase_name.value === "-") {
            document.getElementById("input_phase_name").value = "-";
        } else {
            phase_name.parentElement.style.display = 'none';
            if (btn_update_phasename) {
                btn_update_phasename.style.display = "none";
            }
            if (btn_favorite_phasename) {
                btn_favorite_phasename.style.display = "none";
            }
            if (btn_duplicate_phasename) {
                btn_duplicate_phasename.style.display = "none";
            }
            if (btn_comment_phasename) {
                btn_comment_phasename.style.display = "none";
            }
            if (btn_save_phasename) {
                btn_save_phasename.style.display = "block";
            }
            if (btn_cancel_phasename) {
                btn_cancel_phasename.style.display = "block";
            }
            if (btn_delete_phasename) {
                btn_delete_phasename.style.display = "none";
            }
            document.getElementById("input_phase_name").style.display = "block";
            const allChoices = choicesPhaseName._store.choices;
            const choiceObj = allChoices.find(c => c.value === phase_name.value);
            document.getElementById("input_phase_name").value = choiceObj.label;
            document.getElementById("input_phase_name").focus();
        }
    }
}
function cancel_sqlcategory_data() {
    selectPhaseCategory.parentElement.style.display = '';
    const btn_update_category = document.getElementById("btn_update_category");
    const btn_save_category = document.getElementById("btn_save_category");
    const btn_cancel_category = document.getElementById("btn_cancel_category");
    const btn_delete_category = document.getElementById("btn_delete_category");
    if (btn_update_category) {
        btn_update_category.style.display = "block";
    }
    if (btn_save_category) {
        btn_save_category.style.display = "none";
    }
    if (btn_cancel_category) {
        btn_cancel_category.style.display = "none";
    }
    if (btn_delete_category) {
        btn_delete_category.style.display = "block";
    }
    document.getElementById("input_phase_category").style.display = "none";
}
function cancel_sqlphase_name_data() {
    document.getElementById("select_phase_name").parentElement.style.display = '';
    const btn_update_phasename = document.getElementById("btn_update_phasename");
    const btn_favorite_phasename = document.getElementById("btn_favorite_phasename");
    const btn_duplicate_phasename = document.getElementById("btn_duplicate_phasename");
    const btn_comment_phasename = document.getElementById("btn_comment_phasename");
    const btn_save_phasename = document.getElementById("btn_save_phasename");
    const btn_cancel_phasename = document.getElementById("btn_cancel_phasename");
    const btn_delete_phasename = document.getElementById("btn_delete_phasename");
    if (btn_update_phasename) {
        btn_update_phasename.style.display = "block";
    }
    if (btn_favorite_phasename) {
        btn_favorite_phasename.style.display = "";
    }
    if (btn_duplicate_phasename) {
        btn_duplicate_phasename.style.display = "";
    }
    if (btn_comment_phasename) {
        btn_comment_phasename.style.display = "";
    }
    if (btn_save_phasename) {
        btn_save_phasename.style.display = "none";
    }
    if (btn_cancel_phasename) {
        btn_cancel_phasename.style.display = "none";
    }
    if (btn_delete_phasename) {
        btn_delete_phasename.style.display = "block";
    }
    document.getElementById("input_phase_name").style.display = "none";
}


function update_favorite_name_data(object) {
    const phase_id = choicesPhaseName.getValue(true);
    const allChoices = choicesPhaseName._store.choices;
    const choiceObj = allChoices.find(c => c.value === phase_id);
    const favValue = (String(choiceObj.customProperties.favorite) === "0") ? "1" : "0";
    if (phase_id == "-") {
        return;
    }
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    var data = JSON.stringify({
        phase_id: phase_id,
        favorite: favValue
    });
    $.ajax({
        url: "/chatflow/UpdateFavorite",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                refresh_favorite_icon_button();
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            refresh_favorite_icon_button();
            refresh_sqlcategory();
        },
        error: (error) => {
            refresh_favorite_icon_button();
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

function refresh_favorite_icon_button() {
    const phase_id = choicesPhaseName.getValue(true);
    if (phase_id && phase_id != "-") {
        const allChoices = choicesPhaseName._store.choices;
        const choiceObj = allChoices.find(c => c.value === phase_id);
        const favValue = choiceObj.customProperties.favorite;
        const btn_favorite_button = document.getElementById("btn_favorite_phasename");
        if (favValue === "1") {
            btn_favorite_button.innerHTML = '<i class="fa fa-fw fa-star">';
            btn_favorite_button.disabled = false;
        }
        if (favValue === "0") {
            btn_favorite_button.innerHTML = '<i class="fa fa-fw fa-star-o">';
            btn_favorite_button.disabled = false;
        }
    }
}

function save_sqlcategory_data() {
    const phase_category = selectPhaseCategory.value;
    const new_phase_category = document.getElementById("input_phase_category").value;
    if (phase_category == "-") {
        return;
    }
    if (new_phase_category.length < 4) {
        showAlert({
            msg: window.chatbot_alert_four_characters,
            type: "information"
        });
        document.getElementById("input_phase_category").focus();
        return;
    }
    var data = JSON.stringify({
        phase_category: phase_category,
        new_phase_category: new_phase_category
    });
    const btn_save_category = document.getElementById("btn_save_category");
    const btn_cancel_category = document.getElementById("btn_cancel_category");
    if (btn_save_category) {
        btn_save_category.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
        btn_save_category.disabled = true;
    }
    if (btn_cancel_category) {
        btn_cancel_category.disabled = true;
    }
    document.getElementById("input_phase_category").disabled = true;
    $.ajax({
        url: "/chatflow/UpdateCategory",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                if (btn_save_category) {
                    btn_save_category.innerHTML = '<i class="fa fa-fw fa-check"></i>';
                    btn_save_category.disabled = false;
                }
                if (btn_cancel_category) {
                    btn_cancel_category.disabled = false;
                }
                document.getElementById("input_phase_category").disabled = false;
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if (btn_save_category) {
                btn_save_category.innerHTML = '<i class="fa fa-fw fa-check"></i>';
                btn_save_category.disabled = false;
            }
            if (btn_cancel_category) {
                btn_cancel_category.disabled = false;
            }
            document.getElementById("input_phase_category").disabled = false;
            refresh_sqlcategory();
        },
        error: (error) => {
            if (btn_save_category) {
                btn_save_category.innerHTML = '<i class="fa fa-fw fa-check"></i>';
                btn_save_category.disabled = false;
            }
            if (btn_cancel_category) {
                btn_cancel_category.disabled = false;
            }
            document.getElementById("input_phase_category").disabled = false;
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}







function save_sqlphase_name_data() {
    const phase_name = $('#select_phase_name').val();
    const new_phase_name = document.getElementById("input_phase_name").value;
    if (phase_name == "-") {
        return;
    }
    if (new_phase_name.length < 4) {
        showAlert({
            msg: window.chatbot_alert_four_characters,
            type: "information"
        });
        document.getElementById("input_phase_name").focus();
        return;
    }
    var data = JSON.stringify({
        phase_name: phase_name,
        new_phase_name: new_phase_name
    });
    const btn_save_phasename = document.getElementById("btn_save_phasename");
    const btn_cancel_phasename = document.getElementById("btn_cancel_phasename");
    if (btn_save_phasename) {
        btn_save_phasename.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
        btn_save_phasename.disabled = true;
    }
    if (btn_cancel_phasename) {
        btn_cancel_phasename.disabled = true;
    }
    document.getElementById("input_phase_name").disabled = true;
    $.ajax({
        url: "/chatflow/UpdatePhaseName",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                if (btn_save_phasename) {
                    btn_save_phasename.innerHTML = '<i class="fa fa-fw fa-check"></i>';
                    btn_save_phasename.disabled = false;
                }
                if (btn_cancel_phasename) {
                    btn_cancel_phasename.disabled = false;
                }
                document.getElementById("input_phase_name").disabled = false;
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if (btn_save_phasename) {
                btn_save_phasename.innerHTML = '<i class="fa fa-fw fa-check"></i>';
                btn_save_phasename.disabled = false;
            }
            if (btn_cancel_phasename) {
                btn_cancel_phasename.disabled = false;
            }
            document.getElementById("input_phase_name").disabled = false;
            refresh_sql_phase_name(1);
        },
        error: (error) => {
            if (btn_save_phasename) {
                btn_save_phasename.innerHTML = '<i class="fa fa-fw fa-check"></i>';
                btn_save_phasename.disabled = false;
            }
            if (btn_cancel_phasename) {
                btn_cancel_phasename.disabled = false;
            }
            document.getElementById("input_phase_name").disabled = false;
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

async function duplicate_sqlphase_name_data(object) {
    const id_phase = choicesPhaseName.getValue(this);
    const allChoices = choicesPhaseName._store.choices;
    const choiceObj = allChoices.find(c => c.value === id_phase);
    const choiceLabel = choiceObj.label;
    const confirmacion = await showConfirmDialog({ message: '¿Desea duplicar la fase [' + choiceLabel + ']?' });
    if (!confirmacion) {
        return;
    }
    var newPhaseName = document.getElementById("newPhaseName");
    var new_phase_name = "";
    if (newPhaseName) {
        new_phase_name = newPhaseName.value;
    }
    var data = JSON.stringify({
        id_phase: id_phase,
        new_phase_name: new_phase_name
    });
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    $.ajax({
        url: "/chatflow/DuplicatePhaseName",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            refresh_sql_phase_name(1);
        },
        error: (error) => {
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        },
        complete: () => {
            object.innerHTML = '<i class="fa fa-clone"></i>';
            object.disabled = false;
        }
    })
}







function add_new_category(text = "-") {
    var phase_category = "";
    if (text == "-") {
        phase_category = selectPhaseCategory.value;
    } else {
        phase_category = text;
    }

    if (phase_category == "-") {
        return;
    }
    var data = JSON.stringify({
        phase_category: phase_category
    });
    document.getElementById("loading_phase_category").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("loading_phase_category").disabled = true;
    selectPhaseCategory.disabled = true;
    const btn_delete_category = document.getElementById("btn_delete_category");
    if (btn_delete_category) {
        btn_delete_category.disabled = true;
    }
    $.ajax({
        url: "/chatflow/SaveNewCategory",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("loading_phase_category").innerHTML = '';
                document.getElementById("loading_phase_category").disabled = false;
                selectPhaseCategory.disabled = false;
                if (btn_delete_category) {
                    btn_delete_category.disabled = false;
                }
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            document.getElementById("loading_phase_category").innerHTML = '';
            document.getElementById("loading_phase_category").disabled = false;
            selectPhaseCategory.disabled = false;
            if (btn_delete_category) {
                btn_delete_category.disabled = false;
            }
            refresh_sqlcategory();
        },
        error: (error) => {
            document.getElementById("loading_phase_category").innerHTML = '';
            document.getElementById("loading_phase_category").disabled = false;
            selectPhaseCategory.disabled = false;
            if (btn_delete_category) {
                btn_delete_category.disabled = false;
            }
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

function refresh_sqlcategory() {
    choicesPhaseCategory.setChoiceByValue("-");
    choicesPhaseCategory.clearStore();
    choicesPhaseName.setChoiceByValue("-");
    choicesPhaseName.clearStore();
    document.getElementById("loading_phase_category").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("loading_phase_category").disabled = true;
    selectPhaseCategory.disabled = true;
    const btn_delete_category = document.getElementById("btn_delete_category");
    if (btn_delete_category) {
        btn_delete_category.disabled = true;
    }
    $.ajax({
        url: "/chatflow/RefreshCategory",
        contentType: 'application/json',
        method: 'GET',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("loading_phase_category").innerHTML = '';
                document.getElementById("loading_phase_category").disabled = false;
                selectPhaseCategory.disabled = false;
                if (btn_delete_category) {
                    btn_delete_category.disabled = false;
                }
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            document.getElementById("loading_phase_category").innerHTML = '';
            document.getElementById("loading_phase_category").disabled = false;
            selectPhaseCategory.disabled = false;
            if (btn_delete_category) {
                btn_delete_category.disabled = false;
            }

            // Create new options array for Choices.js
            const newOptions = [];

            // Add default option
            newOptions.push({
                value: "-",
                label: window.chatbot_select,
                selected: true
            });

            // Add result options
            result.forEach(function (option) {
                newOptions.push({
                    value: option.id,
                    label: option.name,
                    selected: false
                });
            });

            // Set new choices
            choicesPhaseCategory.setChoices(newOptions, 'value', 'label', false);
            checkChoiceCookieSelect(choicesPhaseCategory, 'chatflow_select_phase_category');
            reset_buttons_category();
            refresh_sql_phase_name(1);
        },
        error: (error) => {
            document.getElementById("loading_phase_category").innerHTML = '';
            document.getElementById("loading_phase_category").disabled = false;
            selectPhaseCategory.disabled = false;
            if (btn_delete_category) {
                btn_delete_category.disabled = false;
            }
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

async function delete_sqlcategory_data() {
    if (selectPhaseCategory.value == "-") {
        return;
    }
    //var confirmacion = confirm(window.chatbot_delete_item + ' "' + phase_category.options[phase_category.selectedIndex].text + '"');
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatflow_flow_modal_delete_category + ' "' + selectPhaseCategory.options[selectPhaseCategory.selectedIndex].text + '"' });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        phase_category: selectPhaseCategory.value
    });
    const btn_delete_category = document.getElementById("btn_delete_category");
    if (btn_delete_category) {
        btn_delete_category.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
        btn_delete_category.disabled = true;
    }
    selectPhaseCategory.disabled = true;
    $.ajax({
        url: "/chatflow/DeleteCategory",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                if (btn_delete_category) {
                    btn_delete_category.innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                    btn_delete_category.disabled = false;
                }
                selectPhaseCategory.disabled = false;
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if (btn_delete_category) {
                btn_delete_category.innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                btn_delete_category.disabled = false;
            }
            selectPhaseCategory.disabled = false;
            refresh_sqlcategory();
        },
        error: (error) => {
            if (btn_delete_category) {
                btn_delete_category.innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                btn_delete_category.disabled = false;
            }
            selectPhaseCategory.disabled = false;
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

function add_new_phase_name(text = "-") {
    var phase_category = selectPhaseCategory.value;
    var phase_name = "";
    if (text == "-") {
        phase_name = document.querySelector("#select_phase_name").value;
    } else {
        phase_name = text;
    }

    if (phase_name == "-") {
        return;
    }
    var data = JSON.stringify({
        phase_category: phase_category,
        phase_name: phase_name
    });
    document.getElementById("loading_phase_name").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("loading_phase_name").disabled = true;
    document.getElementById("select_phase_name").disabled = true;
    const btn_delete_phasename = document.getElementById("btn_delete_phasename");
    if (btn_delete_phasename) {
        btn_delete_phasename.disabled = true;
    }
    $.ajax({
        url: "/chatflow/SaveNewPhaseName",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("loading_phase_name").innerHTML = '';
                document.getElementById("loading_phase_name").disabled = false;
                document.getElementById("select_phase_name").disabled = false;
                if (btn_delete_phasename) {
                    btn_delete_phasename.disabled = false;
                }
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            document.getElementById("loading_phase_name").innerHTML = '';
            document.getElementById("loading_phase_name").disabled = false;
            document.getElementById("select_phase_name").disabled = false;
            if (btn_delete_phasename) {
                btn_delete_phasename.disabled = false;
            }
            refresh_sql_phase_name(1, phase_name);
        },
        error: (error) => {
            document.getElementById("loading_phase_name").innerHTML = '';
            document.getElementById("loading_phase_name").disabled = false;
            document.getElementById("select_phase_name").disabled = false;
            if (btn_delete_phasename) {
                btn_delete_phasename.disabled = false;
            }
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

function refresh_sql_phase_name(refresh_table = 0, selected_by_name = '') {
    const phase_category = selectPhaseCategory.value;
    var data = JSON.stringify({
        phase_category: phase_category
    });

    // Clear existing choices
    choicesPhaseName.clearStore();
    document.getElementById("loading_phase_name").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("loading_phase_name").disabled = true;
    document.getElementById("select_phase_name").disabled = true;

    const btn_delete_phasename = document.getElementById("btn_delete_phasename");
    if (btn_delete_phasename) {
        btn_delete_phasename.disabled = true;
    }

    $.ajax({
        url: "/chatflow/RefreshPhaseName",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("loading_phase_name").innerHTML = '';
                document.getElementById("loading_phase_name").disabled = false;
                document.getElementById("select_phase_name").disabled = false;
                if (btn_delete_phasename) {
                    btn_delete_phasename.disabled = false;
                }
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }

            document.getElementById("loading_phase_name").innerHTML = '';
            document.getElementById("loading_phase_name").disabled = false;
            document.getElementById("select_phase_name").disabled = false;
            if (btn_delete_phasename) {
                btn_delete_phasename.disabled = false;
            }

            // Create new options array for Choices.js
            const newOptions = [];

            // Add default option
            newOptions.push({
                value: "-",
                label: window.chatbot_select,
                selected: false,
                customProperties: { favorite: '0', comments: '' }
            });

            const cookieValue = getCookie("chatflow_select_phase_name");

            // Add result options
            result.forEach(function (option) {
                newOptions.push({
                    value: option.id,
                    label: option.name,
                    selected: (cookieValue == option.id ? true : false),
                    customProperties: { favorite: option.favorites || '0', comments: option.comments || '' }
                });
            });

            // Set new choices
            choicesPhaseName.setChoices(newOptions, 'value', 'label', false);

            if (refresh_table == 1) {
                if (selected_by_name != '') {
                    // Find and select the option by text
                    const foundOption = newOptions.find(opt => opt.label === selected_by_name);
                    if (foundOption) {
                        choicesPhaseName.setChoiceByValue(foundOption.value);
                    }
                }

                //checkCookieSelect('select_phase_name', 'chatflow_select_phase_name');
                checkChoiceCookieSelect(choicesPhaseName, 'chatflow_select_phase_name');

                const span_phase_name = document.getElementById("span_phase_name");
                if (span_phase_name) {
                    // Get the selected value from Choices.js
                    const selectedValue = choicesPhaseName.getValue(true);
                    let selectedText = window.chatbot_select; // Default

                    // Find the selected option text
                    if (selectedValue && selectedValue !== "-") {
                        const selectedOption = newOptions.find(opt => opt.value === selectedValue);
                        if (selectedOption) {
                            selectedText = selectedOption.label;
                        }
                    }

                    document.getElementById("section_phase_name").style.display = "block";
                    span_phase_name.innerHTML = selectedText;
                }
                load_phases_table();
            } else {
                // Trigger change event if needed
                const event = new Event('change', { bubbles: true });
                selectPhaseName.dispatchEvent(event);
            }
            refresh_favorite_icon_button();
            reset_buttons_sqlphase_name();
        },
        error: (error) => {
            document.getElementById("loading_phase_name").innerHTML = '';
            document.getElementById("loading_phase_name").disabled = false;
            document.getElementById("select_phase_name").disabled = false;
            if (btn_delete_phasename) {
                btn_delete_phasename.disabled = false;
            }
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    });
}

async function delete_sqlphase_name_data() {
    const phase_name = document.querySelector("#select_phase_name");
    if (phase_name.value == "-") {
        return;
    }
    //var confirmacion = confirm(window.chatbot_delete_item + ' "' + phase_name.options[phase_name.selectedIndex].text + '"');
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatflow_flow_modal_delete_phase + ' "' + phase_name.options[phase_name.selectedIndex].text + '"' });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        phase_name: phase_name.value
    });
    const btn_delete_phasename = document.getElementById("btn_delete_phasename");
    if (btn_delete_phasename) {
        btn_delete_phasename.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
        btn_delete_phasename.disabled = true;
    }
    document.getElementById("select_phase_name").disabled = true;
    $.ajax({
        url: "/chatflow/DeletePhaseName",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                if (btn_delete_phasename) {
                    btn_delete_phasename.innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                    btn_delete_phasename.disabled = false;
                }
                document.getElementById("select_phase_name").disabled = false;
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if (btn_delete_phasename) {
                btn_delete_phasename.innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                btn_delete_phasename.disabled = false;
            }
            document.getElementById("select_phase_name").disabled = false;
            refresh_sql_phase_name();
        },
        error: (error) => {
            if (btn_delete_phasename) {
                btn_delete_phasename.innerHTML = '<i class="fa fa-fw fa-trash-o"></i>';
                btn_delete_phasename.disabled = false;
            }
            document.getElementById("select_phase_name").disabled = false;
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

//#region Phase Modal
function load_phases_table() {
    const phase_name = document.getElementById('select_phase_name').value;
    var data = JSON.stringify({
        phase_name: phase_name
    });
    document.getElementById("overlay_phase_table").style.display = "block";
    const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    $.ajax({
        url: '/chatflow/LoadPhasesTable',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("overlay_phase_table").style.display = "none";
                console.log(result.code_error);
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            if ((result.phase_table).length > 0) {
                data_table_phases(result.phase_table);
            }
            document.getElementById("overlay_phase_table").style.display = "none";
            if ((result.parameters).length > 0) {
                choise_input_equipment.setChoiceByValue(result.parameters[0].equipment_parameter);
                const startDate = document.getElementById("input_start_date");
                const endDate = document.getElementById("input_end_date");
                const startTime = document.getElementById("input_start_time");
                const endTime = document.getElementById("input_end_time");
                document.getElementById("input_doc_title").value = result.parameters[0].report_title_parameter;
                startDate.value = result.parameters[0].startdate_parameter;
                endDate.value = result.parameters[0].enddate_parameter;
                startTime.value = result.parameters[0].starttime_parameter;
                endTime.value = result.parameters[0].endtime_parameter;
                startDate.dispatchEvent(new Event("change"));
                endDate.dispatchEvent(new Event("change"));
                document.getElementById("btn_add_row_below").disabled = false;
                document.getElementById("btn_load_phases_table").disabled = false;
                document.getElementById("button_save_phases").disabled = false;
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

/*
function data_dropdown_document(result) {
    option_documents_html = '<select id="document_source_{row_number}" style="border: none;width: 100%;background-color: transparent;">';
    option_documents_html += '<option value="-">' + window.chatbot_select + '</option>';
    option_documents_html += '<option value="All">' + window.chatbot_all_documents + '</option>';
    // Get unique extensions
    var extensions = [...new Set(result.map(item => item.extension))];
    extensions.forEach(extension => {
        option_documents_html += `<optgroup label="${extension}">`;
        result.filter(item => item.extension === extension).forEach(item => {
            option_documents_html += `<option value="${item.document_unique}">${item.document_name}</option>`;
        });
        option_documents_html += `</optgroup>`;
    });
    option_documents_html += '</select>';
}
*/
function data_table_phases(phases) {
    const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
    const action_boolean = (window.edit_table_permission == "True" ? true : false);
    for (let index = 0; index < phases.length; index++) {
        const newRow = table.insertRow(-1);
        const row_id = phases[index]["id"];
        newRow.id = row_id;
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        //const cell5 = newRow.insertCell(4);
        cell1.style.verticalAlign = "middle";
        cell2.style.verticalAlign = "middle";
        cell3.style.verticalAlign = "middle";
        cell4.style.verticalAlign = "middle";
        //cell5.style.verticalAlign = "middle";
        const report_checked = phases[index]["generate_report"] == 1 ? 'checked' : '';
        cell1.innerHTML = '<span id="number_' + row_id + '" class="number-table">0</span>';
        //cell2.innerHTML = '<div style="text-align: start;"><textarea id="system_prompt_' + row_id + '" class="elements-table" rows="5" style="width: 100%;">' + phases[index]["system_prompt"] + '</textarea> </div>';
        cell2.innerHTML = `
            <div style="text-align: start;">
                <div id="block_sql_tables_${row_id}">${(option_sql_tables.outerHTML).replace("{row_id}", row_id)}</div>
                <hr>
                <textarea id="sql_prompt_${row_id}" class="elements-table" rows="3" style="width: 100%;">${phases[index]["chatsql_phase_prompt"]}</textarea>
                <div id="autocomplete-container_${row_id}"></div>
            </div>
        `;
        cell3.innerHTML = (option_openai_models.outerHTML).replace("{row_id}", row_id);
        cell4.innerHTML = '<input type="checkbox" id="generate_report_' + row_id + '" ' + report_checked + '>';
        if (action_boolean) {
            const cell5 = newRow.insertCell(4);
            cell5.style.verticalAlign = "middle";
            //cell5.innerHTML = '<button class="button-action-table" onclick="moveUp(this)"><i class="fa fa-long-arrow-up"></i></button><button class="button-action-table" onclick="moveDown(this)"><i class="fa fa-long-arrow-down"></i></button><button class="button-action-table" onclick="duplicate_row(this)"><i class="fa fa-copy"></i></button><button class="button-action-table" id="btn_flowphase_' + row_id + '" onclick="delete_phase_table(\'' + row_id + '\')"><i class="fa fa-fw fa-trash-o"></i></button>';
            cell5.innerHTML = '<button class="button-action-table" onclick="duplicate_row(this)"><i class="fa fa-copy"></i></button><button class="button-action-table" id="btn_flowphase_' + row_id + '" onclick="delete_phase_table(\'' + row_id + '\')"><i class="fa fa-fw fa-trash-o"></i></button>';
        }
        refreshTableNumber("PhaseTable");
        // Initialize autocomplete for each row's textarea
        initAutocompleteForRow(row_id);
    }

    phases.forEach(phase => {
        const rowId = phase.id; // Use camelCase for variable names
        //const tableSelect = $(`#list_sql_tables_${rowId}`);
        const modelSelect = $(`#list_openai_models_${rowId}`);

        // Set values if elements exist
        //tableSelect.val(phase.id_chatsql_tables || ''); // Add fallback for undefined
        modelSelect.val(phase.list_openai_model || '');

        const choices = new Choices(`#list_sql_tables_${rowId}`, {
            placeholder: true,
            placeholderValue: window.chatbot_search || 'Search tables...',
            itemSelectText: '',
            searchPlaceholderValue: 'Type to search...', // optional
            shouldSort: false // keeps original order
        });
        if (choices) {
            choices.setChoiceByValue(phase.id_chatsql_tables);
        }
    });
}
function duplicate_row(button) {
    // Find the row containing the button
    const currentRow = button.parentNode.parentNode;

    // Clone the row
    const clonedRow = currentRow.cloneNode(true);
    const newRowId = uuidv4();
    const oldRowId = clonedRow.id;
    clonedRow.id = newRowId;
    const id_chatsql_tables = $("#list_sql_tables_" + oldRowId).val();
    const sql_prompt = $("#sql_prompt_" + oldRowId).val();
    const list_openai_model = $("#list_openai_models_" + oldRowId).val();
    const generate_report = document.getElementById("generate_report_" + oldRowId).checked;
    clonedRow.querySelector("#block_sql_tables_" + oldRowId).innerHTML = "";
    clonedRow.querySelector("#block_sql_tables_" + oldRowId).innerHTML = (option_sql_tables.outerHTML).replace("{row_id}", newRowId);

    // Update the IDs and content for the cloned row
    const cells = clonedRow.cells;

    // Update `row_id` references in all cells
    cells[0].innerHTML = cells[0].innerHTML.replace(`number_${oldRowId}`, `number_${newRowId}`);
    cells[1].innerHTML = cells[1].innerHTML
        .replace(`sql_prompt_${oldRowId}`, `sql_prompt_${newRowId}`)
        .replace(`autocomplete-container_${oldRowId}`, `autocomplete-container_${newRowId}`);
    cells[2].innerHTML = cells[2].innerHTML.replace(`list_openai_models_${oldRowId}`, `list_openai_models_${newRowId}`);
    cells[3].innerHTML = cells[3].innerHTML.replace(`generate_report_${oldRowId}`, `generate_report_${newRowId}`);

    if (cells.length > 4) {
        cells[4].innerHTML = cells[4].innerHTML
            .replace(`btn_flowphase_${oldRowId}`, `btn_flowphase_${newRowId}`)
            .replace(`delete_phase_table('${oldRowId}')`, `delete_newrow_table(this)`);
    }

    // Insert the cloned row after the current row
    currentRow.parentNode.insertBefore(clonedRow, currentRow.nextSibling);

    //document.getElementById("block_sql_tables_" + oldRowId).innerHTML = "";
    //document.getElementById("block_sql_tables_" + oldRowId).innerHTML = (option_sql_tables.outerHTML).replace("{row_id}", newRowId);
    const new_choices = new Choices(`#list_sql_tables_${newRowId}`, {
        placeholder: true,
        placeholderValue: window.chatbot_search || 'Search tables...',
        itemSelectText: '',
        searchPlaceholderValue: 'Type to search...', // optional
        shouldSort: false // keeps original order
    });
    new_choices.setChoiceByValue(id_chatsql_tables);

    //$("#list_sql_tables_" + newRowId).val(id_chatsql_tables);
    $("#sql_prompt_" + newRowId).val(sql_prompt);
    $("#list_openai_models_" + newRowId).val(list_openai_model);
    document.getElementById("generate_report_" + newRowId).checked = generate_report;

    refreshTableNumber("PhaseTable");
    // Initialize autocomplete for each row's textarea
    initAutocompleteForRow(newRowId);
}


async function delete_phase_table(row_id) {
    //var confirmacion = confirm(window.chatbot_delete_item);
    //if (!confirmacion) {
    //    return;
    //}
    const confirmacion = await showConfirmDialog({ message: window.chatflow_flow_modal_delete_flow });
    if (!confirmacion) {
        return;
    }
    var data = JSON.stringify({
        id_phase: row_id
    });
    document.getElementById("btn_flowphase_" + row_id).innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("btn_flowphase_" + row_id).disabled = true;
    $.ajax({
        url: '/chatflow/DeletePhaseTable',
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
            load_phases_table();
        },
        error: (error) => {
            console.log(error);
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    });

}

function moveUp(button) {
    const row = button.closest("tr");
    if (row.previousElementSibling) {
        row.parentNode.insertBefore(row, row.previousElementSibling);

        refreshTableNumber("PhaseTable");
    }
}
function moveDown(button) {
    const row = button.closest("tr");
    if (row.nextElementSibling) {
        row.parentNode.insertBefore(row.nextElementSibling, row);

        refreshTableNumber("PhaseTable");
    }
}

function addRowBelow() {
    const table = document.getElementById("PhaseTable").getElementsByTagName('tbody')[0];
    const newRow = table.insertRow(-1);
    const new_id = uuidv4();
    newRow.id = new_id;
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    const cell4 = newRow.insertCell(3);
    const cell5 = newRow.insertCell(4);
    //const cell6 = newRow.insertCell(5);
    //const cell7 = newRow.insertCell(6);
    cell1.style.verticalAlign = "middle";
    cell2.style.verticalAlign = "middle";
    cell3.style.verticalAlign = "middle";
    cell4.style.verticalAlign = "middle";
    cell5.style.verticalAlign = "middle";
    //cell6.style.verticalAlign = "middle";

    cell1.innerHTML = '<span id="number_' + new_id + '" class="number-table">0</span>';
    //cell2.innerHTML = '<div style="text-align: start;"><textarea id="system_prompt_' + new_id + '" class="elements-table" rows="5" style="width: 100%;"></textarea> </div>';
    cell2.innerHTML = `
        <div style="text-align: start;">
            <div id="block_sql_tables_${new_id}">${(option_sql_tables.outerHTML).replace("{row_id}", new_id)}</div>
            <hr>
            <textarea id="sql_prompt_${new_id}" class="elements-table" rows="3" style="width: 100%;"></textarea>
            <div id="autocomplete-container_${new_id}"></div>
        </div>
    `;
    //cell3.innerHTML = '<div>' + option_documents_html.replace("{row_id}", new_id) + '</div><div><textarea id="document_prompt_' + new_id + '" rows="3" style="width: 100%;border: none;background-color: transparent;">[Pinecone Prompt]\n\n\n[Validation Prompt]\n\n\n</textarea></div>';
    //cell4.innerHTML = '<div class="col-xs-6" style="padding-right: 5px;padding-left: 5px;"><input type="text" id="document_pinecone_top_k_' + new_id + '" class="form-control" placeholder="Top K" value="10"></div><div class="col-xs-6" style="padding-right: 5px;padding-left: 5px;"><input type="text"  id="document_openai_top_p_' + new_id + '" class="form-control" placeholder="Top P" value="0.5"></div>';
    cell3.innerHTML = (option_openai_models.outerHTML).replace("{row_id}", new_id);
    cell4.innerHTML = '<input type="checkbox" id="generate_report_' + new_id + '" checked>';
    cell5.innerHTML = '<button class="button-action-table" onclick="duplicate_row(this)"><i class="fa fa-copy"></i></button><button class="button-action-table" onclick="delete_newrow_table(this)"><i class="fa fa-fw fa-trash-o"></i></button>';

    new Choices(`#list_sql_tables_${new_id}`, {
        placeholder: true,
        placeholderValue: window.chatbot_search || 'Search tables...',
        itemSelectText: '',
        searchPlaceholderValue: 'Type to search...', // optional
        shouldSort: false // keeps original order
    });

    refreshTableNumber("PhaseTable");
    // Initialize autocomplete for each row's textarea
    initAutocompleteForRow(new_id);
}
function delete_newrow_table(boton) {
    var fila = boton.parentNode.parentNode; // Obtener la fila que contiene el botón
    fila.parentNode.removeChild(fila); // Eliminar la fila
    refreshTableNumber("PhaseTable");
}

function save_phases_config() {
    const phase_name = document.getElementById('select_phase_name').value;
    const equipment_parameter = document.getElementById('input_equipment').value;
    const startdate_parameter = document.getElementById('input_start_date').value;
    const enddate_parameter = document.getElementById('input_end_date').value;
    const starttime_parameter = document.getElementById('input_start_time').value;
    const endtime_parameter = document.getElementById('input_end_time').value;
    const report_title = document.getElementById("input_doc_title").value;
    // Collect table data
    var tableData = [];
    const table = document.getElementById("PhaseTable");
    if (table.rows.length == 0) {
        return;
    }
    for (let index = 1; index < table.rows.length; index++) {
        const row = table.rows[index];
        const row_id = row["id"];
        const phase_number = document.getElementById("number_" + row_id).innerText;
        //const system_prompt = document.getElementById("system_prompt_" + row_id).value;
        const sql_tables = document.getElementById("list_sql_tables_" + row_id).value;
        const sql_prompt = document.getElementById("sql_prompt_" + row_id).value;
        const openai_models = document.getElementById("list_openai_models_" + row_id).value;
        const generate_report = (document.getElementById("generate_report_" + row_id).checked) ? 1 : 0;
        var data = {};
        data["row_id"] = row_id;
        data["phase_number"] = phase_number;
        //data["system_prompt"] = system_prompt;
        data["sql_tables"] = sql_tables;
        data["sql_prompt"] = sql_prompt;
        data["openai_models"] = openai_models;
        data["generate_report"] = generate_report;
        tableData.push(data);
    }
    // Prepare data for POST request
    var postData = JSON.stringify({
        phase_name: phase_name,
        equipment_parameter: equipment_parameter,
        startdate_parameter: startdate_parameter,
        enddate_parameter: enddate_parameter,
        starttime_parameter: starttime_parameter,
        endtime_parameter: endtime_parameter,
        report_title: report_title,
        tableData: tableData
    });
    document.getElementById("button_save_phases").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("button_save_phases").disabled = true;
    $.ajax({
        url: '/chatflow/SavePhases',
        data: postData,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button_save_phases").innerHTML = window.chatflow_flow_modal_save_changes;
                document.getElementById("button_save_phases").disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }
            document.getElementById("button_save_phases").innerHTML = window.chatflow_flow_modal_save_changes;
            document.getElementById("button_save_phases").disabled = false;
            load_phases_table();
        },
        error: (error) => {
            document.getElementById("button_save_phases").innerHTML = window.chatflow_flow_modal_save_changes;
            document.getElementById("button_save_phases").disabled = false;
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })


}
//#endregion

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
// Función para obtener el objeto 'table' por 'id'
function getTableById(id) {
    const item = (content.getHistory()).find(obj => obj.id_message === id && obj.role === 'assistant');
    return item ? item : null;
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
    const object_chat = getTableById(sql_id);

    var data = JSON.stringify({
        sql_server_connection: (object_chat.table_sql_server).trim(),
        sql_input_query: (object_chat.table_sql_query).trim(),
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





//#region Start Phases
async function read_start_phases() {
    var id_phase = document.getElementById('select_phase_name').value;
    const show_right_message = document.getElementById('show_right_message').checked ? 1 : 0;
    document.getElementById("flow_clean_chat").classList.add("disabled");
    if (id_phase == "" || id_phase == "-") {
        showAlert({
            msg: window.chatbot_alert_select_phase_name,
            type: "information"
        });
        $('#chat_flow_modal').modal('toggle');
        return;
    }
    if (id_phase == undefined || id_phase == "undefined") {
        return;
    }
    chat.clearHistory();
    var data = JSON.stringify({
        id_phase: id_phase
    });
    //document.getElementById("before_load").style.display = "block";
    document.getElementById("button-submit").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button-submit").disabled = true;
    if (show_right_message == 1) {
        showMessage(window.chatbot_message_analyzing_dictionary, 3);
    }
    evaluate_stop_chat("start");
    controlStopwatch("start");
    let ajaxCall = $.ajax({
        url: '/chatflow/ReadPhases',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
                document.getElementById("button-submit").disabled = false;
                var full_error = (result.code_error).replaceAll("[[here]]", '<a href="/dictionary">here</a>');
                document.getElementById("flow_clean_chat").classList.remove("disabled");
                showAlert({
                    msg: full_error,
                    timeout: 900, // SECONDS
                    type: "error"
                });
                return;
            }

            if (result.phase_table) {
                const span_phase_name = document.getElementById("span_phase_name").innerText;
                let chatWindow = document.getElementById("messages-container");
                var msg_html = `
                <div style="display: flex;align-items: center;">
                    <hr style="flex-grow: 1; border: 1px solid #ccc;">
                    <span style="padding: 0 10px; font-weight: bold;">${span_phase_name}</span>
                    <hr style="flex-grow: 1; border: 1px solid #ccc;">
                </div>`;
                document.getElementById("messages").innerHTML += msg_html;
                chatWindow.scrollTop = chatWindow.scrollHeight;

                if (show_right_message == 1) {
                    showMessage(window.chatbot_message_passed_analyzing, 3);
                }
                object_phases = result.phase_table;
                for (let index = 0; index < object_phases.length; index++) {
                    object_phases[index]["index"] = index;
                    object_phases[index]["max_index"] = (result.length - 1);
                    object_phases[index]["dictionary_user_prompt"] = result.dictionary[0]["dictionary_user_prompt"];
                    object_phases[index]["dictionary_data_result"] = result.dictionary[0]["dictionary_data_result"];
                    object_phases[index]["flow_system_prompt"] = result.sql_system[0]["flow_system_prompt"];
                    object_phases[index]["default_final_question_prompt"] = result.sql_system[0]["default_final_question_prompt"];
                    object_phases[index]["group_id"] = result.group_id;
                }
                const element = object_phases.shift();
                if (element.chatsql_tables == "-1") {
                    //question_iteration(element);
                    question_iteration_v2(element);
                } else {
                    phase_iteration(element);
                }
            }
        },
        error: (error) => {
            console.log(error);
            document.getElementById("button-submit").innerHTML = '<i class="fa fa-send"></i>';
            document.getElementById("button-submit").disabled = false;
            document.getElementById("flow_clean_chat").classList.remove("disabled");
            showAlert({
                msg: error,
                type: "error"
            });
        }
    });
    // Event listener for cancellation
    $('#btn-stop-chat-button').on('click', function () {
        evaluate_stop_chat("stop");
        document.getElementById("flow_clean_chat").classList.remove("disabled");
        ajaxCall.abort();
        object_phases = [];
    });
}


































async function phase_iteration(element) {
    element["openai_object"] = OpenAIObject();
    element["id_phase"] = document.getElementById('select_phase_name').value;
    let user_message = (element["phase_prompt"]).trim()
    let message_markdown = (element["phase_prompt"]).trim()
    const equipment_parameter = element["equipment_parameter"];
    const startdate_parameter = element["startdate_parameter"];
    const enddate_parameter = element["enddate_parameter"];
    const starttime_parameter = element["starttime_parameter"];
    const endtime_parameter = element["endtime_parameter"];
    user_message = user_message.replaceAll("{{equipment}}", "<b>" + equipment_parameter + "</b>");
    user_message = user_message.replaceAll("{{startdate}}", "<b>" + startdate_parameter + "</b>");
    user_message = user_message.replaceAll("{{enddate}}", "<b>" + enddate_parameter + "</b>");
    user_message = user_message.replaceAll("{{starttime}}", "<b>" + starttime_parameter + "</b>");
    user_message = user_message.replaceAll("{{endtime}}", "<b>" + endtime_parameter + "</b>");

    message_markdown = message_markdown.replaceAll("{{equipment}}", "**" + equipment_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{startdate}}", "**" + startdate_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{enddate}}", "**" + enddate_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{starttime}}", "**" + starttime_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{endtime}}", "**" + endtime_parameter + "**");
    let chatWindow = document.getElementById("messages-container");
    var data = JSON.stringify(element);
    const id_string = generate_id(32);
    var dateTime = getCurrentDateTime();
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
    var msg_html = `
    <div class="block-chat-message" style="justify-content: flex-end;">
        <div style="max-width: 65%;">
            <div style="text-align: right;">
                <div class="text-sm chat-question-date" title="${dateTime.full_date}"><span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span></div>
            </div>
            <div id="chat-user-${id_string}" class="chat-question">
                <span style="white-space: break-spaces;">${user_message}</span> 
            </div>
        </div>
    </div>`;
    //var msg_html = `
    //<div style="align-self: flex-end;max-width: 65%;margin-bottom: 5px;display: flex;flex-direction: column;">
    //    <div class="block-user-right-info">
    //        <div class="user-right-info">
    //            You
    //        </div>
    //    </div>
    //    <div id="chat-user-${id_string}" class="chat-question" style="align-self: flex-end;margin: 0;">
    //        ${element["phase_prompt"]}
    //    </div>
    //    <span class="text-sm chat-question-date" title="${dateTime.full_date}">${dateTime.detailed_date}</span>
    //</div>`
    document.getElementById("messages").innerHTML += msg_html;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    var dateTime = getCurrentDateTime();
    //const uid_phase = element["id_phase"];
    var msg_html = `
    <div id="block-chat-message-${id_string}" class="block-chat-message">
        <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
        <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
            <div style="padding-top: 0.5rem;margin-left: 1rem;">
                <div class="text-sm chat-bot-date" title="${dateTime.full_date}">
                    <span><b>MineBot GIG</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
                </div>
            </div>
            <div id="chat-assistant-${id_string}" class="chat-bot" style="max-width: 100%;">
                ${object_loading}
            </div>
        </div>
    </div>
    `;
    //var msg_html = `
    //<div style="display: flex;margin-bottom: 5px;flex-direction: column;max-width: 65%;overflow: auto;">
    //    <div class="block-user-left-info">
    //        <div class="user-left-info">
    //            <span>MineBot</span>
    //        </div>
    //    </div>
    //    <div id="chat-assistant-${id_string}" class="chat-bot" style="max-width: fit-content;">
    //        ${object_loading}
    //    </div>
    //    <div class="chat-assistant-role-foot">
    //        <span class="text-sm chat-assistant-role-date" title="${dateTime.full_date}">${dateTime.detailed_date}</span>
    //        <div id="block-chat-assistant-foot-${uid_phase}" class="chat-assistant-role-save" style="display: none;">
    //            <input type="checkbox" id="chat-assistant-foot-input-${uid_phase}" style="margin: 0px 2px;" onchange="save_assistant_answer('${uid_phase}')">
    //            <label id="chat-assistant-foot-label-${uid_phase}" for="chat-assistant-foot-input-${uid_phase}" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save response</label>
    //        </div>
    //    </div>
    //</div>
    //`;
    document.getElementById("messages").innerHTML += msg_html;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    let ajaxCall = $.ajax({
        url: '/chatflow/chatflow',
        data: data,
        contentType: 'application/json',  // Specify content type
        method: 'POST',
        success: function (result) {
            if (result.code_error) {
                const full_error = result.code_error + "\n\nFull Query: \n" + result.sql_query_error + "."
                if (document.getElementById("chat-assistant-" + id_string)) {
                    document.getElementById("chat-assistant-" + id_string).innerHTML = full_error;
                }
                if (object_phases.length > 0) {
                    const element = object_phases.shift();
                    if (element.chatsql_tables == "-1") {
                        //question_iteration(element);
                        question_iteration_v2(element);
                    } else {
                        phase_iteration(element);
                    }
                } else {
                    document.getElementById("flow_clean_chat").classList.remove("disabled");
                    evaluate_stop_chat("stop");
                    var msg_html = `
                    <div style="display: flex; align-items: center; margin-bottom: 15px; ">
                        <div style="max-width: 65%;">
                            <button id="btn-report-excel-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'excel')">
                                ${window.chatbot_generate_excel}
                            </button>
                            <button id="btn-report-word-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'word')" style="margin-left: 5px;">
                                Generate Word
                            </button>
                            <button id="btn-report-executive-${element["group_id"]}" class="btn-report" ondblclick="generate_executive('${element["group_id"]}')" style="margin-left: 5px;">
                                Executive Report
                            </button>
                            <button id="btn-show-prompts-${element["group_id"]}" class="btn-report" onclick="show_prompts('${element["group_id"]}')" style="margin-left: 5px;">
                                Logs
                            </button>
                        </div>
                        <div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;display: none;">
                            <input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers('${element["id_phase"]}')">
                            <label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>
                        </div>
                    </div>
                    <span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">
                    </span>
                    <div class="block-chat-message">
                        <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
                        <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
                            <div style="padding-top: 0.5rem;margin-left: 1rem;">
                                <div class="text-sm chat-bot-date">
                                    <span>MineBot GIG</span>
                                </div>
                            </div>
                            <div class="chat-bot" style="max-width: 100%;"><p>¿Hay algo más que te gustaría saber sobre el equipo?</p></div>
                        </div>
                    </div>
                    `;
                    document.getElementById("btn_mode_question").click();
                    document.getElementById("messages").innerHTML += msg_html;
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                }
                return;
            }

            if (result.table_markdown) {
                print_sqlphases_content_result(result, id_string);
            }

            // Reorder the array based on the desired key order
            chat.addMessage("user", message_markdown);
            content.addMessage({
                id_message: id_string,
                role: "user",
                content: message_markdown,
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                detailed_date: dateTime.detailed_date,
                sql_mode: "database"
            });

            chat.addMessage("assistant", result.table_markdown);
            content.addMessage({
                id_message: id_string,
                order_num: element["order_num"],
                task_id: element["id"],
                group_id: element["group_id"],
                role: "assistant",
                sql_mode: "database",
                content: result.table_markdown,
                sql_query_markdown: result.sql_query_markdown,
                usage_summary_markdown: result.usage_summary_markdown,
                table_result: [],
                question: message_markdown,
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                detailed_date: dateTime.detailed_date,
                table_title: element["table_title"],
                table_description: element["table_description"],
                table_columns: result.column_keys,
                table_sql_query: result.sql_query,
                table_sql_server: result.sql_server,
                phase_model: element["list_openai_model"]
            });

            if (object_phases.length > 0) {
                const element = object_phases.shift();
                if (element.chatsql_tables == "-1") {
                    //question_iteration(element);
                    question_iteration_v2(element);
                } else {
                    phase_iteration(element);
                }
            } else {
                evaluate_stop_chat("stop");
                var msg_html = `
                <div style="display: flex; align-items: center; margin-bottom: 15px; ">
                    <div style="max-width: 65%;">
                        <button id="btn-report-excel-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'excel')">
                            ${window.chatbot_generate_excel}
                        </button>
                        <button id="btn-report-word-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'word')" style="margin-left: 5px;">
                            Generate Word
                        </button>
                        <button id="btn-report-executive-${element["group_id"]}" class="btn-report" ondblclick="generate_executive('${element["group_id"]}')" style="margin-left: 5px;">
                            Executive Report
                        </button>
                        <button id="btn-show-prompts-${element["group_id"]}" class="btn-report" onclick="show_prompts('${element["group_id"]}')" style="margin-left: 5px;">
                            Logs
                        </button>
                    </div>
                    <div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;display: none;">
                        <input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers('${element["id_phase"]}')">
                        <label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>
                    </div>
                </div>
                <span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">
                </span>
                <div class="block-chat-message">
                    <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
                    <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
                        <div style="padding-top: 0.5rem;margin-left: 1rem;">
                            <div class="text-sm chat-bot-date">
                                <span>MineBot GIG</span>
                            </div>
                        </div>
                        <div class="chat-bot" style="max-width: 100%;"><p>¿Hay algo más que te gustaría saber sobre el equipo?</p></div>
                    </div>
                </div>
                `;
                document.querySelectorAll('.chat-table-format').forEach(table => {
                    enableTableSorting(table);
                });
                document.getElementById("messages").innerHTML += msg_html;
                chatWindow.scrollTop = chatWindow.scrollHeight;
                document.getElementById("btn_mode_question").click();
                sendNotification(window.chatbot_notification_iteration_finished);
            }
        },
        error: (error) => {
            evaluate_stop_chat("stop");
            if (error.statusText != 'abort') {
                print_error_result({
                    error: error,
                    id_chat_assistant: ("chat-assistant-" + id_string)
                });
            }
        }
    });

    // Event listener for cancellation
    $('#btn-stop-chat-button').on('click', function () {
        evaluate_stop_chat("stop", id_string);
        ajaxCall.abort();
        object_phases = [];
    });
}

async function submit_question(question) {
    var message = (question).toString().trim();
    if (message.length === 0) {
        return;
    }
    const id_message_user = uuidv4();
    var dateTime = getCurrentDateTime();
    var msg_html = `<div class="block-chat-message" style="justify-content: flex-end;">
                        <div style="max-width: 65%;">
                            <div style="text-align: right;">
                                <div class="text-sm chat-question-date" title="${dateTime.full_date}" style="text-align: right;">
                                    <span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
                                </div>
                            </div>
                            <div class="chat-question">
                                <span>${message}</span>
                            </div>
                        </div>
                    </div>`;
    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("message-input").value = "";
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
        openai_object: OpenAIObject()
    });

    try {
        const controller = new AbortController();
        const signal = controller.signal;

        const response = await fetch("/chatflow/chatgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
            signal: signal,
        });

        let messages_assistant = await print_sqlphase_assistant_stream(response, message, controller);

        if (messages_assistant) {
            chat.addMessage("assistant", messages_assistant);
            content.addMessage({
                id_message: id_message_user,
                role: "assistant",
                content: messages_assistant,
                content_detail: messages_assistant,
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                detailed_date: dateTime.detailed_date,
                sql_mode: "assistant"
            });
        }

        document.getElementById("flow_clean_chat").classList.remove("disabled");

    } catch (error) {
        evaluate_stop_chat("stop");
        showAlert({
            msg: 'Fetch error, ' + error.toString(),
            type: "error"
        });
    }

}


async function question_iteration(element) {
    var message = (element.phase_prompt).toString().trim();
    if (message.length === 0) {
        return;
    }
    const id_message_user = uuidv4hex();
    var dateTime = getCurrentDateTime();
    var msg_html = `<div class="block-chat-message" style="justify-content: flex-end;">
                        <div style="max-width: 65%;">
                            <div style="text-align: right;">
                                <div class="text-sm chat-question-date" title="${dateTime.full_date}" style="text-align: right;">
                                    <span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
                                </div>
                            </div>
                            <div class="chat-question">
                                <span>${message}</span>
                            </div>
                        </div>
                    </div>`;
    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("message-input").value = "";
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
        gpt_messages: content.getHistory(),
        openai_object: OpenAIObject()
    });

    try {
        const controller = new AbortController();
        const signal = controller.signal;

        const response = await fetch("/chatflow/chatgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
            signal: signal,
        });

        let messages_assistant = await print_sqlphase_assistant_stream(response, message, controller);

        if (messages_assistant) {
            chat.addMessage("assistant", messages_assistant);
            content.addMessage({
                id_message: id_message_user,
                role: "assistant",
                question: message,
                content: messages_assistant,
                content_detail: messages_assistant,
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                detailed_date: dateTime.detailed_date,
                order_num: element["order_num"],
                sql_mode: "assistant",
                phase_model: element["list_openai_model"]
            });
        }

        if (object_phases.length > 0) {
            const element = object_phases.shift();
            if (element.chatsql_tables == "-1") {
                //question_iteration(element);
                question_iteration_v2(element);
            } else {
                phase_iteration(element);
            }
        } else {
            evaluate_stop_chat("stop");
            var msg_html = `
            <div style="display: flex; align-items: center; margin-bottom: 5px; ">
                <div style="max-width: 65%;">
                    <button id="btn-report-excel-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'excel')">
                        ${window.chatbot_generate_excel}
                    </button>
                    <button id="btn-report-word-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'word')" style="margin-left: 5px;">
                        Generate Word
                    </button>
                    <button id="btn-report-executive-${element["group_id"]}" class="btn-report" ondblclick="generate_executive('${element["group_id"]}')" style="margin-left: 5px;">
                        Executive Report
                    </button>
                    <button id="btn-show-prompts-${element["group_id"]}" class="btn-report" onclick="show_prompts('${element["group_id"]}')" style="margin-left: 5px;">
                        Logs
                    </button>
                </div>
                <div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;display: none;">
                    <input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers('${element["id_phase"]}')">
                    <label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>
                </div>
            </div>
            <span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">
            </span>
            `;
            document.getElementById("messages").innerHTML += msg_html;
            chatWindow.scrollTop = chatWindow.scrollHeight;
            sendNotification(window.chatbot_notification_iteration_finished);
        }

    } catch (error) {
        evaluate_stop_chat("stop");
        showAlert({
            msg: 'Fetch error, ' + error.toString(),
            type: "error"
        });
    }

}






















function isErrorMessage(message) {
    if (message.error) {
        const isError = (
            message["error"].includes('[error]') ||
            message["error"].startsWith('Request failed') ||
            message["error"].toLowerCase().includes('timeout') ||
            message["error"].toLowerCase().includes('failed')
        );
        return isError;
    }
    if (message.response) {
        const isError = (
            message["response"].includes('[error]') ||
            message["response"].startsWith('Request failed') ||
            message["response"].toLowerCase().includes('timeout') ||
            message["response"].toLowerCase().includes('failed')
        );
        return isError;
    }
    return false;
}


async function processInBatches(result, openai_model, sql_question_system_prompt, input_token_limit, list_openai_model, phase_id, run_id, flow_id, order_num) {
    const batchSize = 3; // Process 3 items at a time
    const totalBatches = Math.ceil(result.length / batchSize);
    const allResponses = [];
    showStaticMessage({ message: `Analyzing...` });

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = start + batchSize;
        const progress = Math.min(start + batchSize, result.length);
        const batch = result.slice(start, end);

        try {
            const batchResponses = await processBatch(
                batch,
                openai_model,
                sql_question_system_prompt,
                input_token_limit,
                list_openai_model,
                phase_id,
                run_id,
                flow_id,
                order_num
            );
            allResponses.push(...batchResponses);
            showStaticMessage({ message: `Analyzed ${progress} of ${result.length}` });
        } catch (error) {
            console.error(`Batch ${batchIndex + 1} failed:`, error);
            // Push error placeholders for failed batch
            allResponses.push(...Array(batch.length).fill("Request failed"));
        }
    }

    return allResponses; // Combined responses from all batches
}

async function processBatch(batchItems, openai_model, sql_question_system_prompt, input_token_limit, list_openai_model, phase_id, run_id, flow_id, order_num) {
    const batch = batchItems.map(element => ({
        gpt_messages: [{
            "role": element["role"],
            "content": element["content"]
        }],
        question: element["question"],
        table_title: element["table_title"],
        table_description: element["table_description"],
        phase_id: phase_id,
        run_id: run_id,
        flow_id: flow_id,
        task_id: element["task_id"],
        openai_model: openai_model,
        system_prompt: sql_question_system_prompt,
        input_token_limit: input_token_limit,
        list_openai_model: list_openai_model,
        step_num: element["step_num"],
        order_num: order_num,
        openai_object: {
            ...OpenAIObject(),
            azure_openai_stream: false,
            openai_stream: false
        }
    }));

    try {
        const response = await fetch("/chatflow/chatgpt_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batch })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Batch request failed:", error);
        return Array(batchItems.length).fill("Request failed");
    }
}


async function question_iteration_v2(element) {
    var user_message = (element.phase_prompt).toString().trim();
    var message_markdown = (element.phase_prompt).toString().trim();
    if (user_message.length === 0) {
        return;
    }
    const id_message_user = uuidv4hex();
    const equipment_parameter = element["equipment_parameter"];
    const startdate_parameter = element["startdate_parameter"];
    const enddate_parameter = element["enddate_parameter"];
    const starttime_parameter = element["starttime_parameter"];
    const endtime_parameter = element["endtime_parameter"];
    user_message = user_message.replaceAll("{{equipment}}", "<b>" + equipment_parameter + "</b>");
    user_message = user_message.replaceAll("{{startdate}}", "<b>" + startdate_parameter + "</b>");
    user_message = user_message.replaceAll("{{enddate}}", "<b>" + enddate_parameter + "</b>");
    user_message = user_message.replaceAll("{{starttime}}", "<b>" + starttime_parameter + "</b>");
    user_message = user_message.replaceAll("{{endtime}}", "<b>" + endtime_parameter + "</b>");

    let array_content_history = (content.getHistory()).filter(obj => obj.group_id === element["group_id"]);
    const array_content = array_content_history.filter(obj => obj.group_id === element["group_id"] && obj.role === 'assistant');
    let extract_table_info = "";
    if (array_content.length > 0) {
        extract_table_info = extractTableInfo(array_content);
    }
    user_message = user_message.replaceAll("{{datadictionary}}", extract_table_info);

    message_markdown = message_markdown.replaceAll("{{equipment}}", "**" + equipment_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{startdate}}", "**" + startdate_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{enddate}}", "**" + enddate_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{starttime}}", "**" + starttime_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{endtime}}", "**" + endtime_parameter + "**");
    message_markdown = message_markdown.replaceAll("{{datadictionary}}", extract_table_info);

    var dateTime = getCurrentDateTime();
    var msg_html = `<div class="block-chat-message" style="justify-content: flex-end;">
                        <div style="max-width: 65%;">
                            <div style="text-align: right;">
                                <div class="text-sm chat-question-date" title="${dateTime.full_date}" style="text-align: right;">
                                    <span><b>${window.chatbot_text_you}</b>&nbsp;|&nbsp;${dateTime.detailed_date}</span>
                                </div>
                            </div>
                            <div class="chat-question">
                                <span style="white-space: break-spaces;">${user_message}</span>
                            </div>
                        </div>
                    </div>`;
    document.getElementById("messages").innerHTML += msg_html;
    let chatWindow = document.getElementById("messages-container");
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("message-input").value = "";
    document.getElementById("button-submit").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    document.getElementById("button-submit").disabled = true;

    chat.addMessage("user", message_markdown);
    content.addMessage({
        id_message: id_message_user,
        role: "user",
        content: message_markdown,
        full_date: dateTime.full_date,
        short_time: dateTime.short_time,
        detailed_date: dateTime.detailed_date,
        sql_mode: "assistant"
    });

    const userMessage = array_content_history
        .filter(msg =>
            msg.role.toLowerCase() === 'assistant' &&
            msg.sql_mode === 'assistant'
        )

    const result = array_content_history
        .filter(msg =>
            msg.role.toLowerCase() === 'assistant' &&
            msg.sql_mode === 'database' &&
            msg.content &&
            msg.content.trim() !== ''
        )
        .map(assistantMsg => {
            return {
                role: 'user',
                question: assistantMsg.question,
                table_title: assistantMsg.table_title,
                table_description: assistantMsg.table_description,
                task_id: assistantMsg.task_id,
                step_num: assistantMsg.order_num,
                content: `${message_markdown}\n\n\`\`\`\nTable title: ${assistantMsg.table_title}\nTable title: ${assistantMsg.table_description}\n\n${assistantMsg.content}\n\`\`\``
            };
        });

    const array_responses = await processInBatches(result, element["openai_type"], element["sql_question_system_prompt"],
        element["input_token_limit"], element["list_openai_model"], element["id_phase"], element["group_id"], element["id"], element["order_num"]);
    console.log("All responses:", array_responses);
    const errorMessages = array_responses.filter(isErrorMessage);
    showStaticMessage({ toggle: "hide" });
    if (errorMessages.length > 0) {
        let errorMessagesOnly = errorMessages.map(response => response.error);
        const combinedErrorMessage = errorMessagesOnly.join('\n\n');
        showAlert({
            msg: "An analysis error has been found:\n" + combinedErrorMessage.replaceAll("[breakline]", "<br>"),
            type: "error"
        });
    }
    const filteredMessages = array_responses.filter(message => !isErrorMessage(message));
    if (filteredMessages.length == 0) {
        document.getElementById("flow_clean_chat").classList.remove("disabled");
        evaluate_stop_chat("stop");
        var msg_html = `
        <div style="display: flex; align-items: center; margin-bottom: 15px; ">
            <div style="max-width: 65%;">
                <button id="btn-report-excel-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'excel')">
                    ${window.chatbot_generate_excel}
                </button>
                <button id="btn-report-word-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'word')" style="margin-left: 5px;">
                    Generate Word
                </button>
                <button id="btn-report-executive-${element["group_id"]}" class="btn-report" ondblclick="generate_executive('${element["group_id"]}')" style="margin-left: 5px;">
                    Executive Report
                </button>
                <button id="btn-show-prompts-${element["group_id"]}" class="btn-report" onclick="show_prompts('${element["group_id"]}')" style="margin-left: 5px;">
                    Logs
                </button>
            </div>
            <div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;display: none;">
                <input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers('${element["id_phase"]}')">
                <label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>
            </div>
        </div>
        <span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">
        </span>
        div class="block-chat-message">
            <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
            <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
                <div style="padding-top: 0.5rem;margin-left: 1rem;">
                    <div class="text-sm chat-bot-date">
                        <span>MineBot GIG</span>
                    </div>
                </div>
                <div class="chat-bot" style="max-width: 100%;"><p>¿Hay algo más que te gustaría saber sobre el equipo?</p></div>
            </div>
        </div>
        `;
        document.querySelectorAll('.chat-table-format').forEach(table => {
            enableTableSorting(table);
        });
        document.getElementById("messages").innerHTML += msg_html;
        chatWindow.scrollTop = chatWindow.scrollHeight;
        document.getElementById("btn_mode_question").click();
        sendNotification(window.chatbot_notification_iteration_finished);
        return;
    }

    let final_messages = '';
    if (element["final_question_prompt"] !== "") {
        final_messages = element["final_question_prompt"];
        element["list_openai_model"] = element["final_question_model"];
    } else {
        final_messages = element["default_final_question_prompt"];
    }

    final_messages = final_messages.replaceAll("{{Pregunta}}", message_markdown);

    filteredMessages.sort((a, b) => a.order_num - b.order_num);
    for (let index = 0; index < filteredMessages.length; index++) {
        const item = filteredMessages[index];
        final_messages += `\n\n===================== Data Analysis ${index + 1} =====================\n${item["response"]}`
    }

    for (let index = 0; index < userMessage.length; index++) {
        const item = userMessage[index];
        final_messages += `\n\n===================== Previous question answered ${index + 1} =====================\n${item.content}`
    }

    messages_object = [
        { "role": "user", "content": final_messages }
    ]

    var data = JSON.stringify({
        gpt_messages: messages_object,
        list_openai_model: element["list_openai_model"],
        flow_id: element["id"],
        phase_id: element["id_phase"],
        run_id: element["group_id"],
        table_title: element["chatsql_tables"],
        openai_object: OpenAIObject()
    });

    try {
        const controller = new AbortController();
        const signal = controller.signal;

        const response = await fetch("/chatflow/chatgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
            signal: signal,
        });

        let messages_assistant = await print_sqlphase_assistant_stream(response, user_message, controller);

        if (messages_assistant) {
            chat.addMessage("assistant", messages_assistant);
            content.addMessage({
                id_message: id_message_user,
                order_num: element["order_num"],
                group_id: element["group_id"],
                role: "assistant",
                sql_mode: "assistant",
                content: messages_assistant,
                sql_query_markdown: "",
                usage_summary_markdown: "",
                table_result: [],
                question: message_markdown,
                full_date: dateTime.full_date,
                short_time: dateTime.short_time,
                detailed_date: dateTime.detailed_date,
                table_title: element["chatsql_tables"],
                table_description: "",
                phase_model: element["list_openai_model"]
            });
        }

        if (object_phases.length > 0) {
            const element = object_phases.shift();
            if (element.chatsql_tables == "-1") {
                //question_iteration(element);
                question_iteration_v2(element);
            } else {
                phase_iteration(element);
            }
        } else {
            document.getElementById("flow_clean_chat").classList.remove("disabled");
            evaluate_stop_chat("stop");
            var msg_html = `
            <div style="display: flex; align-items: center; margin-bottom: 15px; ">
                <div style="max-width: 65%;">
                    <button id="btn-report-excel-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'excel')">
                        ${window.chatbot_generate_excel}
                    </button>
                    <button id="btn-report-word-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'word')" style="margin-left: 5px;">
                        Generate Word
                    </button>
                    <button id="btn-report-executive-${element["group_id"]}" class="btn-report" ondblclick="generate_executive('${element["group_id"]}')" style="margin-left: 5px;">
                        Executive Report
                    </button>
                    <button id="btn-show-prompts-${element["group_id"]}" class="btn-report" onclick="show_prompts('${element["group_id"]}')" style="margin-left: 5px;">
                        Logs
                    </button>
                </div>
                <div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;display: none;">
                    <input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers('${element["id_phase"]}')">
                    <label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>
                </div>
            </div>
            <span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">
            </span>
            <div class="block-chat-message">
                <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
                <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
                    <div style="padding-top: 0.5rem;margin-left: 1rem;">
                        <div class="text-sm chat-bot-date">
                            <span>MineBot GIG</span>
                        </div>
                    </div>
                    <div class="chat-bot" style="max-width: 100%;"><p>¿Hay algo más que te gustaría saber sobre el equipo?</p></div>
                </div>
            </div>
            `;
            document.getElementById("messages").innerHTML += msg_html;
            chatWindow.scrollTop = chatWindow.scrollHeight;
            document.getElementById("btn_mode_question").click();
            sendNotification(window.chatbot_notification_iteration_finished);
            document.querySelectorAll('.chat-table-format').forEach(table => {
                enableTableSorting(table);
            });
        }

    } catch (error) {
        evaluate_stop_chat("stop");
        var msg_html = `
        <div style="display: flex; align-items: center; margin-bottom: 15px; ">
            <div style="max-width: 65%;">
                <button id="btn-report-excel-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'excel')">
                    ${window.chatbot_generate_excel}
                </button>
                <button id="btn-report-word-${element["group_id"]}" class="btn-report" ondblclick="generate_report('${element["group_id"]}', 'word')" style="margin-left: 5px;">
                    Generate Word
                </button>
                <button id="btn-report-executive-${element["group_id"]}" class="btn-report" ondblclick="generate_executive('${element["group_id"]}')" style="margin-left: 5px;">
                    Executive Report
                </button>
                <button id="btn-show-prompts-${element["group_id"]}" class="btn-report" onclick="show_prompts('${element["group_id"]}')" style="margin-left: 5px;">
                    Logs
                </button>
            </div>
            <div class="chat-assistant-role-save" style="display: flex;color: black;margin: 0px 10px;display: none;">
                <input type="checkbox" id="input-assistant-save-all" style="margin: 0px 2px;" onchange="save_assistant_all_answers('${element["id_phase"]}')">
                <label id="chat-assistant-save-all-label" style="vertical-align: top;margin-bottom: 0px;font-weight: normal;">Save all responses</label>
            </div>
        </div>
        <span id="report-progress-text" style="color: black;display: inline-flex;align-items: center;font-size: 11px;">
        </span>
        <div class="block-chat-message">
            <img src="../static/dist/img/v8/Picture_2.jpeg" alt="bot" style="width: 25px;">
            <div style="max-width: 75%;display: flex;flex-direction: column;align-items: flex-start;">
                <div style="padding-top: 0.5rem;margin-left: 1rem;">
                    <div class="text-sm chat-bot-date">
                        <span>MineBot GIG</span>
                    </div>
                </div>
                <div class="chat-bot" style="max-width: 100%;"><p>¿Hay algo más que te gustaría saber sobre el equipo?</p></div>
            </div>
        </div>
        `;
        document.querySelectorAll('.chat-table-format').forEach(table => {
            enableTableSorting(table);
        });
        document.getElementById("messages").innerHTML += msg_html;
        document.getElementById("btn_mode_question").click();
        chatWindow.scrollTop = chatWindow.scrollHeight;
        showAlert({
            msg: 'Fetch error, ' + error.toString(),
            type: "error"
        });
    }

}






















function openSqlSystemPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    var data = JSON.stringify({
        id_phase: id_phase
    });
    $.ajax({
        url: '/chatflow/EditSqlSystemPrompt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            if (result.length > 0) {
                document.getElementById("flow_sql_system_prompt_input").value = result[0].sql_system_prompt;
                $("#flow_sql_system_prompt_input").scrollTop(0);
                $("#flow_sql_system_prompt_modal").modal('show');
            }
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            object.innerHTML = 'Sql System Prompt';
            object.disabled = false;
        }
    });
}

function saveSqlSystemPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    const sql_system_prompt = document.getElementById("flow_sql_system_prompt_input").value;
    var data = JSON.stringify({
        id_phase: id_phase,
        sql_system_prompt: sql_system_prompt
    });
    $.ajax({
        url: '/chatflow/SaveSqlSystemPrompt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            object.innerHTML = "Saved.";
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            setTimeout(function () {
                object.innerHTML = 'Save';
                object.disabled = false;
            }, 2500);
            $("#flow_sql_system_prompt_modal").modal('hide');
        }
    });
}


function openQuestionSystemPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    var data = JSON.stringify({
        id_phase: id_phase
    });
    $.ajax({
        url: '/chatflow/EditQuestionSystemPrompt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            if (result.length > 0) {
                document.getElementById("flow_question_system_prompt_input").value = result[0].sql_question_system_prompt;
                $("#flow_question_system_prompt_input").scrollTop(0);
                $("#flow_question_system_prompt_modal").modal('show');
            }
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            object.innerHTML = 'Sql Question System';
            object.disabled = false;
        }
    });
}

function saveQuestionSystemPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    const question_system_prompt = document.getElementById("flow_question_system_prompt_input").value;
    var data = JSON.stringify({
        id_phase: id_phase,
        question_system_prompt: question_system_prompt
    });
    $.ajax({
        url: '/chatflow/SaveQuestionSystemPrompt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            object.innerHTML = "Saved.";
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            setTimeout(function () {
                object.innerHTML = 'Save';
                object.disabled = false;
            }, 2500);
            $("#flow_question_system_prompt_modal").modal('hide');
        }
    });
}





function openCommentPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    var data = JSON.stringify({
        id_phase: id_phase
    });
    $.ajax({
        url: '/chatflow/GetCommentPhase',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            if (result.length > 0) {
                document.getElementById("flow_comment_phase_input").value = result[0].comments;

                $("#flow_comment_phase_input").scrollTop(0);
                $("#flow_update_comment_prompt_modal").modal('show');
            }
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            object.innerHTML = '<i class="fa fa-fw fa-sticky-note-o"></i>';
            object.disabled = false;
        }
    });
}




function openFinalQuestionPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    var data = JSON.stringify({
        id_phase: id_phase
    });
    $.ajax({
        url: '/chatflow/EditFinalQuestionPrompt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            if (result.length > 0) {
                document.getElementById("flow_final_question_prompt_input").value = result[0].final_question_prompt;
                if (result[0].final_question_model) {
                    document.getElementById("flow_final_question_model_select").value = result[0].final_question_model;
                } else {
                    document.getElementById("flow_final_question_model_select").value = "gpt-4o";
                }

                $("#flow_final_question_prompt_input").scrollTop(0);
                $("#flow_final_question_prompt_modal").modal('show');
            }
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            object.innerHTML = 'Final Question';
            object.disabled = false;
        }
    });
}


function saveCommentPhase(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    const comment_phase_input = document.getElementById("flow_comment_phase_input").value;
    var data = JSON.stringify({
        id_phase: id_phase,
        comment_phase_input: comment_phase_input
    });
    $.ajax({
        url: '/chatflow/SaveCommentPhase',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            object.innerHTML = "Saved";
            refresh_sql_phase_name(1);
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            setTimeout(function () {
                object.innerHTML = 'Save';
                object.disabled = false;
            }, 2500);
            $("#flow_update_comment_prompt_modal").modal('hide');
        }
    });
}





function saveFinalQuestionPrompt(object) {
    object.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
    object.disabled = true;
    const id_phase = document.getElementById("select_phase_name").value;
    const final_question_prompt = document.getElementById("flow_final_question_prompt_input").value;
    const final_question_model = document.getElementById("flow_final_question_model_select").value;
    var data = JSON.stringify({
        id_phase: id_phase,
        final_question_prompt: final_question_prompt,
        final_question_model: final_question_model
    });
    $.ajax({
        url: '/chatflow/SaveFinalQuestionPrompt',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            object.innerHTML = "Saved.";
        },
        error: (error) => {
            showAlert(error.toString());
            return;
        },
        complete: () => {
            setTimeout(function () {
                object.innerHTML = 'Save';
                object.disabled = false;
            }, 2500);
            $("#flow_final_question_prompt_modal").modal('hide');
        }
    });
}




















function save_assistant_answer(uid_phase) {
    var phase_checked = document.getElementById("chat-assistant-foot-input-" + uid_phase).checked ? 1 : 0;
    // Prepare data for POST request
    var postData = JSON.stringify({
        uid_phase: uid_phase,
        phase_checked: phase_checked
    });
    document.getElementById("chat-assistant-foot-label-" + uid_phase).innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("chat-assistant-foot-input-" + uid_phase).disabled = true;
    $.ajax({
        url: '/chatflow/SavePhaseResponse',
        data: postData,
        contentType: 'application/json',
        method: 'POST',
        success: (result) => {

            if (result.code_error) {
                document.getElementById("chat-assistant-foot-label-" + uid_phase).innerHTML = window.chatbot_save_response_button;
                document.getElementById("chat-assistant-foot-input-" + uid_phase).disabled = false;
                showAlert({
                    msg: result.code_error,
                    type: "error"
                });
                return;
            }

            document.getElementById("chat-assistant-foot-label-" + uid_phase).innerHTML = window.chatbot_changes_saved_button;

            setTimeout(function () {
                document.getElementById("chat-assistant-foot-label-" + uid_phase).innerHTML = window.chatbot_save_response_button;
                document.getElementById("chat-assistant-foot-input-" + uid_phase).disabled = false;
            }, 2500);

        },
        error: (error) => {
            document.getElementById("chat-assistant-foot-label-" + uid_phase).innerHTML = window.chatbot_save_response_button;
            document.getElementById("chat-assistant-foot-input-" + uid_phase).disabled = false;
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

function save_assistant_all_answers(uid_group) {
    var group_checked = document.getElementById("input-assistant-save-all").checked ? 1 : 0;
    // Prepare data for POST request
    var postData = JSON.stringify({
        uid_group: uid_group,
        group_checked: group_checked
    });

    document.getElementById("chat-assistant-save-all-label").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("input-assistant-save-all").disabled = true;

    $.ajax({
        url: '/chatflow/SavePhaseAllResponses',
        data: postData,
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

            document.getElementById("chat-assistant-save-all-label").innerHTML = window.chatbot_changes_saved_button;

            var save_inputs = document.querySelectorAll('[id^="chat-assistant-foot-input-"]');

            if (save_inputs.length > 0) {
                for (let index = 0; index < save_inputs.length; index++) {
                    const element = save_inputs[index];
                    element.checked = (group_checked == 1 ? true : false);
                }
            }

            setTimeout(function () {
                document.getElementById("chat-assistant-save-all-label").innerHTML = window.chatbot_save_all_responses_checkbox;
                document.getElementById("input-assistant-save-all").disabled = false;
            }, 2500);

        },
        error: (error) => {
            console.log(error.toString());
            showAlert({
                msg: error.toString(),
                type: "error"
            });
        }
    })
}

//#endregion


//#region Setting Modal

function save_main_changes() {
    var system_prompt = document.getElementById('flow_system_prompt').value;
    var language_report = document.getElementById('flow_language_report').value;
    var after_question_prompt = document.getElementById('after_question_prompt').value;
    var data = JSON.stringify({
        system_prompt: system_prompt,
        language_report: language_report,
        after_question: after_question_prompt
    });
    document.getElementById("button_save_main_changes").innerHTML = '<i class="fa fa-refresh fa-spin"></i>';
    document.getElementById("button_save_main_changes").disabled = true;
    $.ajax({
        url: "/chatflow/SaveMainSetting",
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
        url: '/chatflow/SaveOpenAISetting',
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

//#endregion

//#region chat file downloader
function generate_report(id_report, type_document) {
    if (id_report != "" && type_document == "excel") {
        var data = JSON.stringify({
            id_report: id_report
        });
        if (document.getElementById("btn-report-excel-" + id_report)) {
            document.getElementById("btn-report-excel-" + id_report).innerHTML = '<i class="fa fa-refresh fa-spin"></i> ' + window.chatbot_generating;
            document.getElementById("btn-report-excel-" + id_report).disabled = true;
        }
        $.ajax({
            url: "/chatflow/GenerateExcel",
            data: data,
            contentType: 'application/json',
            method: 'POST',
            success: (result) => {
                if (result.code_error) {
                    if (document.getElementById("btn-report-excel-" + id_report)) {
                        document.getElementById("btn-report-excel-" + id_report).innerHTML = window.chatbot_generate_excel;
                        document.getElementById("btn-report-excel-" + id_report).disabled = false;
                    }
                    showAlert({
                        msg: result.code_error,
                        type: "error"
                    });
                    return;
                }
                try {
                    if (result.length > 0) {
                        const wb = XLSX.utils.book_new();
                        const excel_full_name = result[0].excel_name;
                        for (let index = 0; index < result.length; index++) {
                            const table_result = JSON.parse(result[index].json_data_table);
                            // 1. Manually construct the worksheet with title, empty row, headers, and data
                            const ws_data = [
                                ["Table Title: " + result[index].table_name],
                                ["Description: " + result[index].table_description],
                                //["Question: " + result[index].question],
                                [],
                                Object.keys(table_result[0]),
                                ...table_result.map(row => Object.values(row))
                            ];

                            // Add data_1 to the first sheet
                            const ws1 = XLSX.utils.aoa_to_sheet(ws_data);
                            const sheet_name = (result[index].sheet_name).toString();
                            //const sheet_name = (index + 1).toString() + ' ' + result[index].table_name;
                            XLSX.utils.book_append_sheet(wb, ws1, sheet_name);
                        }
                        // Generate and download the Excel file
                        XLSX.writeFile(wb, excel_full_name);
                    }
                    if (document.getElementById("btn-report-excel-" + id_report)) {
                        document.getElementById("btn-report-excel-" + id_report).innerHTML = window.chatbot_generate_excel;
                        document.getElementById("btn-report-excel-" + id_report).disabled = false;
                    }
                } catch (error) {
                    if (document.getElementById("btn-report-excel-" + id_report)) {
                        document.getElementById("btn-report-excel-" + id_report).innerHTML = window.chatbot_generate_excel;
                        document.getElementById("btn-report-excel-" + id_report).disabled = false;
                    }
                    console.log(error.toString());
                    showAlert({
                        msg: error.toString(),
                        type: "error"
                    });
                }
            },
            error: (error) => {
                if (document.getElementById("btn-report-excel-" + id_report)) {
                    document.getElementById("btn-report-excel-" + id_report).innerHTML = window.chatbot_generate_excel;
                    document.getElementById("btn-report-excel-" + id_report).disabled = false;
                }
                // Try to print useful information from the error object
                let errorMessage = "An error occurred";
                if (error.status) {
                    errorMessage += ` (Status: ${error.status} ${error.statusText})`;
                }

                if (error.responseText) {
                    errorMessage += `: ${error.responseText}`;
                }

                console.error("Error details:", JSON.stringify(error, null, 2)); // For detailed debug info
                console.log("Error Message:", errorMessage);
                showAlert({
                    msg: errorMessage,
                    type: "error"
                });
            }
        });
    }

    if (id_report != "" && type_document == "word") {
        var data = JSON.stringify({
            id_report: id_report
        });
        if (document.getElementById("btn-report-word-" + id_report)) {
            document.getElementById("btn-report-word-" + id_report).innerHTML = '<i class="fa fa-refresh fa-spin"></i> ' + window.chatbot_generating;
            document.getElementById("btn-report-word-" + id_report).disabled = true;
        }

        $.ajax({
            url: "/chatflow/GenerateWord",
            data: data,
            contentType: 'application/json',
            method: 'POST',
            success: (result) => {
                if (result.code_error) {
                    if (document.getElementById("btn-report-word-" + id_report)) {
                        document.getElementById("btn-report-word-" + id_report).innerHTML = "Generate Word";
                        document.getElementById("btn-report-word-" + id_report).disabled = false;
                    }
                    showAlert({
                        msg: result.code_error,
                        type: "error"
                    });
                    return;
                }
                try {
                    if (result.length > 0) {
                        generate_doc_conversation(result, id_report);
                    }
                    if (document.getElementById("btn-report-word-" + id_report)) {
                        document.getElementById("btn-report-word-" + id_report).innerHTML = "Generate Word";
                        document.getElementById("btn-report-word-" + id_report).disabled = false;
                    }
                } catch (error) {
                    if (document.getElementById("btn-report-word-" + id_report)) {
                        document.getElementById("btn-report-word-" + id_report).innerHTML = "Generate Word";
                        document.getElementById("btn-report-word-" + id_report).disabled = false;
                    }
                    console.log(error.toString());
                    showAlert({
                        msg: error.toString(),
                        type: "error"
                    });
                }
            },
            error: (error) => {
                if (document.getElementById("btn-report-word-" + id_report)) {
                    document.getElementById("btn-report-word-" + id_report).innerHTML = "Generate Word";
                    document.getElementById("btn-report-word-" + id_report).disabled = false;
                }
                // Try to print useful information from the error object
                let errorMessage = "An error occurred";
                if (error.status) {
                    errorMessage += ` (Status: ${error.status} ${error.statusText})`;
                }

                if (error.responseText) {
                    errorMessage += `: ${error.responseText}`;
                }

                console.error("Error details:", JSON.stringify(error, null, 2)); // For detailed debug info
                console.log("Error Message:", errorMessage);
                showAlert({
                    msg: errorMessage,
                    type: "error"
                });
            }
        });
    }
}




async function generate_executive(id_report) {
    if (document.getElementById("btn-report-executive-" + id_report)) {
        document.getElementById("btn-report-executive-" + id_report).innerHTML = '<i class="fa fa-refresh fa-spin"></i> ' + window.chatbot_generating;
        document.getElementById("btn-report-executive-" + id_report).disabled = true;
    }
    var date_now = new Date();
    var full_date = [
        date_now.getFullYear(),
        ("0" + (date_now.getMonth() + 1)).slice(-2),
        ("0" + date_now.getDate()).slice(-2)
    ].join('');
    var time_now = [
        ("0" + date_now.getHours()).slice(-2),
        ("0" + date_now.getMinutes()).slice(-2),
        ("0" + date_now.getSeconds()).slice(-2)
    ].join('');
    var full_date_time = full_date + '_' + time_now;
    var document_name = full_date_time + "_" + id_report;

    const formData = new FormData();
    formData.append('id_report', id_report);
    
    const resp = await fetch('/chatflow/GenerateExecutive', {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      alert('Error generating document: ' + resp.statusText);
      return;
    }

    const blob = await resp.blob();
    // Build a filename from response headers or fallback
    const suggestedName = document_name + '.docx';
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(link.href);
    if (document.getElementById("btn-report-executive-" + id_report)) {
        document.getElementById("btn-report-executive-" + id_report).innerHTML = 'Executive Report';
        document.getElementById("btn-report-executive-" + id_report).disabled = false;
    }

}





function generate_doc_conversation(conversation, id_report) {
    var date_now = new Date();
    var full_date = [
        date_now.getFullYear(),
        ("0" + (date_now.getMonth() + 1)).slice(-2),
        ("0" + date_now.getDate()).slice(-2)
    ].join('');
    var time_now = [
        ("0" + date_now.getHours()).slice(-2),
        ("0" + date_now.getMinutes()).slice(-2),
        ("0" + date_now.getSeconds()).slice(-2)
    ].join('');
    var full_date_time = full_date + '_' + time_now;
    var document_name = full_date_time + "_" + id_report;

    var full_html_report = "";

    for (let index = 0; index < conversation.length; index++) {
        const text = conversation[index]["conversation"];
        if (conversation[index]["step_num"] == 0) {
            const inputValue = document.getElementById("input_doc_title").value.trim();
            const report_title = inputValue ? inputValue : "Reporte Técnico";
            full_html_report += `<h1>${report_title}</h1>`;
        } else {
            const match = text.match(/Hoja:\s*([^\n]+)/);
            if (match) {
                const fullTitle = (match[1].trim()).replaceAll("**", "");
                full_html_report += `<h1>${conversation[index]["step_num"]}. ${fullTitle}</h1>`;
            } else {
                full_html_report += `<h1>${conversation[index]["step_num"]}. Análisis</h1>`;
            }
        }
        const cleaned_response = onlyFixSpecificIssues(text);
        full_html_report += safeMarkdownRender(cleaned_response);
        full_html_report += `<br style="page-break-after: always; clear:both;"></br>`;
    }

    full_html_report = full_html_report.replace(/<table>/g, '<table style="width: 100%;">');
    full_html_report = full_html_report.replace(/<thead>/g, '<thead style="background-color: #000000;color: white;">');
    full_html_report = full_html_report.replace(/<th>/g, '<th style="padding: 3px;">');
    full_html_report = full_html_report.replace(/<td>/g, '<td style="padding: 3px;">');

    var html_result = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            body {
                font-family: "Inter", "Calibri", Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.25;
                color: #111;
            }
            h1, h2, h3 {
                font-family: "Arial", sans-serif;
            }
            table {
                border-collapse: collapse;
                margin-bottom: 5px;
            }
            th, td {
                border: 1px solid black;
            }
        </style>
    </head>
    <body>
        ${full_html_report}
    </body>
    </html>`;
    convert_to_word(html_result, document_name + ".docx");

    if (document.getElementById("btn-report-word-" + id_report)) {
        document.getElementById("btn-report-word-" + id_report).disabled = false;
        document.getElementById("btn-report-word-" + id_report).innerHTML = 'Generate Word';
    }

}


function convert_to_word(content, document_name) {
    var converted = htmlDocx.asBlob(content);
    saveAs(converted, document_name);
}



















//#endregion


function clean_chat() {
    var icon = document.getElementById('refresh_icon');
    icon.classList.add('fa-spin'); // Add the fa-spin class
    setTimeout(function () {
        icon.classList.remove('fa-spin'); // Remove the fa-spin class after 1 second
    }, 1000);
    setTimeout(function () {
        document.getElementById("messages").innerHTML = "";
        document.getElementById("chronometer").innerHTML = "";

        //document.querySelector("#sql_chat_type").selectedIndex = 0;
        //updateCookie('chatsql_chat_type', document.getElementById("sql_chat_type").value);
        document.getElementById("btn_mode_flujo").click();
        updateCookie('chatflow_chat_type', 'Flow');
        document.getElementById("goto-bottom").style.display = "none";

        chat.clearHistory();
        content.clearHistory();
        evaluate_stop_chat("stop");
    }, 250);
}


function truncateString(str) {
    const maxLength = 25;
    // Check if the string is longer than the maximum length
    if (str.length > maxLength) {
        return str.slice(0, maxLength) + "...";
    }
    // Return the original string if it's shorter than or equal to maxLength
    return str;
}






function show_prompts(group_id) {
    var data = JSON.stringify({
        group_id: group_id
    });
    if (document.getElementById("btn-show-prompts-" + group_id)) {
        //document.getElementById("before_load").style.display = "block";
        document.getElementById("btn-show-prompts-" + group_id).innerHTML = 'Opening...';
        document.getElementById("btn-show-prompts-" + group_id).disabled = true;
    }

    $.ajax({
        url: '/chatflow/GetHistoryChat',
        data: data,
        contentType: 'application/json',
        method: 'POST',
        //timeout: 60000, // sets timeout to 60 seconds
        success: (result) => {
            if (result.code_error) {
                showAlert(result.code_error);
                return;
            }
            data_conversation = result.data_conversation;
            step_analysis = result.step_analysis;
            data_error = result.data_error;
            if (data_conversation.length > 0) {
                const sectionPrompts = document.getElementById('section-prompts');
                sectionPrompts.innerHTML = ''; // Clear previous content

                // Iterate through conversations and build HTML
                let totalTokens = 0;
                let totalUserTokens = 0;
                let totalAssistantTokens = 0;
                let htmlContent = '';
                data_conversation.forEach((message, index) => {
                    const messageClass = message.type_conversation === 'Question' ? 'prompt-user-message' : 'prompt-assistant-message';
                    const createdAt = new Date(message.created_at).toLocaleString();
                    // Accumulate the total cost
                    if (message.NumTokens) {
                        totalTokens += parseFloat(message.NumTokens);
                    }
                    if (message.NumTokens && message.type_conversation == "Question") {
                        totalUserTokens += parseFloat(message.NumTokens);
                    }
                    if (message.NumTokens && message.type_conversation == "Answer") {
                        totalAssistantTokens += parseFloat(message.NumTokens);
                    }

                    htmlContent += `
                        <div class="prompt-conversation-item ${messageClass} mb-3 p-3 rounded">
                            <div class="d-flex justify-content-between">
                                <small>${message.type_conversation}</small> | 
                                <small>${createdAt}</small>
                            </div>
                            <textarea class="form-control prompt-message-content" rows="7" data-index="${index}">${message.conversation}</textarea>
                            ${message.NumTokens ? `<div class="text-end"><small>Tokens: ${parseFloat(message.NumTokens)}</small></div>` : ''}
                        </div>
                    `;
                });
                sectionPrompts.innerHTML = htmlContent;
                sectionPrompts.innerHTML += `
                    <div class="prompt-total-result">
                        <span><b>Total Question Tokens:</b> ${parseFloat(totalUserTokens)}</span>
                        <span><b>Total Answer Tokens:</b> ${parseFloat(totalAssistantTokens)}</span>
                        <span><b>Total Tokens:</b> ${parseFloat(totalTokens)}</span>
                    </div>
                `;

            }

            if (step_analysis.length > 0) {
                const stepAnalysis = document.getElementById('step-analysis');
                stepAnalysis.innerHTML = ''; // Clear previous content

                // Group conversations by order_num
                const groupedByOrder = step_analysis.reduce((acc, message) => {
                    if (!acc[message.order_num]) {
                        acc[message.order_num] = [];
                    }
                    acc[message.order_num].push(message);
                    return acc;
                }, {});

                // Iterate through each order group
                let totalTokens = 0;
                let totalUserTokens = 0;
                let totalAssistantTokens = 0;
                let htmlContent = '';

                // Sort order numbers and process each group
                Object.keys(groupedByOrder).sort((a, b) => a - b).forEach(orderNum => {
                    const messages = groupedByOrder[orderNum];

                    // Add HR and order number header (except before first group)
                    htmlContent += `
                        <div class="hr-with-text">
                            <div></div>
                            <span class="hr-text">Record Num: ${orderNum}</span>
                            <div></div>
                        </div>
                    `;

                    // Process each message in this order group
                    messages.forEach((message, index) => {
                        const messageClass = message.type_conversation === 'Question' ? 'prompt-user-message' : 'prompt-assistant-message';
                        const createdAt = new Date(message.created_at).toLocaleString();

                        // Accumulate the total cost
                        if (message.NumTokens) {
                            totalTokens += parseFloat(message.NumTokens);
                        }
                        if (message.NumTokens && message.type_conversation == "Question") {
                            totalUserTokens += parseFloat(message.NumTokens);
                        }
                        if (message.NumTokens && message.type_conversation == "Answer") {
                            totalAssistantTokens += parseFloat(message.NumTokens);
                        }

                        htmlContent += `
                            <div class="prompt-conversation-item ${messageClass} mb-3 p-3 rounded">
                                <div class="d-flex justify-content-between">
                                    <small>Step ${message.step_num} | ${message.type_conversation} - ${message.Process}</small> | 
                                    <small>${createdAt}</small>
                                </div>
                                <textarea class="form-control prompt-message-content" rows="7" data-index="${index}">${message.conversation}</textarea>
                                ${message.NumTokens ? `<div class="text-end"><small>Tokens: ${parseFloat(message.NumTokens)}</small></div>` : ''}
                            </div>
                        `;
                    });
                });

                stepAnalysis.innerHTML = htmlContent;
                stepAnalysis.innerHTML += `
                    <div class="prompt-total-result mt-4">
                        <span><b>Total Question Tokens:</b> ${parseFloat(totalUserTokens)}</span>
                        <span><b>Total Answer Tokens:</b> ${parseFloat(totalAssistantTokens)}</span>
                        <span><b>Total Tokens:</b> ${parseFloat(totalTokens)}</span>
                    </div>
                `;
            }

            if (data_error.length > 0) {
                const container = document.getElementById('error-logs');
                container.innerHTML = '';

                data_error.forEach(log => {
                    const card = document.createElement('div');
                    card.className = 'error-card';

                    card.innerHTML = `
                        <div class="error-card-header">
                            <div class="error-card-title">
                                Execution: ${log.chat_option.toLowerCase().includes('sql') ? 'Sql' : 'Question'} | 
                                Table: <b>${log.table_title}</b> | Input message: 
                                <span class="input-error-card-title">${truncate((log.input_message || 'Uncategorized Error').trim(), 100)}</span>
                            </div>
                            <div class="error-card-meta">
                                <span>[${new Date(log.created_at).toLocaleString()}]</span>
                            </div>
                        </div>
                        <div class="error-card-body" style="display: none;">
                            <div class="error-detail">
                                <span class="detail-label">Model:</span>
                                ${log.openai_type} | ${log.openai_model || 'N/A'}
                            </div>
                            <div class="error-detail">
                                <span class="detail-label">Input:</span>
                                <div class="input-message">
                                    <textarea name="input-error-message" class="form-control" style="width: 100%;" rows="10">${log.input_message || 'None'}</textarea>
                                </div>
                            </div>
                            <div class="error-detail">
                                <span class="detail-label">Error:</span>
                                <div class="error-message">
                                    <textarea name="output-error-message" class="form-control" style="width: 100%;" rows="10">${log.error_message || 'None'}</textarea>
                                </div>
                            </div>
                        </div>
                        `;

                    // Add click event to the header to toggle the body
                    const header = card.querySelector('.error-card-header');
                    header.style.cursor = 'pointer'; // Change cursor to indicate it's clickable
                    header.addEventListener('click', () => {
                        const body = card.querySelector('.error-card-body');
                        body.style.display = body.style.display === 'none' ? 'block' : 'none';
                    });

                    container.appendChild(card);
                });
            }

            $('#document_show_prompts_modal').modal('toggle');
        },
        error: (error) => {
            console.log(error);
            showAlert(error);
        },
        complete: () => {
            if (document.getElementById("btn-show-prompts-" + group_id)) {
                document.getElementById("btn-show-prompts-" + group_id).innerHTML = 'Logs';
                document.getElementById("btn-show-prompts-" + group_id).disabled = false;
            }
        }
    });
}
function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}



