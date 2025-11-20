import frappe
import io
import zipfile
from datetime import datetime
from frappe import _
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter
from werkzeug.wrappers import Response
from jh_digitrack.api.pms_report import get_goal_assessment_summary

@frappe.whitelist()
def download_excel(year=None, manager=None):
    try:
        summary_response = get_goal_assessment_summary(year=year, manager=manager)
        data = summary_response.get("message", [])
        year = summary_response.get("year")

        if not data:
            frappe.throw("No summary data available for this selection.")

        header_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

        # =====================================================================
        # FILE 1 – PMS SUMMARY
        # =====================================================================
        wb1 = Workbook()
        ws1 = wb1.active
        ws1.title = "PMS Summary"

        ws1.merge_cells("A1:H1")
        ws1["A1"] = f"PMS Summary Report - {year}"
        ws1["A1"].font = Font(bold=True, size=14)
        ws1["A1"].alignment = Alignment(horizontal="center")

        ws1.append([])

        summary_headers = [
            {"label": "Manager Name", "key": "manager_name"},
            {"label": "No. of Employees", "key": "employee_count"},
            {"label": "Goals Pending", "key": "goals_pending"},
            {"label": "Goals Started", "key": "goals_started"},
            {"label": "Goals Submitted", "key": "goals_submitted"},
            {"label": "Evaluation Pending", "key": "evaluation_pending"},
            {"label": "Evaluation Started", "key": "evaluation_started"},
            {"label": "Evaluation Submitted", "key": "evaluation_submitted"},
        ]

        ws1.append([h["label"] for h in summary_headers])
        for cell in ws1[3]:
            cell.font = Font(bold=True)
            cell.fill = header_fill

        for row in data:
            ws1.append([row.get(h["key"], 0) for h in summary_headers])

        for i, col in enumerate(ws1.columns, 1):
            ws1.column_dimensions[get_column_letter(i)].width = 20

        out1 = io.BytesIO()
        wb1.save(out1)
        out1.seek(0)

        # =====================================================================
        # FILE 2 – EMPLOYEE STATUS
        # =====================================================================
        wb2 = Workbook()
        ws2 = wb2.active
        ws2.title = "Employee Status"

        ws2.merge_cells("A1:F1")
        ws2["A1"] = f"Employee Status Report - {year}"
        ws2["A1"].font = Font(bold=True, size=14)
        ws2["A1"].alignment = Alignment(horizontal="center")

        ws2.append([])

        emp_headers = [
            "Employee Name", "Manager Name", "Manager Code",
            "Manager Comment", "Status", "Total Score"
        ]

        ws2.append(emp_headers)
        for cell in ws2[3]:
            cell.font = Font(bold=True)
            cell.fill = header_fill

        for row in data:
            manager_name = row.get("manager_name")

            manager_code = ""
            pms_doc = frappe.db.get_value(
                "PMS Employees",
                {"full_name": manager_name},
                ["name"],
                as_dict=True
            )
            if pms_doc:
                manager_code = pms_doc.name

            employee_groups = [
                ("Goals Pending", row.get("goals_pending_employees") or []),
                ("Goals Started", row.get("goals_started_employees") or []),
                ("Goals Submitted", row.get("goals_submitted_employees") or []),
                ("Evaluation Pending", row.get("evaluation_pending_employees") or []),
                ("Evaluation Started", row.get("evaluation_started_employees") or []),
                ("Evaluation Submitted", row.get("evaluation_submitted_employees") or []),
            ]

            for status_label, emp_list in employee_groups:
                for emp in emp_list:

                    manager_comment = frappe.db.get_value(
                        "Goal Assessment",
                        {"employee_code": emp.get("employee_code"), "year": year},
                        "comment"
                    ) or ""

                    total_score = ""
                    if status_label == "Evaluation Submitted":
                        total_score = frappe.db.get_value(
                            "Goal Assessment",
                            {"employee_code": emp.get("employee_code"), "year": year},
                            "total_score"
                        ) or ""

                    ws2.append([
                        emp.get("employee_name"),
                        manager_name,
                        manager_code,
                        manager_comment,
                        status_label,
                        total_score
                    ])

        for i, col in enumerate(ws2.columns, 1):
            ws2.column_dimensions[get_column_letter(i)].width = 25

        out2 = io.BytesIO()
        wb2.save(out2)
        out2.seek(0)

        # =====================================================================
        # FILE 3 – GOAL ASSESSMENT DETAILS
        # =====================================================================
        wb3 = Workbook()
        ws3 = wb3.active
        ws3.title = "Goal Assessment Details"

        ws3.merge_cells("A1:Q1")
        ws3["A1"] = f"Goal Assessment Details - {year}"
        ws3["A1"].font = Font(bold=True, size=14)
        ws3["A1"].alignment = Alignment(horizontal="center")

        ws3.append([])

        manager_fields = {"manager_code": "Manager Code", "manager_name": "Manager Name"}
        parent_fields = {
            "year": "Year", "employee_code": "Employee Code", "employee_name": "Employee Name",
            "status": "Status", "total_score": "Total Score", "comment": "Comment"
        }
        child_fields = {
            "goal_id": "Goal ID", "goal_name": "Goal Name", "description": "Description",
            "measurement_criteria": "Measurement Criteria", "uom": "UOM", "target": "Target",
            "weightage": "Weightage", "achievement_score": "Achievement Score",
            "achieved_score": "Achieved Score", "upwarddownward": "Upward/Downward", "remark": "Remark"
        }

        ws3.append(list(manager_fields.values()) + list(parent_fields.values()) + list(child_fields.values()))
        for cell in ws3[3]:
            cell.font = Font(bold=True)
            cell.fill = header_fill

        ga_docs = frappe.get_all("Goal Assessment", filters={"year": year, "manager": manager}, fields="*")

        for ga in ga_docs:
            manager_code, manager_name = "", ""
            if ga.manager:
                pms = frappe.db.get_value(
                    "PMS Employees", {"employee_email": ga.manager},
                    ["name", "full_name"], as_dict=True
                )
                if pms:
                    manager_code, manager_name = pms.name, pms.full_name

            parent_values = [ga.get(f) for f in parent_fields.keys()]
            child_rows = frappe.get_all("Employee Goals", filters={"parent": ga.name}, fields="*")

            if child_rows:
                for child in child_rows:
                    ws3.append([manager_code, manager_name] + parent_values +
                               [child.get(f) for f in child_fields.keys()])
            else:
                ws3.append([manager_code, manager_name] + parent_values + [""] * len(child_fields))

        out3 = io.BytesIO()
        wb3.save(out3)
        out3.seek(0)

        # =====================================================================
        # CREATE ZIP FILE
        # =====================================================================
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w") as z:
            z.writestr(f"PMS_Summary_{year}.xlsx", out1.getvalue())
            z.writestr(f"PMS_Employee_Status_{year}.xlsx", out2.getvalue())
            z.writestr(f"PMS_Goal_Assessment_{year}.xlsx", out3.getvalue())

        zip_buffer.seek(0)

        filename = f"PMS_Report_{year}_{datetime.now().strftime('%d%b%Y-%I%M%p')}.zip"

        response = Response(zip_buffer.getvalue())
        response.headers["Content-Type"] = "application/zip"
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PMS Multi-Excel Report Error")
        frappe.throw(_("Error generating Excel: ") + str(e))



