import { useState, useRef, useEffect } from "react";
import { HiOutlineSearch, HiChevronDown } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { IoCloseOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { CiMail, CiSearch } from "react-icons/ci";
import Pagination from "../../components/Pagination";
import { useGoalAssessment, ManagerSummary, EmployeeSummary } from "../../hooks/pmsreports";
import { useCurrentUser } from "../../hooks/auth";
import { useLocation } from "react-router";
interface Goal {
  id: string;
  name: string;
  desc: string;
  measurement?: string;
  uom?: string;
  targetvalue?: string;
  score?: number;
  remark?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  goals: Goal[];
}

function Reports() {
  const [managerSearch, setManagerSearch] = useState<string>("");
  const [showManagerDropdown, setShowManagerDropdown] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedModalManager, setSelectedModalManager] = useState<ManagerSummary | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [modalType, setModalType] = useState<string>("");
  const [openSingleShowModal, setOpenSingleShowModal] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedManager, setSelectedManager] = useState<string>("All");
  const location = useLocation();

  const initialMode =
    location.state?.fromAdmin === true ? "admin" : "team";


  const [reportMode, setReportMode] =
    useState<"team" | "org" | "admin">(initialMode);

  useEffect(() => {
    const fromAdmin = location.state?.fromAdmin === true;
    setReportMode(fromAdmin ? "admin" : "team");
  }, [location.state?.fromAdmin]);

  useEffect(() => {
  refetch();
}, [reportMode]);


  // const [reportMode, setReportMode] = useState<"team" | "org">("team");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // const { managers, baseYear, years, loading, refetch } = useGoalAssessment(selectedYear);
  const { managers, baseYear, years, loading, refetch } = useGoalAssessment(selectedYear, reportMode);

  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (baseYear && !selectedYear) {
      setSelectedYear(baseYear);
    }
  }, [baseYear]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredManagers = managers.filter((m) => {
    if (selectedManager === "All" || selectedManager === "") return true;
    return m.manager_name.toLowerCase() === selectedManager.toLowerCase();
  });

  const openModal = (manager: ManagerSummary, type: string) => {
    setSelectedModalManager(manager);
    setModalType(type);
    setSelectedEmployee(null);
    setEmployeeSearch("");
    setShowModal(true);
  };

  const openSingleColumnModal = (manager: ManagerSummary, type: string) => {
    setSelectedModalManager(manager);
    setModalType(type);
    setEmployeeSearch("");
    setOpenSingleShowModal(true);
  };



  const employeeListForModal = (manager: ManagerSummary | null, type: string): EmployeeSummary[] => {
    if (!manager) return [];
    let list: EmployeeSummary[] = [];

    switch (type) {
      case "goals_pending":
        list = manager.goals_pending_employees;
        break;
      case "goals_started":
        list = manager.goals_started_employees;
        break;
      case "goals_submitted":
        list = manager.goals_submitted_employees;
        break;
      case "evaluation_pending":
        list = manager.evaluation_pending_employees;
        break;
      case "evaluation_started":
        list = manager.evaluation_started_employees;
        break;
      case "evaluation_submitted":
        list = manager.evaluation_submitted_employees;
        break;
      case "employees":
        list = manager.employees_under_manager || [];
        break;
      default:
        list = [];
    }

    return list;
  };

  const closeModal = () => {
    setShowModal(false);
    setOpenSingleShowModal(false);
    setSelectedModalManager(null);
    setSelectedEmployee(null);
    setEmployeeSearch("");
  };

  const clearFilters = () => {
    if (!baseYear) return;
    setSelectedYear(baseYear);
    setSelectedManager("All");
    setManagerSearch("");
    refetch();
  };

  // Pagination
  const totalPages = Math.ceil(filteredManagers.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const sortedManagers = [...filteredManagers].sort((a, b) => {
    const aHasPending = a.evaluation_submitted < a.employee_count;
    const bHasPending = b.evaluation_submitted < b.employee_count;

    if (aHasPending && !bHasPending) return -1; 
    if (!aHasPending && bHasPending) return 1;  
    return 0; 
  });

  const currentRows = sortedManagers.slice(indexOfFirstRow, indexOfLastRow);


  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  const renderCountCell = (count: number, manager: ManagerSummary, type: string) => {
    if (!count || count === 0) {
      // show plain text (not clickable)
      return <span>{count}</span>;
    }

    // clickable link when count > 0
    return (
      <span
        className="text-black-500 underline cursor-pointer"
        onClick={() => openSingleColumnModal(manager, type)}
      >
        {count}
      </span>
    );
  };

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 relative">
     
<div className="flex items-center pb-1">
  <h1 className="text-primary font-semibold mr-4">Reports</h1>

  {/* {reportMode !== "admin" && ( */}
  {location.state?.fromAdmin !== true && (
    <div className="flex items-center gap-2">
      {/* <span
        className="text-[0.7rem] text-primary cursor-pointer hover:underline"
        onClick={() => {
        setReportMode("team");
        
        }}
      >
        Team
      </span> */}
      <span
        className={
          `text-[0.7rem] cursor-pointer hover:underline ` +
          (reportMode === "team" ? "text-primary font-semibold underline" : "text-gray-500")
        }
        onClick={() => setReportMode("team")}
      >
        Team
      </span>
      <span className="text-[0.7rem] text-primary">/</span>
      {/* <span
        className="text-[0.7rem] text-primary cursor-pointer hover:underline"
        onClick={() => {
        setReportMode("org");
        
        }}
      >
        Org
      </span> */}
      <span
        className={
          `text-[0.7rem] cursor-pointer hover:underline ` +
          (reportMode === "org" ? "text-primary font-semibold underline" : "text-gray-500")
        }
        onClick={() => setReportMode("org")}
      >
        Org
      </span>
    </div>
  )}
</div>



      {/* Filters */}
      <div className="flex items-center  justify-between  pb-2">

<div className="flex gap-3">
  {/* Year Filter */}
        <select
          value={selectedYear}
          onChange={(e) => {
            const newYear = e.target.value;
            setSelectedYear(newYear);
            refetch();
          }}
          className="px-2 py-1 border rounded-md text-[0.65rem] focus:outline-none"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        {/* Manager Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowManagerDropdown(!showManagerDropdown)}
            className="px-2 py-1 border rounded-md text-[0.65rem] flex items-center justify-between w-56 focus:outline-none"
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
                  className={`px-2 text-[0.65rem] py-1 cursor-pointer hover:bg-gray-100 ${selectedManager === "All" ? "bg-gray-100 font-medium" : ""
                    }`}
                >
                  All
                </li>
                {managers
                  .filter((m) =>
                    m.manager_name.toLowerCase().includes(managerSearch.toLowerCase())
                  )
                  .map((m) => (
                    <li
                      key={m.manager_email}
                      onClick={() => {
                        setSelectedManager(m.manager_name);
                        setShowManagerDropdown(false);
                        setManagerSearch("");
                      }}
                      className={`px-2 py-1 text-[0.65rem] cursor-pointer hover:bg-gray-100 ${selectedManager === m.manager_name ? "bg-gray-100 font-medium" : ""
                        }`}
                    >
                      {m.manager_name}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(selectedManager !== "All" || (baseYear && selectedYear !== baseYear)) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-xs flex items-center gap-1 text-red-500 rounded-md hover:bg-gray-100"
          >
            <span className="text-xs">Clear Filters</span> <IoCloseOutline />
          </button>
        )}
   
        </div>

         <div className="flex items-center gap-3">

        <button
          onClick={() => {
          }}
          className="px-3 py-2 text-sm flex items-center gap-1 bg-primary text-xs text-white rounded-md hover:bg-[#7d241f]"
        >
          <CiMail className="text-md" />
          <span className="text-[0.65rem]">Send Email</span>
        </button>
        {/* <button
          onClick={() => {
            const managerToSend =
              selectedManager === "All"
                ? currentUser || ""
                : selectedManager;

            console.log("Manager selected for report:", managerToSend);
            console.log("Year selected for report:", selectedYear);

            window.open(
              `/api/method/jh_digitrack.api.report_download.download_excel?year=${selectedYear}&manager=${encodeURIComponent(
                managerToSend
              )}`,
              "_blank"
            );
          }}
          className="px-3 py-2 text-xs flex items-center gap-1 bg-primary text-white rounded-md hover:bg-[#7d241f]"
        >
          <IoCloudDownloadOutline className="text-md" />
          <span className="text-[0.65rem]">Download</span>
        </button> */}
        <button
          onClick={() => {
            const managerToSend =
              selectedManager === "All"
                ? currentUser || ""
                : selectedManager;

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
       
        
        

        <div>


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
              {/* <th className="py-3 px-1">Email</th> */}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((manager) => (
              <tr key={manager.manager_email} className="border-b text-xs text-center transition">
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

                {/* <td className="px-3 py-3 text-primary text-center cursor-pointer">
                  <CiMail className="text-lg" />
                </td> */}
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

      {/* Single Column Modal */}
      {openSingleShowModal && selectedModalManager && (
        <div className="fixed inset-0 z-400 flex items-center justify-center">
          <div
            className="absolute top-13 inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="bg-white rounded-xl shadow-lg w-[450px] mt-25 max-w-full h-[80vh] flex flex-col z-50 overflow-hidden">
            <div className="flex justify-between items-center border-b px-5 py-4">
              <h2 className=" font-semibold text-xs text-primary">{selectedModalManager.manager_name}</h2>
              <div className="text-primary text-xs"> Total Number of Employees: {selectedModalManager.employee_count}</div>
              <button onClick={closeModal} className="text-gray-500 hover:text-black">
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
                {employeeListForModal(selectedModalManager, modalType)
                  .filter((emp) =>
                    emp.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
                  )
                  .map((emp) => (
                    <li
                      key={emp.employee_name}
                      className="px-3 my-2 bg-secondary/50 backdrop-blur-xs py-2 text-xs text-gray-700 rounded-sm"
                    >
                      {emp.employee_name} ({emp.employee_code})
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








