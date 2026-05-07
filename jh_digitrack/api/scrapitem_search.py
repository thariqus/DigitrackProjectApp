import frappe

@frappe.whitelist(allow_guest=True, methods=["GET"])
def search_scrapitem(search):
    search_like = f"%{search}%" if search else "%"
 
    employees = frappe.db.sql("""
        SELECT 
            item_name,
            quantity,
            location
        FROM `tabJH Scrap Item`
        WHERE 
            item_name LIKE %(search)s
            AND status = 'Available'
        LIMIT 50
    """, {"search": search_like}, as_dict=True)

    return {"message": employees}



@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_item_details(item_name):
    """
    Fetch all fields of a JH Scrap Item based on item_name
    """
    if not item_name:
        return {"message": "Item name is required"}

    item = frappe.get_all(
        "JH Scrap Item",
        filters={"item_name": item_name},
        fields=["*"],  
        limit_page_length=1
    )

    if not item:
        return {"message": None}

    return {"message": item[0]}


import frappe

@frappe.whitelist(allow_guest=True, methods=["GET"])
def user_scrap_items(created_by=None, page=1, page_size=10, search_query=None):
    if not created_by:
        created_by = frappe.session.user


    user_doc = frappe.get_doc("JH User Master", created_by)
    created_by_email = getattr(user_doc, "email", created_by)  
    conditions = ["`owner`=%s"]
    values = [created_by_email]

    if search_query:
        conditions.append("`item_name` LIKE %s")
        values.append(f"%{search_query}%")

    where_clause = " AND ".join(conditions)
    print(f"Constructed WHERE clause: {where_clause}, values: {values}")

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabJH Scrap Item` WHERE {where_clause}",
        tuple(values),
    )[0][0]
    print(f"Total items found: {total}")

    start = (int(page) - 1) * int(page_size)
    data = frappe.db.sql(
        f"""
        SELECT
            `name`, `item_name`, `date`, `employee_id`, `employee_name`,
            `contact_details`, `status`, `quantity`, `location`, `description`,
            `image1`, `image2`, `image3`
        FROM `tabJH Scrap Item`
        WHERE {where_clause}
        ORDER BY creation DESC
        LIMIT %s, %s
        """,
        tuple(values) + (start, int(page_size)),
        as_dict=True,
    )
    print(f"Fetched data: {data}")

    return {"message": {"data": data, "total": total}}



from frappe import _

@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_scrap_item(
    title,
    date,
    quantity,
    created_by=None,
    location=None,
    status=None,
    description=None,
    contact_details=None,
    image1=None,
    image2=None,
    image3=None,
    modified_date=None,
):
    """
    API to create a Scrap Item in Frappe
    """

    if not title:
        frappe.throw(_("Item Name is required"))
    if not quantity or int(quantity) < 1:
        frappe.throw(_("Quantity must be at least 1"))
    employee_id = created_by
    employee_name = None
    if not created_by:
        created_by = frappe.session.user


    user_doc = frappe.get_doc("JH User Master", created_by)
    employee_name = getattr(user_doc, "full_name", created_by)
    employee_id = getattr(user_doc, "employee_code", created_by)

    scrap_item = frappe.new_doc("JH Scrap Item")
    scrap_item.item_name = title
    scrap_item.date = date
    scrap_item.modified_date = modified_date or date
    scrap_item.quantity = quantity
    scrap_item.employee_id = employee_id
    scrap_item.employee_name = employee_name
    scrap_item.location = location
    scrap_item.status = status
    scrap_item.description = description
    scrap_item.contact_details = contact_details
    scrap_item.image1 = image1
    scrap_item.image2 = image2
    scrap_item.image3 = image3
    scrap_item.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "message": _("Scrap Item created successfully"),
    }



@frappe.whitelist(allow_guest=False, methods=["POST"])
def update_scrap_item(
    name: str,
    title: str = None,
    date: str = None,
    quantity: int = None,
    employee_id: str = None,
    employee_name: str = None,
    location: str = None,
    status: str = None,
    description: str = None,
    contact_details: str = None,
    image1: str = None,
    image2: str = None,
    image3: str = None,
    modified_date: str = None,
):
    """
    Update a Scrap Item record by name (docname).
    The frontend sends 'title', which maps to 'item_name'.
    """

    if not name:
        frappe.throw(_("Scrap Item ID (name) is required"))

    scrap_item = frappe.get_doc("JH Scrap Item", name)

    if title is not None:
        scrap_item.item_name = title
    if date is not None:
        scrap_item.date = date  
    if modified_date is not None:
        scrap_item.modified_date = modified_date
    if quantity is not None:
        scrap_item.quantity = quantity
    if employee_id is not None:
        scrap_item.employee_id = employee_id
    if employee_name is not None:
        scrap_item.employee_name = employee_name
    if location is not None:
        scrap_item.location = location
    if status is not None:
        scrap_item.status = status
    if description is not None:
        scrap_item.description = description
    if contact_details is not None:
        scrap_item.contact_details = contact_details
    if image1 is not None:
        scrap_item.image1 = image1
    if image2 is not None:
        scrap_item.image2 = image2
    if image3 is not None:
        scrap_item.image3 = image3
    scrap_item.save()
    frappe.db.commit()

    return {"message": "Scrap Item updated successfully"}




@frappe.whitelist(allow_guest=False, methods=["POST"])
def delete_scrap_item(name: str):
    if not name:
        frappe.throw(_("Scrap Item ID (name) is required"))

    try:
        scrap_item = frappe.get_doc("JH Scrap Item", name)
        scrap_item.delete()  
        frappe.db.commit()   
        return {"message": f'Scrap Item "{scrap_item.item_name}" deleted successfully'}
    except frappe.DoesNotExistError:
        frappe.throw(_("Scrap Item does not exist"))
