

//#region ChatSql
function chatsql_main_features() {
    const section_navbar_sqltables = document.querySelector("#section_navbar_sqltables");
    const section_navbar_setting = document.querySelector("#section_navbar_setting");
    const messages_block = document.querySelector(".messages-block");
    const config_messages_1 = document.querySelector(".config-messages > div:nth-child(1)");
    const config_messages_2 = document.querySelector(".config-messages > div:nth-child(2)");
    const message_form = document.querySelector("#message-form");
    const thought_section = document.querySelector("#thought-section");

    let steps = [];
    if (section_navbar_sqltables) {
        steps.push({
            element: section_navbar_sqltables,
            title: window.chatsql_database_feature_navbar_database_title,
            intro: window.chatsql_database_feature_navbar_database_intro,
            position: "bottom"
        });
    }
    if (section_navbar_setting) {
        steps.push({
            element: section_navbar_setting,
            title: window.chatsql_database_feature_navbar_setting_title,
            intro: window.chatsql_database_feature_navbar_setting_intro,
            position: "bottom"
        });
    }
    if (messages_block) {
        steps.push({
            element: messages_block,
            title: window.chatsql_database_feature_engage_chat_title,
            intro: window.chatsql_database_feature_block_message_intro,
            position: "bottom"
        });
    }
    if (config_messages_1) {
        steps.push({
            element: config_messages_1,
            title: window.chatsql_database_feature_identify_tabs_title,
            intro: window.chatsql_database_feature_identify_tabs_intro,
            position: "bottom"
        });
    }
    if (config_messages_2) {
        steps.push({
            element: config_messages_2,
            title: window.chatsql_database_feature_show_refresh_title,
            intro: window.chatsql_database_feature_show_refresh_intro,
            position: "bottom"
        });
    }
    if (message_form) {
        steps.push({
            element: message_form,
            title: window.chatsql_database_feature_engage_chat_title,
            intro: window.chatsql_database_feature_input_message_intro,
            position: "bottom"
        });
    }
    if (thought_section) {
        steps.push({
            element: thought_section,
            title: window.chatsql_database_feature_questions_history_title,
            intro: window.chatsql_database_feature_questions_history_intro,
            position: "bottom"
        });
    }

    if (steps.length > 0) {
        const tour = introJs();
        tour.setOptions({
            steps: steps,
            showProgress: false,
            showBullets: true,
            showButtons: true,
            nextLabel: window.chatbot_next,
            prevLabel: window.chatbot_back,
            doneLabel: window.chatbot_finish
        });

        tour.start();
    }
}

//#endregion



//#region ChatFlow
function chatflow_workflow_features() {
    const block_phase_category = document.querySelector("#block_phase_category");
    const block_phase_name = document.querySelector("#block_phase_name");
    const block_parameters = document.querySelector("#block_parameters");
    const section_phase_table = document.querySelector("#section_phase_table");
    const btn_add_row_below = document.querySelector("#btn_add_row_below");
    const btn_load_phases_table = document.querySelector("#btn_load_phases_table");
    const button_save_phases = document.querySelector("#button_save_phases");

    let steps = [];
    if (block_phase_category) {
        steps.push({
            element: block_phase_category,
            title: window.chatflow_flow_feature_phase_group_title,
            intro: window.chatflow_flow_feature_group_category_intro,
            position: "bottom"
        });
    }
    if (block_phase_name) {
        steps.push({
            element: block_phase_name,
            title: window.chatflow_flow_feature_phase_group_title,
            intro: window.chatflow_flow_feature_phase_name_intro,
            position: "bottom"
        });
    }
    if (block_parameters) {
        steps.push({
            element: block_parameters,
            title: window.chatflow_flow_feature_parameters_title,
            intro: window.chatflow_flow_feature_parameters_intro,
            position: "bottom"
        });
    }
    if (section_phase_table) {
        steps.push({
            element: section_phase_table,
            title: window.chatflow_flow_feature_phase_table_title,
            intro: window.chatflow_flow_feature_phase_table_intro,
            position: "bottom"
        });
    }
    if (btn_add_row_below) {
        steps.push({
            element: btn_add_row_below,
            title: window.chatflow_flow_feature_add_row_title,
            intro: window.chatflow_flow_feature_add_row_intro,
            position: "bottom"
        });
    }
    if (btn_load_phases_table) {
        steps.push({
            element: btn_load_phases_table,
            title: window.chatflow_flow_feature_load_table_title,
            intro: window.chatflow_flow_feature_load_table_intro,
            position: "bottom"
        });
    }
    if (button_save_phases) {
        steps.push({
            element: button_save_phases,
            title: window.chatflow_flow_feature_save_phases_title,
            intro: window.chatflow_flow_feature_save_phases_intro,
            position: "bottom"
        });
    }

    if (steps.length > 0) {
        const tour = introJs();
        tour.setOptions({
            steps: steps,
            showProgress: false,
            showBullets: true,
            showButtons: true,
            nextLabel: window.chatbot_next,
            prevLabel: window.chatbot_back,
            doneLabel: window.chatbot_finish
        });

        tour.start();
    }
}

//#endregion

