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
});
