frappe.router.on("change", () => {
    const route = frappe.get_route();

    const isPrivilegedUser =
        frappe.user_roles.includes("Administrator") ||
        frappe.user_roles.includes("System Manager");

    if (!isPrivilegedUser) {
        document.body.classList.add("not-admin");
    } else {
        document.body.classList.remove("not-admin");
    }

    if (route.length === 2 && route[0] === "Workspaces" && !isPrivilegedUser) {
        $("#page-Workspaces .btn-edit-workspace").hide();
        $("#page-Workspaces .btn-new-workspace").hide();
    }
    addUsernameBelowNavbar();
});


function addUsernameBelowNavbar() {
    // Prevent duplicate injection
    if (document.getElementById("jh-username-bar")) return;

    const fullName = frappe.session.user_fullname || frappe.session.user;

    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const userDiv = document.createElement("div");
    userDiv.id = "jh-username-bar";
    userDiv.innerText = fullName;

    navbar.insertAdjacentElement("afterend", userDiv);
}

