function setCookie(name, value, days = 7) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
function updateCookie(current_object, current_value) {
    setCookie(current_object, current_value, 7);
}
function checkCookieInput(current_object, cookie_name, current_value) {
    if (getCookie(cookie_name)) {
        var current_coockie = getCookie(cookie_name);
        document.getElementById(current_object).value = current_coockie;
    } else {
        setCookie(cookie_name, current_value, 7);
    }
}
function checkCookieSelect(current_object, cookie_name) {
    if (getCookie(cookie_name)) {
        // Get current cookie value
        var current_cookie = getCookie(cookie_name);
        // Find the select element
        var selectElement = document.getElementById(current_object);
        // Check if the cookie value is in the select options
        var optionExists = Array.from(selectElement.options).some(option => option.value === current_cookie);
        // Set the select value based on the cookie or default to "-"
        if (optionExists) {
            selectElement.value = current_cookie;
        } else {
            selectElement.value = "-"; // Default option if cookie value doesn't match
        }
        $('#' + current_object).trigger('change');
    } else {
        var selectElement = document.getElementById(current_object);
        selectElement.selectedIndex = 0;
        setCookie(cookie_name, selectElement.value);
    }
}
function checkChoiceCookieSelect(choiceObject, cookieName, defaultValue = '-') {
    try {
        const cookieValue = getCookie(cookieName);

        if (cookieValue) {
            choiceObject.setChoiceByValue(cookieValue);
        } else {
            // Set default value if no cookie exists
            choiceObject.setChoiceByValue(defaultValue);
            setCookie(cookieName, defaultValue);
        }
    } catch (error) {
        console.error('Error in checkChoiceCookieSelect:', error);
        // Fallback: set to default value
        choiceObject.setChoiceByValue(defaultValue);
        setCookie(cookieName, defaultValue);
    }
}

function checkCookieChecked(object_name, default_checked = false) {
    var value = getCookie(object_name);
    if (value) {
        var current_coockie = getCookie(object_name);
        var isTrueSet = (current_coockie === 'true');
        document.getElementById(object_name).checked = isTrueSet;
    } else {
        if (default_checked) {
            document.getElementById(object_name).checked = true;
        }
        setCookie(object_name, document.getElementById(object_name).checked);
    }
}


function checkCookieButtonSql(cookie_name, current_value, sql_table_name) {
    const analyticToggle = document.getElementById('analyticToggle');
    if (getCookie(cookie_name)) {
        var current_coockie = getCookie(cookie_name);
        if (current_coockie == "Table") {
            analyticToggle.setAttribute('aria-pressed', false);
            analyticToggle.classList.toggle('active', false);
            const blockListTables = document.querySelector('.skin-dark .block-list-tables');
            if (blockListTables) {
                document.querySelector('.block-list-tables').style.backgroundColor = '#3d3d3b';
            } else {
                document.querySelector('.block-list-tables').style.backgroundColor = '#e1e6ed';
            }
            if (sql_table_name) {
                sql_table_name.disable();
            }
        } else {
            analyticToggle.setAttribute('aria-pressed', true);
            analyticToggle.classList.toggle('active', true);
        }
    } else {
        analyticToggle.setAttribute('aria-pressed', true);
        analyticToggle.classList.toggle('active', true);
        setCookie(cookie_name, current_value, 7);
    }
}

function checkCookieButtonFlow(cookie_name, current_value) {
    if (getCookie(cookie_name)) {
        var current_coockie = getCookie(cookie_name);
        if (current_coockie == "Flow") {
            document.getElementById("btn_mode_flujo").classList.add("selected");
            document.getElementById("btn_mode_question").classList.remove("selected");
            document.getElementById("message-input").setAttribute("disabled", false);
            document.getElementById("button-submit").setAttribute("disabled", false);
            document.getElementById("message-form").classList.remove('message-form-question');
            document.getElementById("message-form").classList.add('message-form-flow');
            document.getElementById("message-input").classList.remove('message-input-question');
            document.getElementById("message-input").classList.add('message-input-flow');
        } else {
            document.getElementById("btn_mode_flujo").classList.remove("selected");
            document.getElementById("btn_mode_question").classList.add("selected");
            document.getElementById("message-input").removeAttribute("disabled");
            document.getElementById("button-submit").removeAttribute("disabled");
            updateCookie('chatflow_chat_type', 'Question');
            document.getElementById("message-form").classList.remove('message-form-flow');
            document.getElementById("message-form").classList.add('message-form-question');
            document.getElementById("message-input").classList.remove('message-input-flow');
            document.getElementById("message-input").classList.add('message-input-question');
        }
    } else {
        document.getElementById("btn_mode_flujo").classList.add("selected");
        document.getElementById("btn_mode_question").classList.remove("selected");
        document.getElementById("message-input").setAttribute("disabled", false);
        document.getElementById("button-submit").setAttribute("disabled", false);
        document.getElementById("message-form").classList.remove('message-form-question');
        document.getElementById("message-form").classList.add('message-form-flow');
        document.getElementById("message-input").classList.remove('message-input-question');
        document.getElementById("message-input").classList.add('message-input-flow');
        setCookie(cookie_name, current_value, 7);
    }
}
