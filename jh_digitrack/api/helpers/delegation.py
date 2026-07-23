import frappe
from frappe import _
from frappe.utils import getdate, today


def resolve_effective_user(delegate: str, delegator: str, document=None) -> bool:
    """
    Returns True if `delegate` has active authority to act on behalf of `delegator`.
    Checks in order: Ad-Hoc (document-specific) → Temporary (date range) → Permanent.
    """
    if not delegate or not delegator or delegate == delegator:
        return False

    # 1. Ad-Hoc — only when a document is provided. A delegate may re-delegate
    # further (A -> B -> C), which expires the A->B row and leaves only B->C
    # Active, so a direct-match lookup would miss C. Instead, find whoever
    # currently holds the Active Ad-Hoc delegation for this document and walk
    # backwards through the re-delegation chain to see if it originated from
    # `delegator`.
    if document:
        active_delegator = frappe.db.get_value("JH Delegation", {
            "delegate": delegate,
            "delegation_type": "Ad-Hoc",
            "status": "Active",
            "reference_doctype": document.doctype,
            "reference_name": document.name,
        }, "delegator")

        if active_delegator and _adhoc_chain_traces_back(active_delegator, delegator, document):
            return True

    # 2. Temporary — active date range
    today_date = getdate(today())
    if frappe.db.exists("JH Delegation", {
        "delegator": delegator,
        "delegate": delegate,
        "delegation_type": "Temporary",
        "status": "Active",
        "from_date": ["<=", today_date],
        "to_date": [">=", today_date],
    }):
        return True

    # 3. Permanent — active until manually revoked
    if frappe.db.exists("JH Delegation", {
        "delegator": delegator,
        "delegate": delegate,
        "delegation_type": "Permanent",
        "status": "Active",
    }):
        return True

    return False

def _adhoc_chain_traces_back(current_delegator: str, target_delegator: str, document, _depth: int = 0) -> bool:
    """
    Walks an Ad-Hoc re-delegation chain backwards from `current_delegator`
    (whoever handed off the currently Active delegation) to see whether
    `target_delegator` originated it, directly or through one or more
    re-delegation hops. Depth is capped as a cycle guard.
    """
    if current_delegator == target_delegator:
        return True
    if _depth >= 10:
        return False
 
    prior_delegators = frappe.get_all(
        "JH Delegation",
        filters={
            "delegate": current_delegator,
            "delegation_type": "Ad-Hoc",
            "reference_doctype": document.doctype,
            "reference_name": document.name,
        },
        pluck="delegator",
        ignore_permissions=True,
    )
 
    return any(
        _adhoc_chain_traces_back(prior_delegator, target_delegator, document, _depth + 1)
        for prior_delegator in prior_delegators
    )


def has_outgoing_adhoc(user: str, document) -> bool:
    """
    Returns True if `user` has an active outgoing Ad-Hoc delegation for this document.
    Used to block the original delegator from acting while they have delegated.
    """
    return bool(frappe.db.exists("JH Delegation", {
        "delegator": user,
        "delegation_type": "Ad-Hoc",
        "status": "Active",
        "reference_doctype": document.doctype,
        "reference_name": document.name,
    }))


def expire_adhoc_delegations_for_document(doc):
    """
    Expires all Active Ad-Hoc delegations for a document.
    """
    delegations = frappe.get_all(
        "JH Delegation",
        filters={
            "delegation_type": "Ad-Hoc",
            "status": "Active",
            "reference_doctype": doc.doctype,
            "reference_name": doc.name,
        },
        fields=["name", "delegator", "delegate", "delegator_name", "delegate_name", "reference_name"],
    )

    for d in delegations:
        frappe.db.set_value("JH Delegation", d.name, "status", "Expired", update_modified=False)
        _safe_send(_send_adhoc_expired_notification, d)


def expire_adhoc_delegations_on_update(doc, method=None):
    """
    doc_events handler for JH Property Rental Renewal on_update.
    Expires all Active Ad-Hoc delegations for the document when workflow_state changes.
    """
    if not doc.has_value_changed("workflow_state"):
        return

    expire_adhoc_delegations_for_document(doc)


def check_delegation_expiry():
    """
    Scheduler job — runs daily at midnight.
    Expires Temporary delegations where to_date < today and sends revert emails.
    """
    today_date = getdate(today())

    expired = frappe.get_all(
        "JH Delegation",
        filters={
            "delegation_type": "Temporary",
            "status": "Active",
            "to_date": ["<", today_date],
        },
        fields=["name", "delegator", "delegate", "delegator_name", "delegate_name"],
    )

    for delegation in expired:
        frappe.db.set_value("JH Delegation", delegation.name, "status", "Expired", update_modified=False)
        _send_expiry_notification(delegation)


def get_delegations_for_user(user: str):
    """
    Returns all active delegations where user is delegator or delegate.
    Two separate queries are used to correctly enforce status = Active on both sides.
    Frappe or_filters drops AND conditions when combined with filters, so a single
    query cannot express: status=Active AND (delegator=user OR delegate=user).
    """
    fields = [
        "name", "delegator", "delegator_name", "delegate", "delegate_name",
        "delegation_type", "from_date", "to_date",
        "reference_doctype", "reference_name", "comment", "status",
    ]

    as_delegator = frappe.get_all(
        "JH Delegation",
        filters={"status": "Active", "delegator": user},
        fields=fields,
        ignore_permissions=True,
    )
    as_delegate = frappe.get_all(
        "JH Delegation",
        filters={"status": "Active", "delegate": user},
        fields=fields,
        ignore_permissions=True,
    )

    seen = set()
    result = []
    for d in as_delegator + as_delegate:
        if d.name not in seen:
            seen.add(d.name)
            result.append(d)

    return result


# ── Notification entry points ────────────────────────────────────────────────

def notify_delegation_created(delegation):
    """Called after_insert on JH Delegation. Routes to type-specific notification."""
    if delegation.delegation_type == "Temporary":
        _safe_send(_send_temporary_created_notification, delegation)
    elif delegation.delegation_type == "Permanent":
        _safe_send(_send_permanent_created_notification, delegation)
    elif delegation.delegation_type == "Ad-Hoc":
        _safe_send(_send_adhoc_created_notification, delegation)
        _safe_send(_send_initiator_notification, delegation)


def notify_delegation_revoked(delegation):
    """Called on_update when a Permanent delegation status changes away from Active."""
    _safe_send(_send_permanent_revoked_notification, delegation)


def notify_adhoc_expired(delegation):
    """Called on_update when an Ad-Hoc delegation status changes away from Active."""
    _safe_send(_send_adhoc_expired_notification, delegation)


# ── Internal senders ─────────────────────────────────────────────────────────

def _safe_send(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except Exception:
        frappe.logger().error(frappe.get_traceback())


def _send_temporary_created_notification(delegation):
    delegator_name = delegation.delegator_name or delegation.delegator
    frappe.sendmail(
        recipients=[delegation.delegate, delegation.delegator],
        subject=_("Delegation Created — Temporary Approval Authority"),
        message=_(
            "{0} has delegated their approvals to you from {1} to {2}."
        ).format(
            frappe.utils.escape_html(delegator_name),
            frappe.utils.escape_html(str(delegation.from_date)),
            frappe.utils.escape_html(str(delegation.to_date)),
        ),
    )


def _send_permanent_created_notification(delegation):
    delegator_name = delegation.delegator_name or delegation.delegator
    frappe.sendmail(
        recipients=[delegation.delegate, delegation.delegator],
        subject=_("Delegation Created — Permanent Approval Authority"),
        message=_(
            "{0} has assigned you as a permanent delegate."
        ).format(
            frappe.utils.escape_html(delegator_name),
        ),
    )


def _send_adhoc_created_notification(delegation):
    delegator_name = delegation.delegator_name or delegation.delegator
    frappe.sendmail(
        recipients=[delegation.delegate],
        subject=_("Delegation Created — Document Approval Delegated"),
        message=_(
            "{0} has delegated {1} to you. Comment: {2}"
        ).format(
            frappe.utils.escape_html(delegator_name),
            frappe.utils.escape_html(delegation.reference_name or ""),
            frappe.utils.escape_html(delegation.comment or ""),
        ),
    )


def _send_initiator_notification(delegation):
    """Notify the document initiator (owner) that an approval has been delegated."""
    if not delegation.reference_doctype or not delegation.reference_name:
        return

    initiator = frappe.db.get_value(
        delegation.reference_doctype, delegation.reference_name, "owner"
    )
    if not initiator or initiator in (delegation.delegator, delegation.delegate):
        return

    delegator_name = delegation.delegator_name or delegation.delegator
    delegate_name = delegation.delegate_name or delegation.delegate
    frappe.sendmail(
        recipients=[initiator],
        subject=_("Approval Delegated — {0}").format(delegation.reference_name),
        message=_(
            "The approval for {0} has been delegated from {1} to {2}."
        ).format(
            frappe.utils.escape_html(delegation.reference_name),
            frappe.utils.escape_html(delegator_name),
            frappe.utils.escape_html(delegate_name),
        ),
    )


def _send_permanent_revoked_notification(delegation):
    delegator_name = delegation.delegator_name or delegation.delegator
    frappe.sendmail(
        recipients=[delegation.delegate, delegation.delegator],
        subject=_("Delegation Revoked — Permanent Authority Removed"),
        message=_(
            "Permanent delegation from {0} has been revoked."
        ).format(
            frappe.utils.escape_html(delegator_name),
        ),
    )


def _send_adhoc_expired_notification(delegation):
    delegate_name = delegation.delegate_name or delegation.delegate
    frappe.sendmail(
        recipients=[delegation.delegator],
        subject=_("Delegation Resolved — {0}").format(delegation.reference_name or ""),
        message=_(
            "Your delegation of {0} to {1} has been resolved."
        ).format(
            frappe.utils.escape_html(delegation.reference_name or ""),
            frappe.utils.escape_html(delegate_name),
        ),
    )


def _send_expiry_notification(delegation):
    """Temporary delegation expired — sent by the daily scheduler job."""
    try:
        delegator_name = delegation.delegator_name or delegation.delegator
        frappe.sendmail(
            recipients=[delegation.delegator, delegation.delegate],
            subject=_("Delegation Expired — Authority Reverted"),
            message=_(
                "Delegation period has ended. Approvals have reverted to {0}."
            ).format(
                frappe.utils.escape_html(delegator_name),
            ),
        )
    except Exception:
        frappe.logger().error(frappe.get_traceback())
