import { useState, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { MdEdit } from "react-icons/md";
import Pagination from "../../components/Pagination";
import { HiArrowNarrowDown } from "react-icons/hi";
import { IoAdd, IoCloseOutline } from "react-icons/io5";
import { useGoalEvaluation, GoalAssessment } from "../../hooks/goalevaluation";

function GoalEvaluation() {
  const navigate = useNavigate();
  const [dropdownfilterOpen, setDropdownfilterOpen] = useState(false);
  const [dropdownYearOpen, setDropdownYearOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortField, setSortField] = useState<"id" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const { evaluations, loading, defaultYear, baseYear, years, refetch } = useGoalEvaluation(selectedYear);


  useEffect(() => {
    if (defaultYear && !selectedYear) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear, selectedYear]);

  useEffect(() => {
    const closeDropdown = (e: any) => {
      if (!e.target.closest(".year-dropdown")) setDropdownYearOpen(false);
      if (e.key === "Escape") setDropdownYearOpen(false);
    };

    document.addEventListener("click", closeDropdown);
    document.addEventListener("keydown", closeDropdown);

    return () => {
      document.removeEventListener("click", closeDropdown);
      document.removeEventListener("keydown", closeDropdown);
    };
  }, []);

  const statusOptions = [
    "Evaluation Pending",
    "Evaluation Started",
    "Evaluation Submitted",
  ];

  const handleSort = (field: "id" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const sortedEmployees = [...evaluations].sort((a, b) => {
    if (!sortField) return 0;
    const valA = sortField === "id" ? a.docname : a.status;
    const valB = sortField === "id" ? b.docname : b.status;
    return sortOrder === "asc"
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  const filteredEmployees = selectedStatus
    ? sortedEmployees.filter((emp) => emp.status === selectedStatus)
    : sortedEmployees;

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredEmployees.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleEdit = (emp: GoalAssessment) => {
    localStorage.setItem("SelectedEmployee", JSON.stringify(emp));
    localStorage.setItem("SelectedYear", selectedYear);
    navigate("/employeegoalevaluation");
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Evaluation Pending":
        return "text-red-400";
      case "Evaluation Started":
        return "text-blue-500";
      case "Evaluation Submitted":
        return "text-green-500";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-6 relative">
      <h1 className="text-xl text-primary font-medium pb-2 mb-2">Goal Evaluation</h1>

      {/* === Header Row (Year Dropdown + Legends) === */}
      <div className="flex justify-between mb-3 items-start flex-wrap gap-3">
        {/* Year Dropdown */}
        <div className="relative inline-block year-dropdown">
          <button
            className="flex justify-between text-sm items-center gap-2 border px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100"
            onClick={() => setDropdownYearOpen(!dropdownYearOpen)}
          >
            {selectedYear}
            <RiArrowDropDownLine className="text-2xl" />
          </button>
          {dropdownYearOpen && (
            <ul className="absolute text-sm bg-white border rounded-md mt-1 w-40 z-10">
              {years.map((year) => (
                <li
                  key={year}
                  className="hover:bg-gray-200 cursor-pointer px-4 py-2"
                  onClick={() => {
                    setSelectedYear(year.toString());
                    setDropdownYearOpen(false);
                    refetch();
                  }}
                >
                  {year}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legends */}
        <div className="flex flex-wrap gap-x-2 gap-y-3 items-center justify-end">
          {[
            { label: "Employees", count: evaluations.length },
            { label: "Evaluation Pending", count: evaluations.filter(e => e.status === "Evaluation Pending").length },
            { label: "Evaluation Started", count: evaluations.filter(e => e.status === "Evaluation Started").length },
            { label: "Evaluation Submitted", count: evaluations.filter(e => e.status === "Evaluation Submitted").length },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-center text-center text-primary shadow-sm border-secondary rounded-md">
              <p className="text-xs bg-secondary px-2 py-2 rounded-l-md">{stat.label}</p>
              <p className="font-bold text-xs bg-secondary/30 px-2 py-2 rounded-r-md">{stat.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === Employee Table === */}
      <div className="border rounded-lg w-full overflow-x-auto mt-2">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative inline-block filter-dropdown m-2">
            <button
              className="px-2 py-1 border text-sm rounded-md flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setDropdownfilterOpen(!dropdownfilterOpen)}
            >
              {selectedStatus || "Status"}
              <IoAdd />
            </button>

            {dropdownfilterOpen && (
              <ul className="absolute bg-white border rounded-md mt-1 w-44 z-20 shadow-md">
                {statusOptions.map((status) => (
                  <li
                    key={status}
                    className={`hover:bg-secondary cursor-pointer px-4 py-2 text-sm ${getStatusStyles(status)}`}
                    onClick={() => {
                      setSelectedStatus(status);
                      setDropdownfilterOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    {status}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedStatus && (
            <div
              className="flex items-center gap-1 text-red-600 text-sm cursor-pointer"
              onClick={() => {
                setSelectedStatus("");
                setCurrentPage(1);
              }}
            >
              <span>Clear Filters</span>
              <IoCloseOutline />
            </div>
          )}
        </div>

        {/* Table */}
        <table className="w-full text-left table-auto">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("id")}>
                <div className="flex items-center gap-2">
                  Employee ID / Name
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-sm transition-transform ${
                      sortField === "id" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-2">
                  Status
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-sm transition-transform ${
                      sortField === "status" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Total Score</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : (
              currentRows.map((emp) => (
                <tr key={emp.docname} className="border-b text-sm transition">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {emp.employee_code} / {emp.employee_name}
                  </td>
                  <td className={`px-4 py-3 font-medium ${getStatusStyles(emp.status)}`}>
                    {emp.status}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {emp.total_score !== undefined && emp.total_score !== null
                      ? emp.total_score.toFixed(2)
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      className="px-2 py-2 rounded-md transition text-gray-600"
                      onClick={() => handleEdit(emp)}
                    >
                      <MdEdit />
                    </button>
                  </td>
                </tr>
              ))
            )}
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

export default GoalEvaluation;
