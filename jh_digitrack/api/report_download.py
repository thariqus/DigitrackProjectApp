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
    """
    Generate and download the PMS summary report as an Excel file (.xlsx)
    using the same data source as the frontend summary.
    """
    try:
        summary_response = get_goal_assessment_summary(year=year, manager=manager)
        data = summary_response.get("message", [])
        year = summary_response.get("year")

        if not data:
            frappe.throw("No summary data available for this selection.")

        wb = Workbook()
        ws = wb.active
        ws.title = "PMS Summary"

        headers = [
            {"label": "Manager Name", "key": "manager_name"},
            {"label": "No. of Employees", "key": "employee_count"},
            {"label": "Goals Pending", "key": "goals_pending"},
            {"label": "Goals Started", "key": "goals_started"},
            {"label": "Goals Submitted", "key": "goals_submitted"},
            {"label": "Evaluation Pending", "key": "evaluation_pending"},
            {"label": "Evaluation Started", "key": "evaluation_started"},
            {"label": "Evaluation Submitted", "key": "evaluation_submitted"},
        ]

        ws.merge_cells("A1:H1")
        ws["A1"] = f"PMS Summary Report - {year}"
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws.append([])

        ws.append([h["label"] for h in headers])
        header_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

        for cell in ws[3]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        for row in data:
            ws.append([row.get(h["key"], 0) for h in headers])

   
        for i, column_cells in enumerate(ws.columns, 1):
            max_length = max(len(str(cell.value or "")) for cell in column_cells)
            ws.column_dimensions[get_column_letter(i)].width = max_length + 2

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"PMS_Report_{year}_{datetime.now().strftime('%d%b%Y-%I%M%p')}.xlsx"
        response = Response(output.getvalue())
        response.headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PMS Report Excel Generation Error")
        frappe.throw(_("Error generating Excel: ") + str(e))
