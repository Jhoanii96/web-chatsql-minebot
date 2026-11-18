function sendNotification(message = "", title = 'MineBot') {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notifications.");
    } else if (Notification.permission === "granted") {
        // Create the notification
        new Notification(title, {
            body: message,
            icon: "/static/dist/img/sqlv7/notification_botlogo.png"
        });
    } else if (Notification.permission !== "denied") {
        // Request permission if not denied
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, {
                    body: message,
                    icon: "/static/dist/img/sqlv7/notification_botlogo.png"
                });
            }
        });
    }
}

/*
showAlert({
    msg: "Unknown", 
    timeout: 15, 
    type: "information"
});
*/
function showAlert({ msg = "Unknown", timeout = 15, type = "information" }) {
    // Define alert types and their styles
    const alertTypes = {
        error: {
            icon: "fa-ban",
            title: window.chatbot_alert_error,
            class: "alert-danger",
            bgColor: "#640b00",
            borderColor: "#901000",
            textColor: "#ffffff"
        },
        warning: {
            icon: "fa-exclamation-triangle",
            title: window.chatbot_alert_warning,
            class: "alert-warning",
            bgColor: "#835000",
            borderColor: "#aa6c08",
            textColor: "#ffffff"
        },
        information: {
            icon: "fa-info-circle",
            title: window.chatbot_alert_information,
            class: "alert-info",
            bgColor: "var(--navy-blue)",
            borderColor: "var(--navy-blue)",
            textColor: "#ffffff"
        },
        question: {
            icon: "fa-question-circle",
            title: window.chatbot_alert_question,
            class: "alert-primary",
            bgColor: "#004e92",
            borderColor: "#415695",
            textColor: "#ffffff"
        },
        success: {
            icon: "fa-check",
            title: window.chatbot_alert_success,
            class: "alert-success",
            bgColor: "#006715",
            borderColor: "#005210",
            textColor: "#ffffff"
        }
    };

    // Get the selected alert type, defaulting to "error"
    const alertConfig = alertTypes[type] || alertTypes.error;

    var alert_title = document.getElementById("alert-title");
    var alert_text = document.getElementById("alert-text");
    var dateTime = getCurrentDateTime();

    // Clean the message
    msg = msg.replaceAll("Error: ", "");

    // Prepare the complete error message
    var alert_message = "[" + dateTime.full_date + "] " + alertConfig.title + " : " + msg;

    console.log(alert_message);

    if (alert_text && alert_title) {
        alert_title.innerHTML = `<i class="icon fa ${alertConfig.icon}"></i> ${alertConfig.title}`;
        alert_text.innerHTML = alert_message;
        alert_text.style.color = alertConfig.textColor;
        alert_text.parentElement.className = `alert ${alertConfig.class} alert-dismissible`;
        alert_text.parentElement.style.setProperty('background-color', alertConfig.bgColor, "important");
        alert_text.parentElement.style.borderColor = alertConfig.borderColor;
    } else {
        var alert_section = `
        <div class="alert ${alertConfig.class} alert-dismissible" style="margin: 10px; background-color: ${alertConfig.bgColor} !important; border-color: ${alertConfig.borderColor}; max-height: 400px; overflow-y: auto;display: none;">
            <button type="button" class="close" data-dismiss="alert" aria-hidden="false" onfocus="this.setAttribute('aria-hidden', 'false');">
                ×
            </button>
            <h4 id="alert-title"><i class="icon fa ${alertConfig.icon}"></i> ${alertConfig.title}</h4>
            <span id="alert-text" style="color: ${alertConfig.textColor};"></span>
        </div>
        `;

        document.getElementById("alert-section").innerHTML = alert_section;
        alert_text = document.getElementById("alert-text");
        alert_text.innerHTML = alert_message;
    }

    // Show the alert and set timeout for auto-fade
    $(".alert").show();
    setTimeout(function () {
        $(".alert").fadeOut();
    }, timeout * 1000); // Hide after the specified timeout
}



function showMessage(message = "Unknown", timeout = 5) {
    const messageBox = document.getElementById('messageBox');
    messageBox.innerHTML = message;
    messageBox.classList.remove('message-hide');
    messageBox.classList.add('message-show');
    console.log(message);
    setTimeout(() => {
        messageBox.classList.remove('message-show');
        messageBox.classList.add('message-hide');
    }, timeout * 1000);
}

function showStaticMessage({ message = "Unknown", toggle = "show" } = {}) {
    console.log(message);
    const messageBox = document.getElementById('staticMessageBox');
    if (toggle === "show" && messageBox) {
        messageBox.innerHTML = message;
        messageBox.classList.remove('message-hide');
        messageBox.classList.add('message-show');
    }
    if (toggle === "hide" && messageBox) {
        setTimeout(() => {
            messageBox.classList.remove('message-show');
            messageBox.classList.add('message-hide');
        }, 7500);
    }
}




function set_object_popup(object_id) {
    // Get the target and popup elements
    const hoverTarget = document.getElementById(object_id);
    if (hoverTarget) {
        const popup = document.getElementById('popup');

        // Show the popup when mouse enters
        hoverTarget.addEventListener('mouseenter', function (event) {
            const title_target = event.target.attributes["data-title"].value;
            document.querySelector("#popup > span").innerHTML = title_target;
            popup.style.display = 'flex';
        });

        // Hide the popup when mouse leaves
        hoverTarget.addEventListener('mouseleave', function () {
            document.querySelector("#popup > span").innerHTML = "";
            popup.style.display = 'none';
        });

        // Update popup position when mouse moves over the target
        hoverTarget.addEventListener('mousemove', function (event) {
            // Use pageX and pageY for accurate positioning relative to the page
            var main_sidebar = document.querySelector(".main-sidebar")
            popup.style.top = (event.pageY - 10) + 'px';
            popup.style.left = (event.pageX + 15) + 'px';
        });
    }
}





// Show custom confirmation dialog and return a Promise
function showConfirmDialog({ title = "", message = "" }) {
    return new Promise((resolve) => {
        const dialog = document.getElementById("confirmDialog");
        const input = document.getElementById("dialogNewInput");
        document.body.classList.add("modal-active"); // Add class to disable background interaction
        dialog.style.display = "flex";
        if (title != "") {
            document.getElementById("dialogTitle").innerHTML = title;
        }
        document.getElementById("dialogBody").innerHTML = message;

        //const container = document.getElementById("new_phase_name_input");
        //if (container) {
        //    const choiceLabel = container.getAttribute("data-label");
        //    setTimeout(() => {
        //        input.style.display = "";
        //        input.value = choiceLabel + " - Copy";
        //        input.focus();
        //    }, 100);
        //}

        // Event listener for "Ok" button
        document.getElementById("confirmOk").onclick = function () {
            dialog.style.display = "none";
            if (input) {
                input.style.display = "none";
            }
            document.body.classList.remove("modal-active"); // Remove class to re-enable background interaction
            resolve(true); // Resolve with true when "Ok" is clicked
        };

        // Event listener for "Cancel" button
        document.getElementById("confirmCancel").onclick = function () {
            dialog.style.display = "none";
            if (input) {
                input.style.display = "none";
            }
            document.body.classList.remove("modal-active"); // Remove class to re-enable background interaction
            resolve(false); // Resolve with false when "Cancel" is clicked
        };
    });
}




