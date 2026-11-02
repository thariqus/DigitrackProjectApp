import frappe
from frappe import _
from frappe.utils import cint, flt

from jh_digitrack.api.pms_report import _get_admin_scoped_employees, get_pms_years

RATINGS = (1, 2, 3, 4, 5)

# Rating basis the bell curve can be drawn on: Goal Assessment rating field
# and the statuses at which that rating is final
RATING_TYPES = {
    # HR has uploaded the final rating
    "hr": {
        "field": "hr_rating",
        "statuses": ("HR Submitted", "Evaluation Submitted"),
    },
    # Skip-level manager has submitted; the evaluation has moved on to HR.
    # Evaluations that skipped the skip-level stage have no rating and drop out.
    "skip_level": {
        "field": "skip_level_manager_rating",
        "statuses": ("HR Review", "HR Submitted", "Evaluation Submitted"),
    },
}


def _get_pms_admin_code():
    employee_code = frappe.db.get_value(
        "JH User Master", {"email": frappe.session.user}, "employee_code"
    )
    if not employee_code or not frappe.db.get_value(
        "PMS Employees", {"employee_code": employee_code}, "pms_admin"
    ):
        frappe.throw(_("Only PMS Admins can view the bell curve"), frappe.PermissionError)
    return employee_code


def _get_expected_percentages():
    """Expected % per rating from PMS Settings > Bell Curve; empty if not configured."""
    rows = frappe.get_single("PMS Settings").bell_curve_ratings
    return {cint(row.rating): flt(row.expected_percentage) for row in rows}


@frappe.whitelist(methods=["GET"])
def get_bell_curve(year=None, entity=None, business_unit=None, rating_type="hr"):
    admin_code = _get_pms_admin_code()

    rating_type = rating_type or "hr"
    if rating_type not in RATING_TYPES:
        frappe.throw(_("Invalid rating type: {0}").format(rating_type))
    rating_field = RATING_TYPES[rating_type]["field"]

    current_year, _current_quarterly, _years = get_pms_years()
    year = year or current_year
    if not year:
        frappe.throw(_("Assessment year not found in PMS Settings"))

    if entity in (None, "", "All"):
        entity = None
    if business_unit in (None, "", "All"):
        business_unit = None

    scoped_employees = _get_admin_scoped_employees(admin_code)
    # Filter options cover the admin's whole scope, not just the selected entity / unit
    entities = sorted(
        {e.entity_name for e in scoped_employees if e.entity_name}, key=str.casefold
    )
    # Unit-entity pairs let the frontend narrow the unit dropdown to the chosen entity
    business_units = [
        {"business_unit": bu, "entity": ent}
        for bu, ent in sorted(
            {(e.business_unit, e.entity_name or "") for e in scoped_employees if e.business_unit},
            key=lambda pair: (pair[0].casefold(), pair[1].casefold()),
        )
    ]
    employee_codes = list({
        e.employee_code
        for e in scoped_employees
        if (not entity or e.entity_name == entity)
        and (not business_unit or e.business_unit == business_unit)
    })

    counts = dict.fromkeys(RATINGS, 0)
    if employee_codes:
        for ga in frappe.db.get_all(
            "Goal Assessment",
            filters={
                "year": year,
                "status": ["in", RATING_TYPES[rating_type]["statuses"]],
                "employee_code": ["in", employee_codes],
                rating_field: [">", 0],
            },
            fields=[rating_field],
        ):
            # Rating fieldtype stores a 0-1 fraction (5 stars = 1.0)
            rating = round(flt(ga[rating_field]) * 5)
            if rating in counts:
                counts[rating] += 1

    total = sum(counts.values())
    expected = _get_expected_percentages()
    configured = bool(expected)

    rows = []
    for rating in RATINGS:
        actual_percentage = flt(counts[rating] * 100 / total, 2) if total else 0
        # Expected and gap stay None until the bell curve is set up in PMS Settings
        expected_percentage = flt(expected.get(rating, 0), 2) if configured else None
        rows.append({
            "rating": rating,
            "expected_percentage": expected_percentage,
            "actual_percentage": actual_percentage,
            "count": counts[rating],
            "gap": flt(actual_percentage - expected_percentage, 2) if configured else None,
        })

    return {
        "year": year,
        "entity": entity,
        "business_unit": business_unit,
        "rating_type": rating_type,
        "entities": entities,
        "business_units": business_units,
        "configured": configured,
        "total": total,
        "rows": rows,
    }
