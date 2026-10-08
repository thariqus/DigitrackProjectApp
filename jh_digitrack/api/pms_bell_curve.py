import frappe
from frappe import _
from frappe.utils import cint, flt

from jh_digitrack.api.pms_report import get_pms_years

RATINGS = (1, 2, 3, 4, 5)

# Goal Assessment statuses that mean HR has uploaded the final rating
HR_RATED_STATUSES = ("HR Submitted", "Evaluation Submitted")


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


def _get_scoped_employee_codes(admin_code, department=None):
    """Employees the admin sees in the admin report: PMS employees under
    PMS managers in the admin's cost centers, filtered by manager department."""
    cost_centers = frappe.db.get_all(
        "PMS Admin Access List",
        filters={"admin_emp_id": admin_code},
        pluck="cost_center",
    )
    if not cost_centers:
        return []

    manager_filters = {"cost_center_name": ["in", cost_centers], "pms_manager": 1}
    if department:
        manager_filters["department_name"] = department

    manager_codes = frappe.db.get_all(
        "PMS Employees", filters=manager_filters, pluck="employee_code"
    )
    if not manager_codes:
        return []

    return list(set(frappe.db.get_all(
        "PMS Employees",
        filters={"manager_code": ["in", manager_codes], "pms_employee": 1},
        pluck="employee_code",
    )))


@frappe.whitelist(methods=["GET"])
def get_bell_curve(year=None, department=None):
    admin_code = _get_pms_admin_code()

    current_year, _current_quarterly, _years = get_pms_years()
    year = year or current_year
    if not year:
        frappe.throw(_("Assessment year not found in PMS Settings"))

    if department in (None, "", "All"):
        department = None

    counts = dict.fromkeys(RATINGS, 0)
    employee_codes = _get_scoped_employee_codes(admin_code, department)
    if employee_codes:
        for ga in frappe.db.get_all(
            "Goal Assessment",
            filters={
                "year": year,
                "status": ["in", HR_RATED_STATUSES],
                "employee_code": ["in", employee_codes],
            },
            fields=["hr_rating"],
        ):
            # Rating fieldtype stores a 0-1 fraction (5 stars = 1.0)
            rating = round(flt(ga.hr_rating) * 5)
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
        "department": department,
        "configured": configured,
        "total": total,
        "rows": rows,
    }
