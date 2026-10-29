// employee_login.js
// Employee ID login: authenticates via a custom endpoint that stays
// available even when username/password login is disabled site-wide.
// Rendered as its own section (no tab switcher) below the email login
// fields, so it does not touch the shared login button/text.

function login_employee_invalid(message) {
	$(".login-content.page-card").addClass("invalid-login");
	setTimeout(function () {
		$(".login-content.page-card").removeClass("invalid-login");
	}, 500);

	$(".for-login .employee-login-panel").addClass("invalid");
	$(".for-login .btn-employee-login").text(message);
	$("#login_employee_password").focus();
}

function login_handle_employee_submit() {
	var employee_id = ($("#login_employee_id").val() || "").trim();
	var password = $("#login_employee_password").val();
	if (!employee_id || !password) {
		login_employee_invalid({{ _("Both Employee ID and password required") | tojson }});
		return;
	}

	$(".for-login .btn-employee-login").text({{ _("Verifying...") | tojson }});
	frappe.call({
		type: "POST",
		method: "jh_digitrack.api.auth.employee_login",
		args: { employee_id: employee_id, password: password },
		freeze: true,
		statusCode: login.login_handlers
	});
}

$(document).on("click", ".for-login .btn-employee-login", function (event) {
	event.preventDefault();
	login_handle_employee_submit();
});

$(document).on("keydown", "#login_employee_id, #login_employee_password", function (event) {
	if (event.key === "Enter") {
		event.preventDefault();
		login_handle_employee_submit();
	}
});

$(document).on("focus", "#login_employee_id, #login_employee_password", function () {
	$(".for-login .employee-login-panel").removeClass("invalid");
	$(".for-login .btn-employee-login").text({{ _("Login") | tojson }});
});
