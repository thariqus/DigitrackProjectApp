 

import { useState, useRef, useEffect } from "react";
import { HiOutlineSearch, HiChevronDown } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { IoCloseOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { CiSearch } from "react-icons/ci";
import Pagination from "../../components/Pagination";
import {
  useGoalAssessment,
  ManagerSummary,
  EmployeeSummary,
} from "../../hooks/pmsreports";
import { useCurrentUser } from "../../hooks/auth";

function Reports() {
  const [managerSearch, setManagerSearch] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [selectedModalManager, setSelectedModalManager] =
    useState<ManagerSummary | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [modalType, setModalType] = useState("");
  const [openSingleShowModal, setOpenSingleShowModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuarterly, setSelectedQuarterly] = useState("");
  const [selectedManager, setSelectedManager] = useState("All");
  const [reportMode, setReportMode] = useState<"team" | "org">("team");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { managers, baseYear, baseQuarterly, periods, fromDate, toDate } =
    useGoalAssessment(selectedYear, reportMode, selectedQuarterly);

  const { data: currentUser } = useCurrentUser();

  /* ---------------- Helpers ---------------- */

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  };

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    if (baseYear && !selectedYear) {
      setSelectedYear(baseYear);
    }
  }, [baseYear]);

  useEffect(() => {
    if (baseQuarterly && !selectedQuarterly) {
      setSelectedQuarterly(baseQuarterly);
    }
  }, [baseQuarterly]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedManager("All");
    setManagerSearch("");
  }, [reportMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- Filtering & Pagination ---------------- */

  const filteredManagers = managers.filter((m) => {
    if (
      selectedManager !== "All" &&
      m.manager_name.toLowerCase() !== selectedManager.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  // Red managers on top
  const sortedManagers = [...filteredManagers].sort((a, b) => {
    const aHasPending = a.evaluation_submitted < a.employee_count;
    const bHasPending = b.evaluation_submitted < b.employee_count;
    if (aHasPending && !bHasPending) return -1;
    if (!aHasPending && bHasPending) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedManagers.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedManagers.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);
  const handleEmployeePdfDownload = (
    e: React.MouseEvent,
    employeeCode: string
  ) => {
    e.stopPropagation();
 
    if (!employeeCode || !selectedYear) return;
 
    const url =
      `/api/method/jh_digitrack.api.report_download.download_self_evaluation_pdf` +
      `?year=${selectedYear}&employee_code=${employeeCode}`;
 
    window.open(url, "_blank");
  };
  const handleEmployeeExcelDownload = (
    e: React.MouseEvent,
    employeeCode: string
  ) => {
    e.stopPropagation();
 
    if (!employeeCode || !selectedYear) return;
 
    const url =
      `/api/method/jh_digitrack.api.report_download.download_self_evaluation_excel` +
      `?year=${selectedYear}&employee_code=${employeeCode}`;
 
    window.open(url, "_blank");
  };
  const isDownloadable =
    modalType === "evaluation_submitted" ||
    modalType === "goals_submitted";
 

  /* ---------------- Modal Helpers ---------------- */

  const employeeListForModal = (
    manager: ManagerSummary | null,
    type: string
  ): EmployeeSummary[] => {
    if (!manager) return [];
    switch (type) {
      case "goals_started":
        return manager.goals_started_employees;
      case "employees":
        return manager.employees_under_manager || [];
      default: {
        // Every status column ("goals_started", "rpt_manager_submitted", ...) has a
        // matching "<column>_employees" list in the summary
        const list = (manager as unknown as Record<string, unknown>)[`${type}_employees`];
        return Array.isArray(list) ? (list as EmployeeSummary[]) : [];
      }
    }
  };

  const openSingleColumnModal = (
    manager: ManagerSummary,
    type: string
  ) => {
    setSelectedModalManager(manager);
    setModalType(type);
    setEmployeeSearch("");
    setOpenSingleShowModal(true);
  };

  const closeModal = () => {
    setOpenSingleShowModal(false);
    setSelectedModalManager(null);
    setEmployeeSearch("");
  };

  const clearFilters = () => {
    if (!baseYear) return;
    setSelectedYear(baseYear);
    setSelectedQuarterly(baseQuarterly);
    setSelectedManager("All");
    setManagerSearch("");
  };

  const renderCountCell = (
    count: number,
    manager: ManagerSummary,
    type: string
  ) => {
    if (!count) return <span>{count}</span>;
    return (
      <span
        className="text-black-500 underline cursor-pointer"
        onClick={() => openSingleColumnModal(manager, type)}
      >
        {count}
      </span>
    );
  };

   const handlePageChange = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2">
      {/* Header */}
      <div className="flex items-center pb-2">
        <h1 className="text-primary font-semibold mr-4">Reports</h1>

        <div className="flex items-center gap-2">
          <span
            className={`text-[0.7rem] cursor-pointer ${
              reportMode === "team"
                ? "text-primary font-semibold underline"
                : "text-gray-500"
            }`}
            onClick={() => setReportMode("team")}
          >
            Team
          </span>
          <span className="text-[0.7rem] text-primary">/</span>
          <span
            className={`text-[0.7rem] cursor-pointer ${
              reportMode === "org"
                ? "text-primary font-semibold underline"
                : "text-gray-500"
            }`}
            onClick={() => setReportMode("org")}
          >
            Org
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between pb-3">
        <div className="flex gap-3">
          <select
            value={selectedQuarterly}
            onChange={(e) => {
              const quaterly = e.target.value;
              const period = periods.find((p) => p.quaterly === quaterly);
              setSelectedQuarterly(quaterly);
              if (period) setSelectedYear(period.year);
            }}
            className="px-2 py-1 border rounded-md text-[0.65rem]"
          >
            {periods.map((p) => (
              <option key={p.quaterly || p.year} value={p.quaterly || p.year}>
                {p.quaterly || p.year}
              </option>
            ))}
          </select>

          {fromDate && toDate && (
            <div className="text-[0.65rem] text-gray-600 flex items-center gap-1">
              <span className="font-medium">Period:</span>
              <span>{formatDate(fromDate)}</span>–
              <span>{formatDate(toDate)}</span>
            </div>
          )}

          {/* Manager dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowManagerDropdown((p) => !p)}
              className="px-2 py-1 border rounded-md text-[0.65rem] w-56 flex justify-between"
            >
              {selectedManager}
              <HiChevronDown />
            </button>

            {showManagerDropdown && (
              <div className="absolute mt-1 bg-white border rounded-lg shadow-lg w-56 z-50">
                <div className="p-2 border-b relative">
                  <HiOutlineSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
                  <input
                    className="pl-7 pr-2 py-1 border w-full text-[0.65rem]"
                    placeholder="Search manager..."
                    value={managerSearch}
                    onChange={(e) =>
                      setManagerSearch(e.target.value)
                    }
                  />
                </div>

                <ul className="max-h-60 overflow-y-auto">
                  <li
                    className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-[0.65rem]"
                    onClick={() => {
                      setSelectedManager("All");
                      setShowManagerDropdown(false);
                      setManagerSearch("");
                    }}
                  >
                    All
                  </li>

                  {managers
                    .filter((m) =>
                      m.manager_name
                        .toLowerCase()
                        .includes(managerSearch.toLowerCase())
                    )
                    .map((m) => (
                      <li
                        key={m.manager_code}
                        className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-[0.65rem]"
                        onClick={() => {
                          setSelectedManager(m.manager_name);
                          setShowManagerDropdown(false);
                          setManagerSearch("");
                        }}
                      >
                        {m.manager_name}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {(selectedManager !== "All" ||
            selectedQuarterly !== baseQuarterly) && (
            <button
              onClick={clearFilters}
              className="text-red-500 text-xs flex items-center gap-1"
            >
              Clear Filters <IoCloseOutline />
            </button>
          )}
        </div>

        <button
          onClick={() =>
            window.open(
              `/api/method/jh_digitrack.api.report_download.download_excel?year=${selectedYear}&manager=${encodeURIComponent(
                selectedManager === "All"
                  ? currentUser || ""
                  : selectedManager
              )}&view_type=${reportMode}`,
              "_blank"
            )
          }
          className="px-3 py-2 text-xs flex items-center gap-1 bg-primary text-white rounded-md"
        >
          <IoCloudDownloadOutline />
          Download
        </button>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-x-auto">
        {/* <table className="w-full text-xs text-center"> */}
        <table className="w-full text-center text-sm">
          {/* <thead className="bg-gray-100"> */}
          <thead className="bg-gray-100 text-xs text-gray-700">
            <tr>
              {/* <th className="text-left px-2 py-2">Manager Name</th> */}
              <th className="py-3 px-1 text-left">Manager Name</th>
              <th>Employees</th>
              <th>Goals Started</th>
              <th>Goals Submitted</th>
              <th>RPT Manager Started</th>
              <th>RPT Manager Submitted</th>
              <th>FM Manager Started</th>
              <th>FM Manager Submitted</th>
              <th>SM Manager Started</th>
              <th>SM Manager Submitted</th>
              <th>Eval Started</th>
              <th>Eval Submitted</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((m) => (
              <tr key={m.manager_code} className="border-b text-xs">
                <td
                  className={`text-left px-2 py-2 ${
                    m.evaluation_submitted < m.employee_count
                      ? "text-red-600 font-semibold text-xs"
                      : ""
                  }`}
                >
                  {m.manager_name}
                </td>
                <td>{renderCountCell(m.employee_count, m, "employees")}</td>
                <td>{renderCountCell(m.goals_started, m, "goals_started")}</td>
                <td>{renderCountCell(m.goals_submitted, m, "goals_submitted")}</td>

                <td>{renderCountCell(m.rpt_manager_started, m, "rpt_manager_started")}</td>
                <td>{renderCountCell(m.rpt_manager_submitted, m, "rpt_manager_submitted")}</td>

                <td>{renderCountCell(m.fm_manager_started, m, "fm_manager_started")}</td>
                <td>{renderCountCell(m.fm_manager_submitted, m, "fm_manager_submitted")}</td>

                <td>{renderCountCell(m.sm_manager_started, m, "sm_manager_started")}</td>
                <td>{renderCountCell(m.sm_manager_submitted, m, "sm_manager_submitted")}</td>

                <td>{renderCountCell(m.evaluation_started, m, "evaluation_started")}</td>
                <td>{renderCountCell(m.evaluation_submitted, m, "evaluation_submitted")}</td>
              </tr>
            ))}
          </tbody>
        </table>

         <Pagination
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      </div>

      {/* MODAL */}
      {openSingleShowModal && selectedModalManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />
          <div className="bg-white rounded-xl w-[450px] h-[80vh] z-50 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h2 className="text-xs font-semibold text-primary">
                {selectedModalManager.manager_name}
              </h2>
              <button onClick={closeModal}>
                <IoMdClose />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <div className="flex items-center border mb-2 rounded-full px-2 relative">
                <CiSearch className="absolute text-sm text-gray-500" />
                <input
                  className="pl-6 py-1 w-full text-xs focus:outline-none"
                  placeholder="Search employee"
                  value={employeeSearch}
                  onChange={(e) =>
                    setEmployeeSearch(e.target.value)
                  }
                />
              </div>

              <ul className="space-y-2">
                {employeeListForModal(selectedModalManager, modalType)
                  .filter((emp) =>
                    emp.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
                  )
                  .map((emp) => (
                    // <li
                    //   key={emp.employee_name}
                    //   className="px-3 my-2 bg-secondary/50 backdrop-blur-xs py-2 text-xs text-gray-700 rounded-sm"
                    // >
                    //   {emp.employee_name} ({emp.employee_code})
                    // </li>
                    <li
                      key={emp.employee_name}
                      className={`px-3 my-2 bg-secondary/50 backdrop-blur-xs py-2 text-xs rounded-sm flex items-center gap-2
                        ${
                          isDownloadable
                            ? "text-primary underline cursor-pointer hover:bg-secondary"
                            : "text-gray-700 cursor-default"
                        }
                      `}
                      onClick={(e) => {
                        if (modalType === "evaluation_submitted") {
                          handleEmployeePdfDownload(e, emp.employee_code);
                        }
 
                        if (modalType === "goals_submitted") {
                          handleEmployeeExcelDownload(e, emp.employee_code);
                        }
                      }}
                    >
                      {/* Download icon ONLY for submitted cases */}
                      {isDownloadable && (
                        <IoCloudDownloadOutline className="text-sm text-primary shrink-0" />
                      )}
 
                      <span>
                        {emp.employee_name} ({emp.employee_code})
                      </span>
                    </li>
 
                  ))}
              </ul>
 
              {employeeListForModal(selectedModalManager, modalType).filter((emp) =>
                emp.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
              ).length === 0 && (
                  <div className="text-center text-gray-500 italic mt-10">
                    No employees found.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;