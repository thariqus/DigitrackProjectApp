import frappe


def execute():
    tasks = frappe.db.get_list(
        "JH Task Master",
        fields=["name", "owner", "created_by"],
        filters={
            #    "created_by": ["is","not set"],
        },
    )
    for task in tasks:
        created_by = task.owner
        print(created_by, task.name)
        try:
            jh_user = frappe.get_last_doc(
                "JH User Master", filters={"email": created_by}
            )
            created_by = jh_user.name
        except Exception as e:
            pass
        frappe.db.set_value("JH Task Master", task.name, "created_by", created_by)
