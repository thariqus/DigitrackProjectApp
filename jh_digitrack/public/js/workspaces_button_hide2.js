
frappe.router.on('change', () => {
    const route = frappe.get_route();
    if (!frappe.user_roles.includes("Administrator")) {
        document.body.classList.add("not-admin");
    } else {
        document.body.classList.remove("not-admin");
    }
    if (route.length === 2 && !frappe.user_roles.includes("Administrator")) {
        if (route[0] === "Workspaces") {
            $("#page-Workspaces .btn-edit-workspace").hide();
            $("#page-Workspaces .btn-new-workspace").hide();
            
        }
    }
});
