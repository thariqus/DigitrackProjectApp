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
                    "all":row.all,
                    "email":row.email,
                    "message": row.message,
                    "url": row.url,
                    "from": row.from_date,
                    "to": row.to_date   
                })
 
        return {
            "status": "success",
            "data": {
                "images": {
                    "img1": doc.img1,
                    "img1_url":doc.img1_url,
                    "img2": doc.img2,
                    "img2_url":doc.img2_url,
                    "img3": doc.img3,
                    "img3_url":doc.img3_url,
                    "img4": doc.img4,
                    "img4_url":doc.img4_url,
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