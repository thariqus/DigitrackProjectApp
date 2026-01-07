import frappe
from frappe.utils import nowdate
 
@frappe.whitelist(allow_guest=True)
def get_intranet_settings(): 
    try:
        doc = frappe.get_single("Intranet Settings")
 
        messages = []
        today = nowdate()
 
        for row in doc.intranet_message or []:
            # if not row.expiry_date or row.expiry_date >= today:
                messages.append({
                    "common_message": row.common_message,
                    "expiry_date": row.expiry_date,
                    "url": row.url
                })
 
        return {
            "status": "success",
            "data": {
                "images": {
                    "img1": doc.img1,
                    "img2": doc.img2,
                    "img3": doc.img3,
                    "img4": doc.img4
                },
                "messages": messages
            }
        }
 
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Intranet Settings API Error")
        return {
            "status": "error",
            "message": str(e)
        }