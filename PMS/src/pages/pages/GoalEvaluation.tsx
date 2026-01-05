import { useState, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { MdEdit } from "react-icons/md";
import Pagination from "../../components/Pagination";
import { HiArrowNarrowDown } from "react-icons/hi";
import { IoAdd, IoCloseOutline } from "react-icons/io5";
import { useGoalEvaluation, GoalAssessment } from "../../hooks/goalevaluation";
import { useGoalAssignment } from "../../hooks/goalassignment";

function GoalEvaluation() {
  const navigate = useNavigate();
  // const [dropdownfilterOpen, setDropdownfilterOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [designationOpen, setDesignationOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [designationSearch, setDesignationSearch] = useState("");
  const [gradeSearch, setGradeSearch] = useState("");

  const [dropdownYearOpen, setDropdownYearOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortField, setSortField] = useState<"id" | "status" | "designation" | "grade" |null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const { evaluations, loading, defaultYear, baseYear, years,fromDate,toDate, refetch } = useGoalEvaluation(selectedYear);
  const { employees } = useGoalAssignment();
  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const typedEvaluations = evaluations as GoalAssessment[];
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  };

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
  const designationOptions = Array.from(
    new Set(
      typedEvaluations
        .map(e => e.designation_name)
        .filter((d): d is string => Boolean(d))
    )
  );

  const gradeOptions = Array.from(
    new Set(
      typedEvaluations
        .map(e => e.grade)
        .filter((g): g is string => Boolean(g))
    )
  );
  const filteredDesignationOptions = designationOptions.filter((d) =>
    d.toLowerCase().includes(designationSearch.toLowerCase())
  );

  const filteredGradeOptions = gradeOptions.filter((g) =>
    g.toLowerCase().includes(gradeSearch.toLowerCase())
  );

useEffect(() => {
  const closeDropdown = (e: any) => {
    if (!e.target.closest(".year-dropdown")) setDropdownYearOpen(false);

    if (!e.target.closest(".filter-dropdown")) {
      setStatusOpen(false);
      setDesignationOpen(false);
      setGradeOpen(false);
    }

    if (e.key === "Escape") {
      setDropdownYearOpen(false);
      setStatusOpen(false);
      setDesignationOpen(false);
      setGradeOpen(false);
    }
  };

  document.addEventListener("click", closeDropdown);
  document.addEventListener("keydown", closeDropdown);

  return () => {
    document.removeEventListener("click", closeDropdown);
    document.removeEventListener("keydown", closeDropdown);
  };
}, []);


  const handleSort = (field: "id" | "status" | "designation" | "grade") => {
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

  let valA = "";
  let valB = "";

  switch (sortField) {
    case "id":
      valA = `${a.employee_code} ${a.employee_name}`;
      valB = `${b.employee_code} ${b.employee_name}`;
      break;

    case "status":
      valA = a.status || "";
      valB = b.status || "";
      break;

    case "designation":
      valA = a.designation_name || "";
      valB = b.designation_name || "";
      break;

    case "grade":
      valA = a.grade || "";
      valB = b.grade || "";
      break;
  }

  return sortOrder === "asc"
    ? valA.localeCompare(valB)
    : valB.localeCompare(valA);
});


  const filteredEmployees = sortedEmployees.filter((emp) => {
    if (selectedStatus && emp.status !== selectedStatus) return false;
    if (selectedDesignation && emp.designation_name !== selectedDesignation) return false;
    if (selectedGrade && emp.grade !== selectedGrade) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredEmployees.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleEdit = (emp: GoalAssessment) => {
    localStorage.setItem(
      "SelectedEmployee",
      JSON.stringify({
        employee_code: emp.employee_code,
        employee_name: emp.employee_name,
        designation_name: emp.designation_name,
        grade: emp.grade,
      })
    );

    localStorage.setItem("SelectedYear", selectedYear);
    localStorage.setItem("SelectedStatus", emp.status);

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
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 relative">
      <h1 className=" text-primary font-medium  mb-2">Goal Evaluation</h1>
      <div className="flex justify-between mb-3 items-start flex-wrap gap-3">
        <div className="relative inline-block year-dropdown">
          <button
            className="flex text-xs  justify-between text-sm items-center gap-2 border px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100"
            disabled
          >
            {selectedYear}
          </button>
          {fromDate && toDate && (
            <span className="text-[0.6rem] text-gray-500 ml-1">
              {formatDate(fromDate)} – {formatDate(toDate)}
            </span>
          )}
          {dropdownYearOpen && (
            <ul className="absolute text-xs  bg-white border rounded-md mt-1 w-40 z-10">
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
            { label: "Employees", count: employees?.length || 0 },

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
      <div className="border rounded-lg w-full overflow-x-auto mt-1">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative inline-block filter-dropdown m-1">
            <button
              className="px-2 py-1 border text-xs  rounded-md flex items-center gap-2 hover:bg-gray-100"
              onClick={() => {
                setStatusOpen(!statusOpen);
                setDesignationOpen(false);
                setGradeOpen(false);
              }}

            >
              {selectedStatus || "Status"}
              <IoAdd />
            </button>

            {statusOpen && (
              // <ul className="absolute bg-white border rounded-md mt-1 w-44 z-20 shadow-md">
              <ul className="absolute bg-white border rounded-md mt-1 w-44 z-20 shadow-md max-h-56 overflow-y-auto">

                {statusOptions.map((status) => (
                  <li
                    key={status}
                    className={`hover:bg-secondary cursor-pointer px-4 py-2 text-xs  ${getStatusStyles(status)}`}
                    onClick={() => {
                      setSelectedStatus(status);
                      setStatusOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    {status}
                  </li>
                ))}
              </ul>
            )}
          </div>
<div className="relative inline-block filter-dropdown m-1">
  <button
    className="px-2 py-1 border text-xs rounded-md flex items-center gap-2 hover:bg-gray-100"
    onClick={() => {
      setDesignationOpen(!designationOpen);
      setStatusOpen(false);
      setGradeOpen(false);
    }}
  >
    {selectedDesignation || "Designation"}
    <IoAdd />
  </button>


{designationOpen && (
  <ul className="absolute bg-white border rounded-md mt-1 w-44 z-20 shadow-md max-h-56 overflow-y-auto">
    
    {/* Search box */}
    <li className="px-2 py-2 sticky top-0 bg-white z-10">
      <input
        type="text"
        value={designationSearch}
        onChange={(e) => setDesignationSearch(e.target.value)}
        placeholder="Search designation..."
        className="w-full border px-2 py-1 text-xs rounded focus:outline-none"
      />
    </li>

    {filteredDesignationOptions.length > 0 ? (
      filteredDesignationOptions.map((des) => (
        <li
          key={des}
          className="hover:bg-secondary cursor-pointer px-4 py-2 text-xs"
          onClick={() => {
            setSelectedDesignation(des);
            setDesignationOpen(false);
            setDesignationSearch("");
            setCurrentPage(1);
          }}
        >
          {des}
        </li>
      ))
    ) : (
      <li className="px-4 py-2 text-xs text-gray-400">
        No results
      </li>
    )}
  </ul>
)}


</div>
<div className="relative inline-block filter-dropdown m-1">
  <button
    className="px-2 py-1 border text-xs rounded-md flex items-center gap-2 hover:bg-gray-100"
    onClick={() => {
      setGradeOpen(!gradeOpen);
      setStatusOpen(false);
      setDesignationOpen(false);
    }}
  >
    {selectedGrade || "Grade"}
    <IoAdd />
  </button>


{gradeOpen && (
  <ul className="absolute bg-white border rounded-md mt-1 w-44 z-20 shadow-md max-h-56 overflow-y-auto">

    {/* Search box */}
    <li className="px-2 py-2 sticky top-0 bg-white z-10">
      <input
        type="text"
        value={gradeSearch}
        onChange={(e) => setGradeSearch(e.target.value)}
        placeholder="Search grade..."
        className="w-full border px-2 py-1 text-xs rounded focus:outline-none"
      />
    </li>

    {filteredGradeOptions.length > 0 ? (
      filteredGradeOptions.map((gr) => (
        <li
          key={gr}
          className="hover:bg-secondary cursor-pointer px-4 py-2 text-xs"
          onClick={() => {
            setSelectedGrade(gr);
            setGradeOpen(false);
            setGradeSearch("");
            setCurrentPage(1);
          }}
        >
          {gr}
        </li>
      ))
    ) : (
      <li className="px-4 py-2 text-xs text-gray-400">
        No results
      </li>
    )}
  </ul>
)}


</div>

          {(selectedStatus || selectedDesignation || selectedGrade) && (

            <div
              className="flex items-center gap-1 text-red-600 text-sm cursor-pointer"
              onClick={() => {
                setSelectedStatus("");
                setSelectedDesignation("");
                setSelectedGrade("");
                setCurrentPage(1);
              }}
            >
              <span className="text-xs ">Clear Filters</span>
              <IoCloseOutline />
            </div>
          )}
        </div>

        {/* Table */}
        <table className="w-full text-left table-auto">
          <thead className="bg-gray-100 text-gray-700 text-xs ">
            <tr>
              <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("id")}>
                <div className="flex items-center gap-2">
                  Employee ID / Name
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-xs  transition-transform ${
                      sortField === "id" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>
              {/* Designation */}
              <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("designation")}>
                <div className="flex items-center gap-2">
                  Designation
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-xs transition-transform ${
                      sortField === "designation" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>

              {/* Grade */}
              <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("grade")}>
                <div className="flex items-center gap-2">
                  Grade
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-xs transition-transform ${
                      sortField === "grade" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-2 text-xs " >
                  Status
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-xs  transition-transform ${
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
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : (
              currentRows.map((emp) => (
                <tr key={emp.docname} className="border-b text-xs  transition">
                  <td className="px-4 py-1 whitespace-nowrap">
                    {emp.employee_code} / {emp.employee_name}
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap">
                    {emp.designation_name || "-"}
                  </td>

                  <td className="px-4 py-1 whitespace-nowrap">

                    {emp.grade || "-"}
                  </td>
                  <td className={`px-4 py-1 font-medium ${getStatusStyles(emp.status)}`}>
                    {emp.status}
                  </td>
                  <td className="px-4 py-1 text-center">
                    {emp.total_score !== undefined && emp.total_score !== null
                      ? emp.total_score.toFixed(2)
                      : "-"}
                  </td>

                  <td className="px-4 py-1 text-center">
                    <button
                      className="px-2 py-1 rounded-md transition text-gray-600"
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
