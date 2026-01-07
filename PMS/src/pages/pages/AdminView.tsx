import { useEffect, useRef, useMemo, useState } from "react";
import { HiOutlineSearch, HiChevronDown } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { IoCloseOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { CiMail, CiSearch } from "react-icons/ci";
import Pagination from "../../components/Pagination";
import { useCurrentUser } from "../../hooks/auth";
import frappeClient from "@/utils/frappe-client";

interface EmployeeSummary {
  employee_code: string;
  employee_name: string;
}

interface ManagerSummary {
  manager_email: string;
  manager_name: string;
  manager_code: string;
  department?: string;
  employee_count: number;

  goals_pending: number;
  goals_pending_employees: EmployeeSummary[];

  goals_started: number;
  goals_started_employees: EmployeeSummary[];

  goals_submitted: number;
  goals_submitted_employees: EmployeeSummary[];

  evaluation_pending: number;
  evaluation_pending_employees: EmployeeSummary[];

  evaluation_started: number;
  evaluation_started_employees: EmployeeSummary[];

  evaluation_submitted: number;
  evaluation_submitted_employees: EmployeeSummary[];

  employees_under_manager: EmployeeSummary[];
}

function AdminView() {
  const { data: currentUser } = useCurrentUser();

  const [managers, setManagers] = useState<ManagerSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [baseYear, setBaseYear] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [selectedManager, setSelectedManager] = useState("All");
  const [managerSearch, setManagerSearch] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedModalManager, setSelectedModalManager] =
    useState<ManagerSummary | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const reportMode = "admin";

  const isDownloadable =
    modalType === "evaluation_submitted" || modalType === "goals_submitted";
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const formatDate = (dateStr?: string | null) => {
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

  const [yearMeta, setYearMeta] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await frappeClient.api.get(
          "jh_digitrack.api.pms_report.get_goal_assessment_summary_admin",
          { manager: currentUser }
        );

        const apiManagers = res?.message?.message || [];
        const yearFromApi = res?.message?.current_year || "";

        const yearsFromApi = res?.message?.years || [];
        setYearMeta(yearsFromApi);
        setYears(yearsFromApi.map((y: any) => y.year));
        const selectedYearObj =
          yearsFromApi.find((y: any) => y.year === yearFromApi);

        const fromDateFromApi = selectedYearObj?.from_date || null;
        const toDateFromApi = selectedYearObj?.to_date || null;


        setFromDate(fromDateFromApi);
        setToDate(toDateFromApi);

        const normalized = (apiManagers || []).map((m: any) => ({
          ...m,
          department: m.department || "Unknown",
          employees_under_manager: m.employees_under_manager || [],
          goals_pending_employees: m.goals_pending_employees || [],
          goals_started_employees: m.goals_started_employees || [],
          goals_submitted_employees: m.goals_submitted_employees || [],
          evaluation_pending_employees: m.evaluation_pending_employees || [],
          evaluation_started_employees: m.evaluation_started_employees || [],
          evaluation_submitted_employees:
            m.evaluation_submitted_employees || [],
        }));

        setManagers(normalized);
        console.log(normalized,"manager all list here")

        if (!baseYear && yearFromApi) {
          setBaseYear(yearFromApi);
          setSelectedYear(yearFromApi);
        }
      } catch (err) {
        console.error("Failed to fetch admin report", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]); 
  useEffect(() => {
    if (!selectedYear) return;

    const yearObj = yearMeta.find(
      (y: any) => y.year === selectedYear
    );

    setFromDate(yearObj?.from_date || null);
    setToDate(yearObj?.to_date || null);
  }, [selectedYear, yearMeta]);


  // Close manager dropdown if clicked outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

 

  // Filter by manager name and department
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      if (
        selectedManager !== "All" &&
        selectedManager !== "" &&
        m.manager_name.toLowerCase() !== selectedManager.toLowerCase()
      )
        return false;

      if (selectedDepartment !== "All" && m.department !== selectedDepartment)
        return false;

      return true;
    });
  }, [managers, selectedManager, selectedDepartment]);

  // Sort managers
  const sortedManagers = useMemo(() => {
    return [...filteredManagers].sort((a, b) => {
      const aHasPending = a.evaluation_submitted < a.employee_count;
      const bHasPending = b.evaluation_submitted < b.employee_count;

      if (aHasPending !== bHasPending) {
        return aHasPending ? -1 : 1;
      }

      return a.manager_name.localeCompare(b.manager_name, undefined, {
        sensitivity: "base",
      });
    });
  }, [filteredManagers]);


  const totalPages = Math.max(1, Math.ceil(sortedManagers.length / rowsPerPage));

  
  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) return totalPages;
      if (prev < 1) return 1;
      return prev;
    });
  }, [totalPages]);

  useEffect(()=>{
  console.log(
  "Rendering page",
  currentPage,
  currentRows.map(m => m.manager_code)
);
  })

  // Reset page to 1 when user changes filters or rowsPerPage
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedManager, selectedDepartment, selectedYear, rowsPerPage]);

  
  const currentRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    if (startIndex >= sortedManagers.length) return [];
    return sortedManagers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedManagers, currentPage, rowsPerPage]);

 
  const departments = useMemo(() => {
    return Array.from(
      new Set(
        managers.map((m) => m.department).filter((d): d is string => Boolean(d))
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [managers]);

  
  const [years, setYears] = useState<string[]>([]);

  
  const handlePageChange = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedManager("All");
    setSelectedDepartment("All");
    setSelectedYear(baseYear);
    setManagerSearch("");
    setCurrentPage(1);
  };

  // Modal helpers
  const openCountModal = (manager: ManagerSummary, type: string) => {
    setSelectedModalManager(manager);
    setModalType(type);
    setEmployeeSearch("");
    setOpenModal(true);
  };

  const getEmployeeList = (): EmployeeSummary[] => {
    if (!selectedModalManager) return [];

    if (modalType === "employees") {
      return selectedModalManager.employees_under_manager || [];
    }

    return (
      (selectedModalManager as any)[`${modalType}_employees`] || []
    );
  };

  const renderCountCell = (
    count: number,
    manager: ManagerSummary,
    type: string
  ) =>
    count > 0 ? (
      <span
        className="underline cursor-pointer"
        onClick={() => openCountModal(manager, type)}
      >
        {count}
      </span>
    ) : (
      <span>{count}</span>
    );

  const handleEmployeePdfDownload = (e: React.MouseEvent, empCode: string) => {
    e.stopPropagation();
    window.open(
      `/api/method/jh_digitrack.api.report_download.download_self_evaluation_pdf?employee_code=${empCode}&year=${selectedYear}`,
      "_blank"
    );
  };

  const handleEmployeeExcelDownload = (e: React.MouseEvent, empCode: string) => {
    e.stopPropagation();
    window.open(
      `/api/method/jh_digitrack.api.report_download.download_self_evaluation_excel?employee_code=${empCode}&year=${selectedYear}`,
      "_blank"
    );
  };
  const getManagersWithPendingEvaluations = () => {
    return filteredManagers.filter(
      (m) => m.evaluation_submitted < m.employee_count
    );
  };
  const handleSendEmail = async () => {
    const pendingManagers = getManagersWithPendingEvaluations();
    pendingManagers.forEach((m, index) => {
 
    });
    if (pendingManagers.length === 0) {
      alert("No managers with pending evaluations.");
      return;
    }
    const managerWord = pendingManagers.length === 1 ? "manager" : "managers";

    const confirmSend = window.confirm(
      `Sending email to ${pendingManagers.length} ${managerWord} with pending actions. Do you want to continue?`
    );
    if (!confirmSend) return;
    const emails = pendingManagers
      .filter((m) => m.manager_email)
      .map((m) => [m.manager_email, m.manager_name]); 

    try {
      let res;
      try {
        res = await frappeClient.api.post(
          "jh_digitrack.api.pms_report.send_pending_evaluation_emails",
          {
            emails,
            year: selectedYear,
          }
        );
      } catch (innerErr: any) {
        console.error("Internal API client error:", innerErr);
        throw new Error("Failed to send emails. Please contact admin.");
      }

      console.log("Send Email response:", res);
      alert("Emails sent successfully.");
    } catch (error: any) {
      console.error("Error sending PMS emails:", error);
      alert(error.message || "Failed to send emails. Please contact admin.");
    }

  };

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 relative">
      <div className="flex items-center pb-1">
        <h1 className="text-primary font-semibold mr-4">Reports</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center  justify-between  pb-2">
        <div className="flex gap-3 items-center">
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => {
              const newYear = e.target.value;
              setSelectedYear(newYear);
            }}
            className="px-2 py-1 border rounded-md text-[0.65rem] focus:outline-none"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {fromDate && toDate && (
            <div className="flex items-center gap-1 text-[0.65rem] text-gray-600 px-2">
              <span className="font-medium">Period:</span>
              <span>{formatDate(fromDate)}</span>
              <span>–</span>
              <span>{formatDate(toDate)}</span>
            </div>
          )}

          {/* Manager Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowManagerDropdown(!showManagerDropdown)}
              className="px-2 py-1 border rounded-md text-[0.65rem] flex items-center justify-between w-66 focus:outline-none"
            >
              <span className="text-[0.65rem]">{selectedManager}</span>
              <HiChevronDown className="text-gray-500" />
            </button>

            {showManagerDropdown && (
              <div className="absolute mt-1 bg-white border rounded-lg shadow-lg w-56 z-50">
                <div className="relative p-2 border-b">
                  <HiOutlineSearch className="absolute left-4 top-4 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Search manager..."
                    className="pl-7 pr-3 py-1 rounded-md placeholder:text-[0.65rem] border w-full text-sm focus:outline-none"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                  />
                </div>
                <ul className="max-h-60 overflow-y-auto text-sm">
                  <li
                    onClick={() => {
                      setSelectedManager("All");
                      setShowManagerDropdown(false);
                      setManagerSearch("");
                    }}
                    className={`px-2 text-[0.65rem] py-1 cursor-pointer hover:bg-gray-100 ${
                      selectedManager === "All" ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    All
                  </li>
                  {managers
                    .filter((m) =>
                      m.manager_name
                        .toLowerCase()
                        .includes(managerSearch.toLowerCase())
                    )
                    .sort((a, b) =>
                      a.manager_name.localeCompare(b.manager_name, undefined, {
                        sensitivity: "base",
                      })
                    )
                    .map((m) => (
                      <li
                        key={m.manager_code}
                        onClick={() => {
                          setSelectedManager(m.manager_name);
                          setShowManagerDropdown(false);
                          setManagerSearch("");
                        }}
                        className={`px-2 py-1 text-[0.65rem] cursor-pointer hover:bg-gray-100 ${
                          selectedManager === m.manager_name
                            ? "bg-gray-100 font-medium"
                            : ""
                        }`}
                      >
                        {m.manager_name}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* Department */}
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-2 py-1 border rounded-md text-[0.65rem] focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departments
                .filter((d) => d)
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                .map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(selectedManager !== "All" ||
            (baseYear && selectedYear !== baseYear) ||
            (selectedDepartment !== "All")) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs flex items-center gap-1 text-red-500 rounded-md hover:bg-gray-100"
            >
              <span className="text-xs">Clear Filters</span>
              <IoCloseOutline />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            className="px-3 py-2 text-xs flex items-center gap-1 bg-primary text-white rounded-md hover:bg-[#7d241f]"
          >
            <CiMail className="text-md" />
            <span className="text-[0.65rem]">Send Email</span>
          </button>

          <button
            onClick={() => {
              if (sortedManagers.length === 0) {
                alert("No data available to download");
                return;
              }
              const managerToSend = selectedManager === "All" ? currentUser || "" : selectedManager;
              window.open(
                `/api/method/jh_digitrack.api.report_download.download_excel?year=${selectedYear}&manager=${encodeURIComponent(
                  managerToSend
                )}&view_type=${reportMode}`,
                "_blank"
              );
            }}
            className="px-3 py-2 text-xs flex items-center gap-1 bg-primary text-white rounded-md hover:bg-[#7d241f]"
          >
            <IoCloudDownloadOutline className="text-md" />
            <span className="text-[0.65rem]">Download</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg w-full overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-gray-100 text-xs text-gray-700">
            <tr>
              <th className="py-3 px-1 text-left">Manager Name</th>
              <th className="py-3 px-1">No. of Employees</th>
              <th className="py-3 px-1">Goals Pending</th>
              <th className="py-3 px-1">Goals Started</th>
              <th className="py-3 px-1">Goals Submitted</th>
              <th className="py-3 px-1">Evaluation Pending</th>
              <th className="py-3 px-1">Evaluation Started</th>
              <th className="py-3 px-1">Evaluation Submitted</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((manager) => (
              <tr key={manager.manager_code} className="border-b text-xs text-center transition">
                <td
                  className={`px-1 py-2 text-left ${manager.evaluation_submitted < manager.employee_count ? "text-red-600 font-semibold" : ""
                    }`}
                >
                  {manager.manager_name}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.employee_count, manager, "employees")}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.goals_pending, manager, "goals_pending")}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.goals_started, manager, "goals_started")}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.goals_submitted, manager, "goals_submitted")}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.evaluation_pending, manager, "evaluation_pending")}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.evaluation_started, manager, "evaluation_started")}
                </td>
                <td className="px-1 py-2">
                  {renderCountCell(manager.evaluation_submitted, manager, "evaluation_submitted")}
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
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      </div>

      {/* Single Column Modal */}
      {openModal && selectedModalManager && (
        <div className="fixed inset-0 z-400 flex items-center justify-center">
          <div
            className="absolute top-13 inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenModal(false)}
          />
          <div className="bg-white rounded-xl shadow-lg w-[550px] mt-25 max-w-full h-[80vh] flex flex-col z-50 overflow-hidden">
            <div className="flex justify-between items-center border-b px-5 py-4">
              <h2 className=" font-semibold text-xs text-primary">{selectedModalManager.manager_name}</h2>
              <div className="text-primary text-xs"> Total Number of Employees: {selectedModalManager.employee_count}</div>
              <button onClick={() => setOpenModal(false)} className="text-gray-500 hover:text-black">
                <IoMdClose className="text-md" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <div className="flex items-center border mb-2 rounded-full px-2 relative">
                <input
                  className="px-5 placeholder:text-[0.65rem] py-1 rounded-full focus:outline-none"
                  type="text"
                  placeholder="Search Employees"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
                <CiSearch className="absolute text-sm text-gray-500" />
              </div>

              <ul className="space-y-2">
                {getEmployeeList()
                  .filter((e) =>
                    e.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
                  )
                  .map((emp) => (
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
                      {isDownloadable && (
                        <IoCloudDownloadOutline className="text-sm text-primary shrink-0" />
                      )}

                      <span>
                        {emp.employee_name} ({emp.employee_code})
                      </span>
                    </li>
                  ))}
              </ul>

              {getEmployeeList().filter((emp) =>
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

export default AdminView;
