import { useState, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { MdEdit } from "react-icons/md";
import Pagination from "../../components/Pagination";
import { HiArrowNarrowDown } from "react-icons/hi";
import { IoAdd, IoCloseOutline } from "react-icons/io5";
import { useGoalAssignment} from "../../hooks/goalassignment";

export interface Employee {
  id: string;
  name: string;
  status: string;
}

function GoalAssignment() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const { employees, baseYear, years,fromDate,toDate, loading, refetch } = useGoalAssignment(selectedYear);
  const [dropdownfilterOpen, setDropdownfilterOpen] = useState(false);
  const [dropdownYearOpen, setDropdownYearOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const currentYear = new Date().getFullYear();
  const [selectedStatus, setSelectedStatus] = useState("");

  const [sortField, setSortField] = useState<"id" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const statusOptions = ["Goal Pending", "Goal Started", "Goal Submitted"];
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
  }, [employees]);

  useEffect(() => {
    if (baseYear && !selectedYear) {
      setSelectedYear(baseYear);
    }
  }, [baseYear, selectedYear]);


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
  useEffect(() => {
    const closeDropdown = (e: any) => {
      if (!e.target.closest(".year-dropdown")) setDropdownYearOpen(false);

      if (!e.target.closest(".filter-dropdown")) setDropdownfilterOpen(false);

      if (e.key === "Escape") {
        setDropdownYearOpen(false);
        setDropdownfilterOpen(false);
      }
    };

    document.addEventListener("click", closeDropdown);
    document.addEventListener("keydown", closeDropdown);

    return () => {
      document.removeEventListener("click", closeDropdown);
      document.removeEventListener("keydown", closeDropdown);
    };
  }, []);

  const handleSort = (field: "id" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortField) return 0;
    const field = sortField as keyof Employee;
    const valA = a[field];
    const valB = b[field];
    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return 0;
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

  const handleEdit = (emp: Employee) => {
    localStorage.setItem("SelectedEmployee", JSON.stringify(emp));
    localStorage.setItem("SelectedYear", selectedYear);
    navigate("/goalcreation");
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Goal Pending":
        return "text-red-400";
      case "Goal Started":
        return "text-blue-500";
      case "Goal Submitted":
        return "text-green-500";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 relative">
      <h1 className=" text-primary font-medium  mb-2">
        Goal Assignment
      </h1>

      {/* === Header Row (Year Dropdown + Legends) === */}
      <div className="flex justify-between mb-3 items-start gap-0">
      {/* <div className="flex justify-between mb-3 items-center gap-3 overflow-hidden"> */}

        {/* Year Dropdown */}
        <div className="relative inline-block year-dropdown">
          <button
            className="flex justify-between text-[0.65rem] items-center gap-2 border px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100"
            // onClick={() => setDropdownYearOpen(!dropdownYearOpen)}
            disabled
          >
            {selectedYear}
            {/* <RiArrowDropDownLine className="text-2xl" /> */}
          </button>
          {fromDate && toDate && (
            <span className="text-[0.6rem] text-gray-500 ml-1">
              {formatDate(fromDate)} – {formatDate(toDate)}
            </span>
          )}
          {dropdownYearOpen && (
            <ul className="absolute text-sm bg-white border rounded-md mt-1 w-40 z-10">
              {years.map((year) => (
                <li
                  key={year}
                  className="hover:bg-gray-200 text-[0.65rem] cursor-pointer px-4 py-2"
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
        {/* <div className="flex flex-wrap gap-x-2 gap-y-3 items-center justify-end"> */}
        {/* <div className="flex gap-x-2 items-center justify-end overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-1"> */}
        <div
            className="flex items-center gap-1 flex-shrink-0"         
            style={{
            gap: '0.25rem', // tighter spacing
          }}
        >


          {[
            { label: "Employees", count: employees.length },
            { label: "Goal Pending", count: employees.filter(e => e.status === "Goal Pending").length },
            { label: "Goal Started", count: employees.filter(e => e.status === "Goal Started").length },
            { label: "Goal Submitted", count: employees.filter(e => e.status === "Goal Submitted").length },
            { label: "Eval. Pending", count: employees.filter(e => e.status === "Evaluation Pending").length },
            { label: "Eval. Started", count: employees.filter(e => e.status === "Evaluation Started").length },
            { label: "Eval. Submitted", count: employees.filter(e => e.status === "Evaluation Submitted").length },

          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-center text-center text-primary shadow-sm border-secondary rounded-md">
              <p className="text-[9px] bg-secondary px-2 py-2 rounded-l-md">{stat.label}</p>
              <p className="font-bold text-xs bg-secondary/30 px-2 py-2 rounded-r-md">{stat.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === Employee Table === */}
      <div className="border rounded-lg w-full overflow-x-auto mt-0">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative inline-block filter-dropdown m-1">
            <button
              className="px-2 py-1 border text-[0.65rem] rounded-md flex items-center gap-2 hover:bg-gray-100"
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
                    className={`hover:bg-secondary text-[0.65rem] cursor-pointer px-4 py-2 text-sm ${getStatusStyles(status)}`}
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
              className="flex items-center gap-1 text-red-600 text-[0.65rem] cursor-pointer"
              onClick={() => {
                setSelectedStatus("");
                setCurrentPage(1);
              }}
            >
              <span className="text-[0.65rem]">Clear Filters</span>
              <IoCloseOutline />
            </div>
          )}
        </div>

        <table className="w-full text-left table-auto">
          <thead className="bg-gray-100 text-gray-700 text-xs">
            <tr>
              <th className="py-2 px-4 text-xs cursor-pointer" onClick={() => handleSort("id")}>
                <div className="flex items-center  gap-2">
                  Employee ID / Name
                  <HiArrowNarrowDown
                    className={`text-gray-400 text-sm transition-transform ${
                      sortField === "id" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>
              <th className="py-2 px-4 cursor-pointer" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-2">
                  Status
                  <HiArrowNarrowDown
                    className={`text-gray-400  transition-transform ${
                      sortField === "status" && sortOrder === "asc" ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </th>
              <th className="py-2 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((emp) => (
              <tr key={emp.id} className="border-b text-[0.65rem] transition">
                <td className="px-4 py-1 whitespace-nowrap">
                  {emp.id} / {emp.name}
                </td>
                <td className={`px-4 py-1 font-medium ${getStatusStyles(emp.status)}`}>
                  {emp.status}
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

export default GoalAssignment;



