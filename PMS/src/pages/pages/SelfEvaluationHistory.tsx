import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Pagination from "../../components/Pagination";
import { useCurrentUser, useCurrentPmsEmployee } from "../../hooks/auth";
import frappeClient from "@/utils/frappe-client";

export default function SelfEvaluationHistory() {
  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentPmsEmployee();
  const { data: currentUser } = useCurrentUser();

  const [rows, setRows] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;

      const res: any = await frappeClient.api.get(
        "jh_digitrack.api.pms_report.get_self_evaluation_history",
        { current_user: currentUser }
      );

      const message = res?.message;

      if (message && message.assessments) {
        const formatted = message.assessments.map((a: any) => ({
          year: a.year,
          status: a.status,
          final_score: a.total_score,
          final_comment: a.comment,
        }));

        setRows(formatted);
      }
    }

    loadData();
  }, [currentUser]);

  const handleRowClick = (row: any) => {
    localStorage.setItem(
      "SelectedEmployee",
      JSON.stringify({
        id: currentEmployee?.employee_code,
        name: currentEmployee?.full_name,
      })
    );

    localStorage.setItem("SelectedYear", row.year);
    localStorage.setItem("SelectedStatus", row.status);
    localStorage.setItem("CameFromView", "1");

    navigate("/employeegoalevaluation");
  };

  // Pagination Logic
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = rows.slice(indexOfFirst, indexOfLast);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-4">

      {/* Header */}
      <h1 className="text-primary text-lg font-semibold mb-2">
        Self Evaluation History
      </h1>

      {/* Table */}
      <div className="border rounded-lg w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs text-gray-700">
            <tr>
              <th className="py-3 px-2 text-left">Year</th>
              <th className="py-3 px-2 text-left">Status</th>
              <th className="py-3 px-2 text-left">Final Score</th>
              <th className="py-3 px-2 text-left">Final Comment</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            )}

            {currentRows.map((row, i) => (
              <tr
                key={i}
                className="border-b hover:bg-gray-50 cursor-pointer text-xs"
                onClick={() => handleRowClick(row)}
              >
                <td className="px-2 py-2">{row.year}</td>
                <td className="px-2 py-2">{row.status}</td>
                <td className="px-2 py-2">{row.final_score}</td>
                <td className="px-2 py-2">{row.final_comment}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
