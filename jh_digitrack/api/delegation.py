import frappe
from frappe import _
 
from jh_digitrack.api.helpers.delegation import (
    expire_adhoc_delegations_for_document,
    get_delegations_for_user,
    get_effective_adhoc_delegation,
)
 

@frappe.whitelist(methods=["POST"])
def create_delegation(
    delegate: str,
    delegation_type: str,
    from_date: str = None,
    to_date: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    comment: str = None,
):
    """
    Creates a JH Delegation record on behalf of the logged-in user (delegator).
    Validation and notification are handled by the DocType controller.
    """
    delegator = frappe.session.user
 
    if delegation_type == "Ad-Hoc" and reference_doctype and reference_name:
        # Only one Ad-Hoc delegation may be Active per document at a time,
        # regardless of direction. Otherwise a reverse delegation (B back to A)
        # coexists with the original, and both users end up blocked by their
        # own outgoing delegation simultaneously.
        expire_adhoc_delegations_for_document(
            frappe._dict(doctype=reference_doctype, name=reference_name)
        )

    doc = frappe.get_doc({
        "doctype": "JH Delegation",
        "delegator": delegator,
        "delegate": delegate,
        "delegation_type": delegation_type,
        "from_date": from_date or None,
        "to_date": to_date or None,
        "reference_doctype": reference_doctype or None,
        "reference_name": reference_name or None,
        "comment": comment or None,
        "status": "Active",
    })
    doc.insert(ignore_permissions=True)

    return {
        "name": doc.name,
        "delegator": doc.delegator,
        "delegate": doc.delegate,
        "delegation_type": doc.delegation_type,
        "status": doc.status,
    }


@frappe.whitelist(methods=["POST"])
def revoke_delegation(name: str):
    """
    Revokes an Active delegation. Only the delegator or a module admin may revoke.
    Revocation email is sent via the JHDelegation on_update controller hook.
    """
    if not name:
        frappe.throw(_("name is required"))

    delegation = frappe.get_doc("JH Delegation", name, ignore_permissions=True)

    user = frappe.session.user
    is_admin = user == "Administrator" or "JH Digitrack Admin" in set(frappe.get_roles(user))

    if not is_admin and delegation.delegator != user:
        frappe.throw(_("Only the delegator may revoke this delegation."), frappe.PermissionError)

    if delegation.status != "Active":
        frappe.throw(_("Only Active delegations can be revoked."))

    delegation.status = "Revoked"
    delegation.save(ignore_permissions=True)

    return {"name": delegation.name, "status": delegation.status}


@frappe.whitelist(methods=["GET"])
def list_delegations():
    """
    Returns all Active delegations where the current user is delegator or delegate.
    """
    return {"delegations": get_delegations_for_user(frappe.session.user)}

 
@frappe.whitelist(methods=["GET"])
def get_document_delegation(reference_doctype: str, reference_name: str):
    """
    Returns the currently Active Ad-Hoc delegation for a specific document if
    the current user delegated it away, directly or through an earlier hop in
    a re-delegation chain (A -> B -> C).
    """
    if not reference_doctype or not reference_name:
        frappe.throw(_("reference_doctype and reference_name are required"))
 
    user = frappe.session.user
    document = frappe._dict(doctype=reference_doctype, name=reference_name)
    delegation = get_effective_adhoc_delegation(user, document)
 
    return {"delegation": delegation}