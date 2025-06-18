
frappe.router.on('change', () => {
    const route = frappe.get_route();
    console.log("Route changed to:", route);
    // if (route.length === 2 && !frappe.user_roles.includes("Administrator")) {
    if (route.length === 2) {
        if (route[0] === "Workspaces") {
            $("#page-Workspaces .btn-edit-workspace").hide();
            $("#page-Workspaces .btn-new-workspace").hide();
            $('svg use[href="#es-line-notifications"]').closest('svg').hide();
            $("#page-Workspaces .btn-reset").hide();
            $('button[aria-label="Help Dropdown"]').css('display', 'none');
 
        }
    }
});
