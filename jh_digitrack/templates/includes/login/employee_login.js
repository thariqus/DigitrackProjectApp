// employee_login.js
// Employee ID login tab: authenticates via a custom endpoint that stays
// available even when username/password login is disabled site-wide.

function login_get_active_tab() {
	var $tabs = $(".for-login .login-tabs");
	if ($tabs.length) {
		return $tabs.attr("data-active-tab") || "email";
	}
	// No tab switcher rendered means Employee ID is the only login option shown.
	return "employee";
}

function login_employee_invalid(message) {
	$(".login-content.page-card").addClass("invalid-login");
	setTimeout(function () {
		$(".login-content.page-card").removeClass("invalid-login");
	}, 500);

	login.set_status(message, "red");
	$("#login_employee_password").focus();
}

function login_handle_employee_submit() {
	var employee_id = ($("#login_employee_id").val() || "").trim();
	var password = $("#login_employee_password").val();
	if (!employee_id || !password) {
		login_employee_invalid({{ _("Both Employee ID and password required") | tojson }});
		return;
	}

	login.set_status({{ _("Verifying...") | tojson }}, "blue");
	frappe.call({
		type: "POST",
		method: "jh_digitrack.api.auth.employee_login",
		args: { employee_id: employee_id, password: password },
		freeze: true,
		statusCode: login.login_handlers
	});
}

$(document).on("click", ".for-login .login-tab", function () {
	var tab = $(this).data("tab");
	$(".for-login .login-tab").removeClass("active");
	$(this).addClass("active");
	$(".for-login .login-tab-panel").addClass("hide");
	$(".for-login .login-tab-panel[data-tab-panel='" + tab + "']").removeClass("hide");
	$(".for-login .login-tabs").attr("data-active-tab", tab);
	$(".login-content.page-card").removeClass("invalid-login");
	login.set_status({{ _("Login") | tojson }}, "blue");
});

// Capture phase: runs before login.js's own submit handler so the
// Employee ID tab can short-circuit the default email/password flow.
document.querySelectorAll(".for-login form.form-login").forEach(function (form) {
	form.addEventListener("submit", function (event) {
		if (login_get_active_tab() !== "employee") return;
		event.preventDefault();
		event.stopImmediatePropagation();
		login_handle_employee_submit();
	}, true);
});
