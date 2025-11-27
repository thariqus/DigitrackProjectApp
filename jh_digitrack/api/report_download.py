import frappe
import io
from datetime import datetime
from frappe import _
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from werkzeug.wrappers import Response
from openpyxl.utils import get_column_letter
from jh_digitrack.api.pms_report import get_goal_assessment_summary

@frappe.whitelist()
def download_excel(year=None, manager=None):
    try:
        summary_response = get_goal_assessment_summary(year=year, manager=manager)
        data = summary_response.get("message", [])
        year = summary_response.get("year")

        if not data:
            frappe.throw("No summary data available for this selection.")

        wb = Workbook()
        header_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

        # =====================================================
        # SHEET 1 - PMS SUMMARY REPORT - {year}
        # =====================================================
        ws = wb.active
        ws.title = f"PMS Summary Report - {year}"

        sheet1_headers = [
            "Year",
            "Manager Name",
            "Status",
            "No. of Employees",
            "Goals Pending",
            "Goals Started",
            "Goals Submitted",
            "Evaluation Pending",
            "Evaluation Started",
            "Evaluation Submitted",
        ]

        ws.append(sheet1_headers)

        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        for row in data:
            employee_count = row.get("employee_count") or 0
            goals_pending = row.get("goals_pending") or 0
            evaluation_submitted = row.get("evaluation_submitted") or 0

            if employee_count == evaluation_submitted:
                status = "Completed"
            elif employee_count == goals_pending:
                status = "Yet to start"
            else:
                status = "In Progress"
            ws.append([
                year,
                row.get("manager_name"),
                status,
                row.get("employee_count"),
                row.get("goals_pending"),
                row.get("goals_started"),
                row.get("goals_submitted"),
                row.get("evaluation_pending"),
                row.get("evaluation_started"),
                row.get("evaluation_submitted"),
            ])

        # Auto width
        for i, col in enumerate(ws.columns, 1):
            max_length = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[get_column_letter(i)].width = max_length + 2

        # =====================================================
        # SHEET 2 - EMPLOYEE STATUS REPORT - {year}
        # =====================================================
    
        ws2 = wb.create_sheet(f"Employee Status Report - {year}")

        sheet2_headers = [
            "Year",
            "Employee Code",
            "Employee Name",
            "Manager Code",
            "Manager Name",
            "Status",
            "Total Score",
            "Comment",
        ]
        ws2.append(sheet2_headers)

        for cell in ws2[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        for row in data:
            manager_name = row.get("manager_name")
            manager_email = row.get("manager")

            manager_code = frappe.db.get_value(
                "PMS Employees",
                {"employee_email": manager_email},
                "name"
            ) or ""

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
                    employee_code = emp.get("employee_code") or ""
                    employee_name = emp.get("employee_name") or ""

                    assessment = frappe.db.get_value(
                        "Goal Assessment",
                        {"employee_code": employee_code, "year": year},
                        ["comment", "total_score"],
                        as_dict=True
                    ) or {}

                    comment = assessment.get("comment") or ""
                    total_score = ""

                    if status_label == "Evaluation Submitted":
                        total_score = assessment.get("total_score") or ""

                    ws2.append([
                        year,
                        employee_code,
                        employee_name,
                        manager_code,
                        manager_name,
                        status_label,
                        total_score,
                        comment,
                    ])

        for i, col in enumerate(ws2.columns, 1):
            max_length = max(len(str(cell.value or "")) for cell in col)
            ws2.column_dimensions[get_column_letter(i)].width = max_length + 3


        # =====================================================
        # SHEET 3 - GOAL ASSESSMENT DETAILS - {year}
        # =====================================================
        ws3 = wb.create_sheet(f"Goal Assessment Details - {year}")

        manager_fields = {
            "manager_code": "Manager Code",
            "manager_name": "Manager Name"
        }

        parent_fields = {
            "year": "Year",
            "employee_code": "Employee Code",
            "employee_name": "Employee Name",
            "status": "Status",
            "total_score": "Total Score",
            "comment": "Comment"
        }

        child_fields = {
            "goal_id": "Goal ID",
            "goal_name": "Goal Name",
            "description": "Description",
            "measurement_criteria": "Measurement Criteria",
            "uom": "UOM",
            "target": "Target",
            "weightage": "Weightage",
            "achievement_score": "Achievement Value",
            "achieved_score": "Achieved Score",
            "upwarddownward": "Upward Downward",
            "remark": "Remark"
        }

        headers = list(manager_fields.values()) + list(parent_fields.values()) + list(child_fields.values())
        ws3.append(headers)

        for cell in ws3[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        ga_docs = frappe.get_all(
            "Goal Assessment",
            filters={"year": year, "manager": manager},
            fields="*"
        )

        for ga in ga_docs:
            mdata = frappe.db.get_value(
                "PMS Employees",
                {"employee_email": ga.manager},
                ["name", "full_name"],
                as_dict=True
            ) or {}

            manager_code = mdata.get("name", "")
            manager_name = mdata.get("full_name", "")

            manager_values = [manager_code, manager_name]
            parent_values = [ga.get(f) for f in parent_fields.keys()]

            child_rows = frappe.get_all(
                "Employee Goals",
                filters={"parent": ga.name},
                fields="*"
            )

            if child_rows:
                for child in child_rows:
                    ws3.append(manager_values + parent_values + [child.get(f) for f in child_fields.keys()])
            else:
                ws3.append(manager_values + parent_values + [""] * len(child_fields))

        for i, col in enumerate(ws3.columns, 1):
            max_length = max(len(str(cell.value or "")) for cell in col)
            ws3.column_dimensions[get_column_letter(i)].width = max_length + 3

        # =====================================================
        # OUTPUT FILE
        # =====================================================
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"PMS_Report_{year}_{datetime.now().strftime('%d%b%Y-%I%M%p')}.xlsx"
        response = Response(output.getvalue())
        response.headers["Content-Type"] = \
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PMS Report Excel Generation Error")
        frappe.throw(_("Error generating Excel: ") + str(e))
