import frappe

JH_TRAVEL_REQUEST_TYPE = [
    {
        "label": "Hotel",
        "article_code": "ARTICLE_1",
    },
    {
        "label": "Flight",
        "article_code": "ARTICLE_2",
    },
    {
        "label": "Other",
        "article_code": "",
    },
]


def preload_jh_travel_request_type():
    for item in JH_TRAVEL_REQUEST_TYPE:
        if not frappe.db.exists("JH Travel Request Type", item["label"]):
            print(f"Creating {item['label']}")
            new_type = frappe.new_doc("JH Travel Request Type")
            new_type.label = item["label"]
            new_type.article_code = item["article_code"]
            new_type.insert()
        else:
            print(f"{item['label']} already exists, updating article code")
            frappe.db.set_value(
                "JH Travel Request Type",
                item["label"],
                "article_code",
                item["article_code"],
            )
