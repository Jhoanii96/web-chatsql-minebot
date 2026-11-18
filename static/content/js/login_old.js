window.addEventListener("load", function (event) {

    // Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
    // for details on configuring this project to bundle and minify static web assets.
    // Write your JavaScript code.
    $('#btn_go_login_microsoft').click(function () {

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
        $("#login_error_message label").html("");
        $("#login_info_message label").html("");
        $("#section_keep_login").css({ "display": "none" });
        $("#login_keep_login").attr("checked", false)

        $("#btn_login_basic_account").prop("disabled", false);

        $("#btn_login_basic_account").data("steps", "1");
        $("#btn_login_basic_account").data("new-password", "0");

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

});


function verifyaccount() {
    let login_email = $("#login_email_input").val();
    if (login_email == "") {
        return;
    }

    var data = JSON.stringify({
        acc: login_email
    });

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
                $("#login_error_message label").html(resp.code_error);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                effects_login_after();
                return;
            }

            if (resp.result) {
                var data = resp.result[0];
                if (data.new_password == true) {
                    $("#btn_go_login_microsoft").css({ "display": "block" });
                    $("#btn_login_basic_account").prop("disabled", false);
                    $("#login_error_message").css({ "display": "none" });
                    $("#btn_login_basic_account").html("Register");
                    $("#btn_login_basic_account").data("steps", "2");
                    $("#btn_login_basic_account").data("new-password", "1");
                    $("#section_login_email").css({ "display": "none" });
                    $("#section_login_new_password").css({ "display": "block" });
                    $("#section_login_repeat_password").css({ "display": "block" });
                    $("#login_message_welcome").html("<div>Welcome to registration</div><span>Please enter your new password.</span>");
                    $("#login_info_message").css({ "display": "block" });
                    $("#login_info_message label").html('<div style="text-align: start;color: #636363;font-weight: normal;">The password must meet the following criteria:<br>1. Contains letters (both uppercase and lowercase are allowed).<br>2. Contains at least 1 number.<br>3. Contains at least 1 special character.<br>4. Is at least 6 characters long.</div>');
                } else {
                    $("#btn_go_login_microsoft").css({ "display": "block" });
                    $("#btn_login_basic_account").prop("disabled", false);
                    $("#login_error_message").css({ "display": "none" });
                    $("#btn_login_basic_account").html("Login");
                    $("#btn_login_basic_account").data("steps", "2");
                    $("#btn_login_basic_account").data("new-password", "0");
                    $("#section_login_email").css({ "display": "none" });
                    $("#section_login_password").css({ "display": "block" });
                    $("#section_keep_login").css({ "display": "none" });
                }
            } else {
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message label").html("This user was not found.");
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html("Next");
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
        $("#login_error_message label").html("The entered password does not match.");
        return;
    } else {
        $("#login_error_message").css({ "display": "none" });
    }

    let password_validation = validatePassword(new_password_input);

    if (password_validation != "Password is valid.") {
        $("#login_error_message").css({ "display": "block" });
        $("#login_error_message label").html(password_validation);
        return;
    } else {
        $("#login_error_message").css({ "display": "none" });
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
                $("#login_error_message label").html(resp.code_error);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html("Register");
                effects_login_after();
                return;
            }

            if (resp.result) {
                $("#login_info_message").css({ "display": "block" });
                $("#login_info_message label").html("Successful registration!, please login again with your basic account.<br>Automatically will be redirected to the main login page.");
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
        $("#login_error_message label").html("Please enter the password.");
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
                $("#login_error_message label").html(resp.code_error);
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html("Login");
                effects_login_after();
                return;
            }

            if (resp.result == 1) {
                window.location.replace(location.protocol + '//' + location.host + '/');
            } else {
                $("#login_error_message").css({ "display": "block" });
                $("#login_error_message label").html("The password is incorrect, please try again.");
                $("#login_email_input").prop("disabled", false);
                $("#btn_login_basic_account").prop("disabled", false);
                $("#btn_login_basic_account").html("Login");
                effects_login_after();
            }

        }
    });
}


function validatePassword(password) {
    const minLength = 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return "Password must be at least 6 characters long.";
    }
    if (!hasLetter) {
        return "Password must contain at least one letter.";
    }
    if (!hasNumber) {
        return "Password must contain at least one number.";
    }
    if (!hasSpecialChar) {
        return "Password must contain at least one special character.";
    }
    
    return "Password is valid.";
}

function effects_login_before() {
    $(".modal-body").css({"filter": "blur(0.5px)"});
    $(".modal-footer").css({"filter": "blur(0.5px)"});
}
function effects_login_after() {
    $(".modal-body").css({"filter": ""});
    $(".modal-footer").css({"filter": ""});
}