let loginAttempts = 0;
let verifyAttempts = 0;
let maxAttempts = 3;
let lockoutTime = 60000; // 1 minute in milliseconds

window.addEventListener("load", function (event) {

    // Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
    // for details on configuring this project to bundle and minify static web assets.
    // Write your JavaScript code.
    if (window.is_azure == 1) {
        $('#btn_go_login_basic').click(function () {
            $("#login_with_microsoft").css({ "display": "none" });
            $("#login_with_basic").css({ "display": "block" });
            $("#btn_go_login_microsoft").css({ "display": "block" });
        });
        $("#btn_go_login_microsoft").html('<i class="fa fa-arrow-left" aria-hidden="true"></i>&nbsp;' + window.login_back_to_login_with_microsoft);
    } else {
        $("#btn_go_login_microsoft").html('<i class="fa fa-arrow-left" aria-hidden="true"></i>&nbsp;' + window.login_back_to_login);
    }
    
    $('#btn_go_login_microsoft').click(function () {
        if (window.is_azure == 1) {
            $("#login_with_microsoft").css({ "display": "block" });
            $('#login_with_microsoft').fadeIn();
            $("#login_with_basic").css({ "display": "none" });
            $("#btn_go_login_microsoft").css({ "display": "none" });
        }
        $("#section_login_email").css({ "display": "block" });
        $("#login_email_input").val("");
        $("#section_login_password").css({ "display": "none" });
        $("#login_password_input").val("");
        $("#section_login_new_password").css({ "display": "none" });
        $("#login_new_password").val("");
        $("#section_login_repeat_password").css({ "display": "none" });
        $("#login_repeat_new_password").val("");
        $("#login_error_message").css({ "display": "none" });
        $("#login_info_message").css({ "display": "none" });
        $("#login_error_message span").html("");
        $("#login_info_message span").html("");
        $("#section_keep_login").css({ "display": "none" });
        if (window.is_azure == 0) {
            $("#btn_go_login_microsoft").css({ "display": "none" });
        }
        $("#login_keep_login").attr("checked", false)

        $("#btn_login_basic_account").prop("disabled", false);

        $("#btn_login_basic_account").data("steps", "1");
        $("#btn_login_basic_account").data("new-password", "0");
        $("#btn_login_basic_account").html(window.login_next_button);

        //$("#login_message_welcome").html("<div>" + window.login_basic_account_header_1 + "</div><span>" + window.login_basic_account_header_2 + "</span>");

    });

    document.getElementById("btn_login_basic_account").addEventListener("click", function (event) {
        event.preventDefault();
        let step_current = $("#btn_login_basic_account").data("steps");

        if (step_current == "1") {
            verifyaccount();
        }
        if (step_current == "2") {
            let new_password = $("#btn_login_basic_account").data("new-password");
            if (new_password == "1") {
                registerpasswordaccount();
            } else {
                loginaccount();
            }
        }
    });

    $("#login_email_input").on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            verifyaccount();
        }
    });
    $("#login_password_input").on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            loginaccount();
        }
    });

});


function verifyaccount() {
    let login_email = $("#login_email_input").val();
    if (login_email == "") {
        return;
    }
    var data = JSON.stringify({
        acc: login_email
    });
    if (verifyAttempts >= maxAttempts) {
        $("#login_error_message").css({ "display": "block" });
        $("#login_error_message span").html(window.login_maximum_verification);
        setTimeout(() => {
            verifyAttempts = 0; // Reset attempts after the lockout period
        }, lockoutTime);
        return;
    }
    $.ajax({
        beforeSend: function () {
            $("#btn_login_basic_account").prop("disabled", true);
            $("#btn_login_basic_account").html('<i class="fa fa-circle-o-notch fa-spin"></i>');
            effects_login_before();
        },
        url: "/login/verifyaccount",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: function (resp) {
            if (resp.code_error) {
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message span").html(resp.code_error);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                effects_login_after();
                return;
            }
            if ((resp.result).length > 0) {
                var data = resp.result[0];
                verifyAttempts = 0; // Reset attempts on successful verification
                if (data.new_password == true) {
                    $("#btn_login_basic_account").prop("disabled", false);
                    $("#btn_go_login_microsoft").css({ "display": "block" });
                    $("#login_error_message").css({ "display": "none" });
                    $("#btn_login_basic_account").html(window.login_register_button);
                    $("#btn_login_basic_account").data("steps", "2");
                    $("#btn_login_basic_account").data("new-password", "1");
                    $("#section_login_email").css({ "display": "none" });
                    $("#section_login_new_password").css({ "display": "block" });
                    $("#section_login_repeat_password").css({ "display": "block" });
                    $("#login_message_welcome").html("<div>" + window.login_welcome_to_registration_1 + "</div><span>" + window.login_welcome_to_registration_2 + "</span>");
                    $("#login_info_message").css({ "display": "block" });
                    $("#login_info_message span").css({ "color": "#636363", "white-space": "break-spaces" });
                    $("#login_info_message span").html(window.login_registration_criteria);
                    
                } else {
                    $("#btn_login_basic_account").prop("disabled", false);
                    $("#btn_go_login_microsoft").css({ "display": "block" });
                    $("#login_error_message").css({ "display": "none" });
                    $("#btn_login_basic_account").html(window.login_login_button);
                    $("#btn_login_basic_account").data("steps", "2");
                    $("#btn_login_basic_account").data("new-password", "0");
                    $("#section_login_email").css({ "display": "none" });
                    $("#section_login_password").css({ "display": "block" });
                    $("#section_keep_login").css({ "display": "none" });
                }
            } else {
                verifyAttempts++; // Increment verification attempts on incorrect user
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message span").html(window.login_user_not_found);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html(window.login_next_button);
            }
            effects_login_after();

        }
    });
}

function registerpasswordaccount() {
    let login_email = $("#login_email_input").val();
    let new_password_input = $("#login_new_password").val();
    let repeat_password_input = $("#login_repeat_new_password").val();
    if (new_password_input != repeat_password_input) {
        $("#login_error_message").css({ "display": "block" });
        $("#login_error_message span").html(window.login_password_not_match);
        return;
    } else {
        $("#login_error_message").css({ "display": "none" });
    }
    let password_validation = validatePassword(new_password_input);
    if (password_validation == "true") {
        $("#login_error_message").css({ "display": "none" });
    } else {
        $("#login_error_message span").html(password_validation);
        $("#login_error_message").css({ "display": "block" });
        return;
    }
    var data = JSON.stringify({
        acc: login_email,
        pass: new_password_input
    });
    $.ajax({
        beforeSend: function () {
            $("#login_new_password").prop("disabled", true);
            $("#login_repeat_new_password").prop("disabled", true);
            $("#btn_login_basic_account").prop("disabled", true);
            $("#btn_login_basic_account").html('<i class="fa fa-circle-o-notch fa-spin"></i>');
            effects_login_before();
        },
        url: "/login/registerpasswordaccount",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: function (resp) {
            if (resp.code_error) {
                $("#login_new_password").prop("disabled", false);
                $("#login_repeat_new_password").prop("disabled", false);
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message span").html(resp.code_error);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html("Register");
                effects_login_after();
                return;
            }
            if (resp.result) {
                $("#login_info_message").css({ "display": "block" });
                $("#login_info_message span").css({ "color": "blue", "white-space": "normal" });
                $("#login_info_message span").html(window.login_successful_registration);
                setTimeout(function () {
                    window.location.replace(location.protocol + '//' + location.host + '/login');
                }, 3000);
            }

        }
    });
}

function loginaccount() {
    let login_email = $("#login_email_input").val();
    let password_input = $("#login_password_input").val();
    let keep_input = $("#login_keep_login").attr("checked") ? 1 : 0;
    if (password_input == "") {
        $("#login_error_message").css({ "display": "block" });
        $("#login_error_message span").html(window.login_enter_password);
        return;
    }
    if (loginAttempts >= maxAttempts) {
        $("#login_error_message").css({ "display": "block" });
        $("#login_error_message span").html(window.login_maximum_login);
        setTimeout(() => {
            loginAttempts = 0; // Reset attempts after the lockout period
        }, lockoutTime);
        return;
    }
    var data = JSON.stringify({
        acc: login_email,
        pass: password_input,
        keep: keep_input
    });

    $.ajax({
        beforeSend: function () {
            $("#login_error_message").css({ "display": "none" });
            $("#btn_login_basic_account").prop("disabled", true);
            $("#btn_login_basic_account").html('<i class="fa fa-circle-o-notch fa-spin"></i>');
            effects_login_before();
        },
        url: "/login/signin",
        data: data,
        contentType: 'application/json',
        method: 'POST',
        success: function (resp) {
            if (resp.code_error) {
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message span").html(resp.code_error);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html(window.login_login_button);
                effects_login_after();
                return;
            }

            if (resp.result == 1) {
                loginAttempts = 0; // Reset attempts on successful login
                window.location.replace(location.protocol + '//' + location.host + '/');
            } else {
                loginAttempts++; // Increment login attempts on incorrect password
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message span").html(window.login_signin_incorrect_password);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html(window.login_login_button);
                effects_login_after();
            }

        }
    });
}


function validatePassword(password) {
    const minLength = 4;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    //const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return window.validate_password_lenght;
    }
    if (!hasLetter) {
        return window.validate_password_has_letter;
    }
    if (!hasNumber) {
        return window.validate_password_has_number;
    }
    /*
    if (!hasSpecialChar) {
        return window.validate_password_has_specialchar;
    }
    */
    return "true";
}

function effects_login_before() {
    $(".modal-body").css({"filter": "blur(0.5px)"});
    $(".modal-footer").css({"filter": "blur(0.5px)"});
}
function effects_login_after() {
    $(".modal-body").css({"filter": ""});
    $(".modal-footer").css({"filter": ""});
}