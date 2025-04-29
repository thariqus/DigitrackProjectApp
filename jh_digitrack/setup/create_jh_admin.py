import frappe


def create_jh_admin():
    if not frappe.db.exists(
        "JH User Master",
        {
            "full_name": "JH Admin",
        },
    ):
        print("Creating JH Admin")
        jh_admin = frappe.get_doc(
            {
                "doctype": "JH User Master",
                "full_name": "JH Admin",
                "email": "digitrack_admin@jh.com",
            }
        )

        jh_admin.db_insert()
    else:
        print("JH Admin already exists")
