import frappe
import io
from datetime import datetime
from frappe import _
from frappe.utils import flt
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from werkzeug.wrappers import Response
from openpyxl.utils import get_column_letter
from jh_digitrack.api.pms_report import get_goal_assessment_summary, STATUS_BUCKETS

# The "Rating" fieldtype on Goal Assessment stores a 0-1 fraction (5 stars =
# 1.0); reports should show the plain 1-5 scale reviewers actually picked.
RATING_FIELDS = {"rating", "functional_manager_rating", "skip_level_manager_rating", "hr_rating"}


def _to_star_rating(value):
    if value in (None, ""):
        return ""
    return round(flt(value) * 5)

@frappe.whitelist(methods=["GET"])
def download_excel(year=None, manager=None, view_type="team"):
    try:
        # =====================================================
        # SELECT WHICH SUMMARY FUNCTION TO CALL
        # =====================================================
        if view_type == "org":
            summary_response = frappe.call(
                "jh_digitrack.api.pms_report.get_goal_assessment_summary_org",
                year=year,
                manager=manager
            )
        elif view_type == "admin":
            summary_response = frappe.call(
                "jh_digitrack.api.pms_report.get_goal_assessment_summary_admin",
                year=year,
                manager=manager
            )
        else:
            summary_response = frappe.call(
                "jh_digitrack.api.pms_report.get_goal_assessment_summary",
                year=year,
                manager=manager
            )

        if isinstance(summary_response, dict) and "message" in summary_response:
            summary_response = summary_response

        data = summary_response.get("message", [])
        # year = summary_response.get("year")
        year = year or summary_response.get("current_year")

        if not data:
            frappe.throw("No summary data available for this selection.")


        wb = Workbook()
        header_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

        # =====================================================
        # SHEET 1 - PMS SUMMARY REPORT - {year}
        # =====================================================
        ws = wb.active
        ws.title = f"PMS Summary Report - {year}"

        # Only the admin summary computes the not-participating count
        show_not_participating = view_type == "admin"

        sheet1_headers = [
            "Year",
            "Manager Name",
            "Status",
            "No. of Employees",
        ] + (["Not Participating"] if show_not_participating else []) + [
            label for _key, label in STATUS_BUCKETS
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
            ] + ([row.get("not_participating") or 0] if show_not_participating else []) + [
                row.get(key) or 0 for key, _label in STATUS_BUCKETS
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
            "Cost Center",
            "Designation",
            "Entity",
            "Department",
            "OU",
            "Grade",
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
                (key, label, row.get(f"{key}_employees") or [])
                for key, label in STATUS_BUCKETS
            ]

            for status_key, status_label, emp_list in employee_groups:
                for emp in emp_list:
                    employee_code = emp.get("employee_code") or ""
                    employee_name = emp.get("employee_name") or ""

                    emp_details = frappe.db.get_value(
                        "PMS Employees",
                        {"name": employee_code},
                        [
                            "cost_center_name",
                            "designation_name",
                            "entity_name",
                            "department_name",
                            "ou_name",
                            "grade_name"
                        ],
                        as_dict=True
                    ) or {}

                    cost_center = emp_details.get("cost_center_name") or ""
                    designation = emp_details.get("designation_name") or ""
                    entity = emp_details.get("entity_name") or ""
                    department = emp_details.get("department_name") or ""
                    ou = emp_details.get("ou_name") or ""
                    grade = emp_details.get("grade_name") or ""

                    assessment = frappe.db.get_value(
                        "Goal Assessment",
                        {"employee_code": employee_code, "year": year},
                        ["comment", "total_score"],
                        as_dict=True
                    ) or {}

                    comment = assessment.get("comment") or ""
                    total_score = ""

                    if status_key == "evaluation_submitted":
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
                        cost_center,
                        designation,
                        entity,
                        department,
                        ou,
                        grade,
                    ])
                    row_idx = ws2.max_row
                    set_two_decimal(ws2.cell(row=row_idx, column=7))  # Total Score

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
            
            "eligible_for_increment": "Eligible for Increment",
            "training_requirement_identified": "Training Requirement Identified",
            "eligible_for_promotion": "Eligible for Promotion",
            "goal_name_for_yearly_assesment": "Goal Name for Yearly Assessment",
            "rating": "Rating",
            "comment": "Manager Comment",
            "functional_manager_rating": "Functional Manager Rating",
            "functional_manager_comment": "Functional Manager Comment",
            "skip_level_manager_rating": "Skip Level Manager Rating",
            "skip_level_manager_comment": "Skip Level Manager Comment",
            "hr_rating": "HR Rating",
            "hr_comment": "HR Comment",
            "functional_manager_submitted_on": "Functional Manager Submitted On",
            "skip_level_manager_submitted_on": "Skip Level Manager Submitted On",
            "manager_submitted_on": "Manager Submitted On"
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

        # 1-based column positions of the numeric columns shown with two decimals
        field_order = list(manager_fields) + list(parent_fields) + list(child_fields)
        total_score_col = field_order.index("total_score") + 1
        decimal_cols = [total_score_col] + [
            field_order.index(f) + 1 for f in ("weightage", "achievement_score", "achieved_score")
        ]

        for cell in ws3[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        all_emp_codes = set()
        for row in data:
            groups = [row.get(f"{key}_employees") or [] for key, _label in STATUS_BUCKETS]
            for grp in groups:
                for e in grp:
                    all_emp_codes.add(e["employee_code"])

        ga_docs = frappe.get_all(
            "Goal Assessment",
            filters={"year": year, "employee_code": ["in", list(all_emp_codes)]},
            fields="*"
        )

        for ga in ga_docs:
            mdata = frappe.db.get_value(
                "JH User Master",
                {"email": ga.manager},
                ["employee_code", "full_name"],
                as_dict=True
            ) or {}

            manager_code = mdata.get("employee_code", "")
            manager_name = mdata.get("full_name", "")

            manager_values = [manager_code, manager_name]
            parent_values = [
                _to_star_rating(ga.get(f)) if f in RATING_FIELDS else ga.get(f)
                for f in parent_fields.keys()
            ]

            child_rows = frappe.get_all(
                "Employee Goals",
                filters={"parent": ga.name},
                fields="*"
            )

            if child_rows:
                for child in child_rows:
                    ws3.append(
                        manager_values +
                        parent_values +
                        [child.get(f) for f in child_fields.keys()]
                    )

                    row_idx = ws3.max_row
                    for col in decimal_cols:
                        set_two_decimal(ws3.cell(row=row_idx, column=col))

            else:
                ws3.append(manager_values + parent_values + [""] * len(child_fields))

                row_idx = ws3.max_row
                set_two_decimal(ws3.cell(row=row_idx, column=total_score_col))

        for i, col in enumerate(ws3.columns, 1):
            max_length = max(len(str(cell.value or "")) for cell in col)
            # Capped so long comment columns don't become unreadably wide
            ws3.column_dimensions[get_column_letter(i)].width = min(max_length + 3, 60)

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


@frappe.whitelist(methods=["GET"])
def download_self_evaluation_excel(year, employee_code):
    try:
        if not year or not employee_code:
            frappe.throw("Year and Employee Code are required")

        # -----------------------------------------------------
        # Fetch Goal Assessment (SELF)
        # -----------------------------------------------------
        ga = frappe.db.get_value(
            "Goal Assessment",
            {"year": year, "employee_code": employee_code},
            "*",
            as_dict=True
        )

        if not ga:
            frappe.throw("No Goal Assessment found for this year")
        manager_data = frappe.db.get_value(
            "PMS Employees",
            {"employee_email": ga.manager},
            ["name", "full_name"],
            as_dict=True
        ) or {}

        manager_code = manager_data.get("name", "")
        manager_name = manager_data.get("full_name", "")

        # -----------------------------------------------------
        # Employee details (includes manager info)
        # -----------------------------------------------------
        emp = frappe.db.get_value(
            "PMS Employees",
            {"name": employee_code},
            [
                "full_name",
                "cost_center_name",
                "manager_code",
                "designation_name",
                "entity_name",
                "department_name",
                "ou_name",
                "grade_name",
            ],
            as_dict=True
        ) or {}


        # Status from Goal Assessment (NOT workflow_state)
        status = ga.status or ""
        manager_code = emp.get("manager_code", "")
        manager_name = ""

        if manager_code:
            manager_name = frappe.db.get_value(
                "PMS Employees",
                {"name": manager_code},
                "full_name"
            ) or ""

        # -----------------------------------------------------
        # Create Excel
        # -----------------------------------------------------
        wb = Workbook()
        ws = wb.active
        # ws.title = f"Goal Assessment - {year}"
        ws.title = str(year)


        header_fill = PatternFill(
            start_color="D9D9D9",
            end_color="D9D9D9",
            fill_type="solid"
        )

        headers = [
            "Year",
            "Employee Code",
            "Employee Name",
            "Manager Code",
            "Manager Name",
            "Status",
            "Total Score",
            "Comment",
            "Cost Center",
            "Designation",
            "Entity",
            "Department",
            "OU",
            "Grade",
            "Goal ID",
            "Goal Name",
            "Description",
            "Measurement Criteria",
            "UOM",
            "Target",
            "Weightage",
            "Achievement Value",
            "Achieved Score",
            "Upward / Downward",
            "Remark",
        ]

        ws.append(headers)

        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        # -----------------------------------------------------
        # Fetch Employee Goals
        # -----------------------------------------------------
        goals = frappe.get_all(
            "Employee Goals",
            filters={"parent": ga.name},
            fields="*"
        )

        for g in goals:
            ws.append([
                year,
                employee_code,
                emp.get("full_name"),
                manager_code,
                manager_name,
                status,
                ga.total_score,
                ga.comment,
                emp.get("cost_center_name"),
                emp.get("designation_name"),
                emp.get("entity_name"),
                emp.get("department_name"),
                emp.get("ou_name"),
                emp.get("grade_name"),
                g.goal_id,
                g.goal_name,
                g.description,
                g.measurement_criteria,
                g.uom,
                g.target,
                g.weightage,
                g.achievement_score,
                g.achieved_score,
                g.upwarddownward,
                g.remark,
            ])
            row_idx = ws.max_row
            set_two_decimal(ws.cell(row=row_idx, column=7))   # Total Score
            set_two_decimal(ws.cell(row=row_idx, column=20))  # Target
            set_two_decimal(ws.cell(row=row_idx, column=21))  # Weightage
            set_two_decimal(ws.cell(row=row_idx, column=22))  # Achievement Value
            set_two_decimal(ws.cell(row=row_idx, column=23)) 
        # Auto width
        for i, col in enumerate(ws.columns, 1):
            max_len = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[get_column_letter(i)].width = max_len + 3

        # -----------------------------------------------------
        # Frappe Response (Correct Way)
        # -----------------------------------------------------
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        # frappe.response.filename = f"Self_Evaluation_{employee_code}_{year}.xlsx"
        frappe.response.filename = (f"PMS_Report_{year}_{datetime.now().strftime('%d%b%Y-%I%M%p')}.xlsx")
        frappe.response.filecontent = output.getvalue()
        frappe.response.type = "binary"

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Self Evaluation Excel Error")
        frappe.throw(str(e))


import frappe
import io
from datetime import datetime
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm


@frappe.whitelist(methods=["GET"])
def download_self_evaluation_pdf(year, employee_code):
    try:
        if not year or not employee_code:
            frappe.throw("Year and Employee Code are required")

        # -----------------------------------------------------
        # Goal Assessment
        # -----------------------------------------------------
        ga = frappe.db.get_value(
            "Goal Assessment",
            {"year": year, "employee_code": employee_code},
            "*",
            as_dict=True
        )

        if not ga:
            frappe.throw("No Goal Assessment found")

        # -----------------------------------------------------
        # Employee
        # -----------------------------------------------------
        emp = frappe.db.get_value(
            "PMS Employees",
            {"name": employee_code},
            [
                "full_name",
                "designation_name",
                "department_name",
                "cost_center_name",
                "entity_name",
                "ou_name",
                "band",
                "manager_code"
            ],
            as_dict=True
        ) or {}

        # -----------------------------------------------------
        # Manager (CORRECT LOGIC)
        # -----------------------------------------------------
        manager_name = ""
        manager_code = emp.get("manager_code")

        if manager_code:
            manager_name = frappe.db.get_value(
                "PMS Employees",
                {"name": manager_code},
                "full_name"
            ) or ""

        # -----------------------------------------------------
        # Goals
        # -----------------------------------------------------
        goals = frappe.get_all(
            "Employee Goals",
            filters={"parent": ga.name},
            fields="*"
        )

        # -----------------------------------------------------
        # PDF SETUP
        # -----------------------------------------------------
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20,
            leftMargin=20,
            topMargin=20,
            bottomMargin=20
        )
        usable_width = A4[0] - doc.leftMargin - doc.rightMargin

        styles = getSampleStyleSheet()

        styles["Title"].fontSize = 14
        styles["Title"].alignment = 1
        styles["Title"].spaceAfter = 12

        styles.add(ParagraphStyle(
            name="TableText",
            fontSize=7,
            leading=9,
        ))

        styles.add(ParagraphStyle(name="Label", fontSize=9))
        styles.add(ParagraphStyle(name="Value", fontSize=9))

        def P(text):
            return Paragraph(str(text or ""), styles["TableText"])


        elements = []

        # -----------------------------------------------------
        # TITLE
        # -----------------------------------------------------
        # elements.append(Paragraph("Goal / Evaluation Form", styles["Title"]))
        elements.append(Paragraph("Goal Assessment Details", styles["Title"]))
        elements.append(Spacer(1, 6))
        # -----------------------------------------------------
        # Goal Evaluation Period (FROM YEAR)
        # -----------------------------------------------------
        settings_row = frappe.db.get_value(
            "PMS Settings Table",
            {"parent": "PMS Settings", "year": year},
            ["from_date", "to_date"],
            as_dict=True
        )

        if settings_row:
            start_date = settings_row.get("from_date").strftime("%d-%b-%Y") if settings_row.get("from_date") else ""
            end_date = settings_row.get("to_date").strftime("%d-%b-%Y") if settings_row.get("to_date") else ""
        else:
            start_date = ""
            end_date = ""

        evaluation_period = f"{start_date} to {end_date}"

        # -----------------------------------------------------
        # HEADER TABLE
        # -----------------------------------------------------
        header_data = [
            # ["Goal evaluation period :", year, "", "Printed Date :", datetime.now().strftime("%d-%b-%Y")],
            [
                "Goal Evaluation Period:",
                evaluation_period,
                "Printed Date:",
                datetime.now().strftime("%d-%b-%Y")
            ],
            ["Employee Code", employee_code, "Employee Name", emp.get("full_name")],
            ["Designation", emp.get("designation_name"), "Department", emp.get("department_name")],
            ["Grade", emp.get("band"), "Status", ga.status],
            ["Manager Name", manager_name, "Total Score", format_two_decimals(ga.total_score)],
            # ["", "", "Total Score", ga.total_score],
            # ["", "", "Comment", ga.comment],
        ]

        # header_table = Table(header_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
        header_col_widths = [
            usable_width * 0.20,  # Label (left)
            usable_width * 0.30,  # Value
            usable_width * 0.20,  # Label (right)
            usable_width * 0.30,  # Value
        ]

        header_table = Table(header_data, colWidths=header_col_widths)

        header_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            # ("SPAN", (0, 0), (3, 0)),
            ("FONT", (0, 0), (-1, -1), "Helvetica"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, 12))

        comment_table = Table(
            [
                [Paragraph("<b>Final Comment</b>", styles["Label"])],
                [Paragraph(str(ga.comment or ""), styles["Value"])]
            ],
            colWidths=[usable_width * 0.60]
        )

        comment_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))

        # -----------------------------------------------------
        # TOTAL SCORE LEGEND (FIXED)
        # -----------------------------------------------------
        legend_data = [
            ["Total Score - Legend"],
            ["0 - 60.99", "Unsatisfactory"],
            ["61 - 89.99", "Needs Improvement"],
            ["90 - 99.99", "Meets Basic Standards"],
            ["100 - 105.99", "Good Performance"],
            ["106 - 110", "Outstanding"],
        ]

        legend_table = Table(
            legend_data,
            colWidths=[usable_width * 0.18, usable_width * 0.22]
        )

        legend_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("SPAN", (0, 0), (-1, 0)),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]))
        comment_legend_wrapper = Table(
            [[comment_table, legend_table]],
            colWidths=[usable_width * 0.60, usable_width * 0.40]
        )

        comment_legend_wrapper.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        elements.append(comment_legend_wrapper)

        # elements.append(legend_table)
        elements.append(Spacer(1, 14))

        # -----------------------------------------------------
        # GOALS TABLE
        # -----------------------------------------------------
        goal_col_widths = [
            usable_width * 0.03,  # Sl
            usable_width * 0.09,  # Goal
            usable_width * 0.13,  # Description
            usable_width * 0.12,  # Measurement
            usable_width * 0.04,  # UOM
            usable_width * 0.10,  # Target
            usable_width * 0.07,  # Weightage
            usable_width * 0.10,  # Ach Val
            usable_width * 0.07,  # Score
            usable_width * 0.04,  # U/D
            usable_width * 0.21,  # Remark
        ]

        goal_table_data = [[
            "Sl",
            "Goal",
            "Description",
            "Measurement",
            "UOM",
            "Target",
            "Weightage",
            "Ach Val",
            "Score",
            "U/D",
            "Remark"
        ]]

        for idx, g in enumerate(goals, start=1):
            goal_table_data.append([
                idx,
                P(g.goal_name),
                P(g.description),
                P(g.measurement_criteria),
                # P(g.uom),
                P(display_uom(g.uom)),
                format_two_decimals(g.target),
                format_two_decimals(g.weightage),
                format_two_decimals(g.achievement_score),
                format_two_decimals(g.achieved_score),
                g.upwarddownward,
                P(g.remark),
            ])

        goal_table = Table(
            goal_table_data,
            colWidths=goal_col_widths,
            repeatRows=1
        )

        goal_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 7),
            ("FONTSIZE", (0, 1), (-1, -1), 7),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("ALIGN", (0, 1), (0, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("WORDWRAP", (10, 1), (10, -1), True),
        ]))

        elements.append(goal_table)


        # -----------------------------------------------------
        # BUILD PDF
        # -----------------------------------------------------
        # doc.build(elements)
        doc.build(
            elements,
            onFirstPage=draw_footer,
            onLaterPages=draw_footer
        )


        buffer.seek(0)

        # frappe.response.filename = f"Self_Evaluation_{employee_code}_{year}.pdf"
        frappe.response.filename = (f"PMS_Report_{year}_{datetime.now().strftime('%d%b%Y-%I%M%p')}.pdf")
        frappe.response.filecontent = buffer.getvalue()
        frappe.response.type = "binary"

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Self Evaluation PDF Error")
        frappe.throw("Error generating PDF")

def display_uom(uom):
    if not uom:
        return ""
    
    uom_str = str(uom).strip().lower()
    
    if uom_str == "percentage":
        return "%"
    elif uom_str == "number":
        return "NUM"
    else:
        return uom

def draw_footer(canvas, doc):
    canvas.saveState()

    footer_text = [
        "Confidential – J-Reflect | Authorized Internal Use Only",
        "Use, disclosure, or distribution outside the organization is prohibited",
        f"Document generated on: {datetime.now().strftime('%d-%b-%Y')}",
    ]

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)

    page_width, page_height = A4

    y_position = 25  
    for line in footer_text:
        canvas.drawCentredString(page_width / 2, y_position, line)
        y_position -= 10  
    canvas.restoreState()


def format_two_decimals(value):
    if value in (None, "", " ", "-", "--"):
        return "0.00"

    try:
        value = float(value)
    except (ValueError, TypeError):
        return "0.00"

    return f"{value:.2f}"

def set_two_decimal(cell):
    cell.number_format = "0.00"
