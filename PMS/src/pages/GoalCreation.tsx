
import React, { useState, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { createPortal } from "react-dom";
import { MdOutlineContentCopy ,MdDeleteOutline} from "react-icons/md";
import { IoAdd, IoCloseOutline, IoSaveOutline } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import { useGoalMaster, useEmployeeGoals, useGoalAssessment, submitGoalAssessment, deleteEmployeeGoals} from "../hooks/goalcreation";
import { useGoalAssignment } from "../hooks/goalassignment";

interface Goal {
  id: string;
  name?: string;
  desc: string;
  goal_id?: string;
  measurement: string;
  targetvalue: string;
  uom: string;
  copied?: boolean;
  weightage: string;
  seletedvalueOfUorD?: string;
}

interface Employee {
  id: string;
  name: string;
  status: string;
}

interface EmployeeGoalData {
  id: string;
  goal_name: string;
  goal_id: string;
  description: string;
  measurement_criteria: string;
  target?: string;
  uom?: string;
  upward_downward?: string; 
}

const GoalCreation: React.FC = () => {
  const navigate = useNavigate();

  // --- States ---
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [year, setYear] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [search, setSearch] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "warning" | "" }>({ text: "", type: "" });
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [checkedGoalsModal, setCheckedGoalsModal] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [selectedCopyYear, setSelectedCopyYear] = useState<string>("");
  const [isEdited, setIsEdited] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdByMe, setCreatedByMe] = useState(false);
  const { goals: goalOptions, loading } = useGoalMaster({ created_by_me: createdByMe });


  const { employees: assignableEmployees, baseYear } = useGoalAssignment();
  const isBaseYear = year === baseYear;
  const { employeeGoals: modalGoals, loading: modalGoalsLoading, refetch: refetchModalGoals } = useEmployeeGoals(selectedEmployee || "", selectedCopyYear);
  const { employeeGoals: fetchedEmployeeGoals } = useEmployeeGoals(employee?.id || "", year);
  const isDuplicateGoal = (goalId: string, goalName: string) => {
    return goals.some(
      (g) =>
        g.goal_id === goalId ||
        g.name === `${goalId} (${goalName})` // compare formatted
    );
  };
  const isEditableStatus = (status: string) => {
    return (status === "Goal Pending" || status === "Goal Started") && isBaseYear;
  };


useEffect(() => {
  if (employee?.status === "Goal Submitted") setIsSubmitted(true);
}, [employee]);

  // --- Effects ---
  useEffect(() => {
    if (baseYear) setSelectedCopyYear(baseYear);
  }, [baseYear]);

  useEffect(() => {
    const empData = localStorage.getItem("SelectedEmployee");
    const savedYear = localStorage.getItem("SelectedYear");
    if (empData) setEmployee(JSON.parse(empData));
    if (savedYear) setYear(savedYear);
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (fetchedEmployeeGoals.length > 0) {
      const mappedGoals = fetchedEmployeeGoals.map((g, idx) => ({
        id: `${idx}-${Date.now()}`,
        name: g.goal_id && g.goal_name
          ? `${g.goal_name}`   // ✅ Display format
          : g.goal_id || g.goal_name,
        desc: g.description,
        measurement: g.measurement_criteria,
        targetvalue: g.target || "",
        uom: g.uom || "",
        goal_id: g.goal_id, 
        seletedvalueOfUorD: g.upward_downward || "",
        weightage: g.weightage || "",
        copied: false,
      }));
      setGoals(mappedGoals);
    } else {
      setGoals([{ id: "1", name: "", desc: "", measurement: "", uom: "", targetvalue: "" ,weightage: "",}]);
    }
  }, [fetchedEmployeeGoals]);


  useEffect(() => {
    const saved = localStorage.getItem("SavedGoalssss");
    if (saved) setGoals(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (selectedEmployee && selectedCopyYear && typeof refetchModalGoals === "function") refetchModalGoals();
  }, [selectedEmployee, selectedCopyYear, refetchModalGoals]);

  // --- Pagination ---
  const totalPages = Math.ceil(goals.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = goals.slice(indexOfFirstRow, indexOfLastRow);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // --- Table Dropdown ---
  const handleGoalClick = (goalId: string, index: number, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    setDropdownOpen(dropdownOpen === goalId ? null : goalId);
    setDropdownIndex(index);
  };

  const handleSelectGoal = (absoluteIndex: number, goalId: string) => {
    const selected = goalOptions.find((g) => g.name === goalId);
    if (!selected) return;

    // 🔒 Prevent duplicates
    const displayName = `${selected.goal_name}`;
    if (isDuplicateGoal(selected.name, selected.goal_name)) {
      setMessage({ text: `Goal ${displayName} already exists.`, type: "warning" });
      return;
    }

    // ✅ Add selected goal
    setGoals((prev) => {
      const updated = [...prev];
      updated[absoluteIndex] = {
        ...updated[absoluteIndex],
        name: `${selected.goal_name}`,
        desc: selected.description || "",
        measurement: selected.measurement || "",
        goal_id: selected.name, 
      };
      return updated;
    });

    setDropdownOpen(null);
    setSearch("");
  };


const handleAddGoal = () => {
    const hasEmptyRow = goals.some(
    (g) =>
      (!g.name || g.name.trim() === "") &&
      (!g.desc || g.desc.trim() === "") &&
      (!g.measurement || g.measurement.trim() === "") &&
      (!g.uom || g.uom.trim() === "") &&
      (!g.targetvalue || g.targetvalue.trim() === "")
  );

  if (hasEmptyRow) {
    setMessage({
      text: "Please complete or remove the existing new goal before adding another.",
      type: "warning",
    });
    return;
  }
  setGoals([
    ...goals,
    { id: `${Date.now()}-${Math.random()}`, name: "", desc: "", measurement: "", uom: "", targetvalue: "", weightage: "", copied: false }
  ]);
  setIsEdited(true); 
};
const { createGoalAssessment } = useGoalAssessment();

const handleSave = async () => {
  try {
    if (!employee || !year) {
      setMessage({ text: "Employee and year are required.", type: "error" });
      return;
    }

    if (goals.length === 0) {
      setMessage({ text: "Please add at least one goal before saving.", type: "error" });
      return;
    }

    for (let g of goals) {
      if (!g.name || !g.desc || !g.measurement || !g.targetvalue || !g.uom || !g.weightage || !g.seletedvalueOfUorD) {
        setMessage({ text: "All fields must be filled to save.", type: "error" });
        return;
      }
    }

    const payload = {
      employee_code: employee.id,
      year: year,
      goals: goals.map((g) => ({
        goal_name: g.goal_id,
        description: g.desc,
        measurement_criteria: g.measurement,
        target: g.targetvalue,
        weightage: g.weightage,
        uom: g.uom,
        upward_downward: g.seletedvalueOfUorD || "",
      })),
    };

    const response = await createGoalAssessment(payload);

    if (response?.message) {
      const msgText = typeof response.message === "string"
        ? response.message
        : response.message.message || "Goal Assessment saved successfully";

      setMessage({ text: msgText, type: "success" });

      setIsEdited(false); 
      localStorage.setItem(
        "GoalStatusUpdate",
        JSON.stringify({ empId: employee.id, status: "Goal Started" })
      );
    } else if (response?.error) {
      setMessage({ text: response.error, type: "error" });
    }

  } catch (error) {
    console.error("❌ Error creating Goal Assessment:", error);
    setMessage({ text: "Something went wrong while saving.", type: "error" });
  }
};


const handleSubmit = async () => {
  try {

    if (!employee || !year) {
      console.error("❌ Missing required fields: employee or year");
      setMessage({ text: "Employee and year are required.", type: "error" });
      return;
    }


    for (let g of goals) {
      if (!g.goal_id || !g.desc || !g.measurement || !g.targetvalue || !g.uom) {
        console.warn("⚠️ Missing data in goal:", g);
        setMessage({ text: "All fields must be filled to submit.", type: "error" });
        return;
      }
    }

    // --- Prepare goals ---
    const newGoals = goals.map((g) => ({
      goal_id: g.goal_id,
      description: g.desc,
      measurement_criteria: g.measurement,
      target: g.targetvalue,
      uom: g.uom,
      seletedvalueOfUorD: g.seletedvalueOfUorD || "",
      weightage: g.weightage,
    }));

    console.log("🧩 Submitting goals payload:");
    newGoals.forEach((g, index) => {
      console.log(
        `Goal #${index + 1}`,
        "\nID:", g.goal_id,
        "\nUpward/Downward:", g.seletedvalueOfUorD || "(empty)",
        "\nDescription:", g.description,
        "\nWeightage:", g.weightage
      );
    });
    const res = await submitGoalAssessment(employee.id,year, newGoals);

    const backendMessage = res?.message?.message || res?.message;

    if (backendMessage?.status === "success") {
      setMessage({ text: "Goals submitted successfully!", type: "success" });
      setIsSubmitted(true);

      localStorage.removeItem("SavedGoalssss");
      localStorage.setItem(
        "GoalStatusUpdate",
        JSON.stringify({ empId: employee.id, status: "Goal Submitted" })
      );

      // setTimeout(() => navigate("/goalassignment"), 1200);

    } else if (backendMessage?.error) {
      console.error("❌ Backend Error:", backendMessage.error);
      setMessage({ text: backendMessage.error, type: "error" });

    } else {
      console.error("❌ Unexpected response format:", res);
      setMessage({ text: "Failed to submit goals.", type: "error" });
    }

  } catch (err) {
    console.error("💥 Exception while submitting goal assessment:", err);
    setMessage({ text: "Error submitting goals. Please try again.", type: "error" });
  }
};


const handleDeleteGoals = async () => {
  if (selectedGoals.length === 0) {
    setMessage({ text: "Please select at least one goal to delete.", type: "warning" });
    console.warn("⚠️ No goals selected for deletion");
    return;
  }

  // Get the IDs to delete
  const goalIdsToDelete = goals
    .filter((g) => selectedGoals.includes(g.id))
    .map((g) => g.goal_id)
    .filter((id): id is string => !!id); 

  if (goalIdsToDelete.length === 0) {
    setMessage({ text: "No valid goals selected for deletion.", type: "warning" });
    console.warn("⚠️ No valid goal_ids found in selectedGoals");
    return;
  }

  console.log("🗑 Deleting goals:", goalIdsToDelete);
  console.log("👤 Employee Code:", employee?.id);
  console.log("📅 Assessment Year:", year);

  try {
    const res = await deleteEmployeeGoals({
      employee_code: employee?.id || "",
      year: year, 
      goal_ids: goalIdsToDelete, 
    });

    console.log("✅ Delete API response:", res);

    if (res?.message) {
      const updatedGoals = goals.filter((g) => !selectedGoals.includes(g.id));
      setGoals(updatedGoals);
      setSelectedGoals([]);
      setMessage({ text: "Selected goals deleted successfully.", type: "success" });
      console.log("✅ Goals deleted from UI and backend synced.");
    } else {
      throw new Error(res?.error || "Unknown delete error");
    }
  } catch (err) {
    console.error("❌ Error deleting goals:", err);
    setMessage({ text: "Failed to delete goals.", type: "error" });
  }
};



const handleCopySelectedGoals = () => {
  if (!selectedEmployee || modalGoals.length === 0) return;

  const selectedGoalsToCopy = modalGoals.filter((g) =>
    checkedGoalsModal.includes(g.goal_name)
  );

  const currentGoals = [...goals];
  const newGoals: any[] = [];

  selectedGoalsToCopy.forEach((g, idx) => {
    const goalId = g.goal_id || "";
    const goalName = g.goal_name || "";
    const displayName = goalId && goalName ? `${goalName}` : goalId || goalName;

    if (isDuplicateGoal(goalId, goalName)) {
      setMessage({
        text: `Goal ${displayName} already exists.`,
        type: "warning",
      });
    } else {
      newGoals.push({
        id: `${currentGoals.length + idx}-${Date.now()}`,
        name: displayName,
        desc: g.description || "",
        measurement: g.measurement_criteria || "",
        targetvalue: g.target || "",
        uom: g.uom || "",
        copied: true,
        goal_id: goalId,
        weightage: g.weightage || "",
        seletedvalueOfUorD: g.upward_downward || "",
      });
    }
  });

  const isFirstRowEmpty =
    currentGoals.length === 1 &&
    !currentGoals[0].name &&
    !currentGoals[0].desc &&
    !currentGoals[0].measurement &&
    !currentGoals[0].targetvalue &&
    !currentGoals[0].uom;

  if (newGoals.length > 0) {
    if (isFirstRowEmpty) {
      console.log("🧹 First empty row detected — replacing it with copied goals");
      setGoals(newGoals);
      setIsEdited(true);
    } else {
      console.log("➕ Appending copied goals to existing list");
      setGoals([...currentGoals, ...newGoals]);
      setIsEdited(true);
    }

    setMessage({ text: "Goals copied successfully!", type: "success" });
  } else {
    setMessage({
      text: "No new goals were copied (possible duplicates).",
      type: "warning",
    });
  }

  setShowModal(false);
  setCheckedGoalsModal([]);
};




  return (
    <div className="fixed top-0 py-5 px-10 inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
      <div className="bg-white w-full border rounded-lg px-6 py-6 h-full relative">

        {/* Header */}
        <div className="flex items-start justify-between">
          <h1 className="text-xl text-primary font-medium pb-5 mb-4">Employee Goal Assignment</h1>
          <div className="flex items-center gap-10 justify-end mb-5">
            <div className="flex items-start gap-3">
              {isEditableStatus(employee?.status || "") && !isSubmitted && (
                <>
                <button onClick={() => setShowModal(true)} className="bg-secondary text-sm flex items-center gap-2 text-primary rounded-lg px-4 py-2 hover:shadow-sm transition-all">
                  <MdOutlineContentCopy /> Copy Goals
                </button>
                <button onClick={() => handleAddGoal()} className="bg-[#972E26] text-sm flex items-center gap-1 hover:bg-[#7d241f] transition text-white rounded-lg px-4 py-2">
                  <IoAdd className="text-lg" /> Add New Goal
                </button>
                </>
                 )}
              </div>
         
            <IoCloseOutline className="text-2xl cursor-pointer" onClick={() => navigate("/goalassignment")} />
          </div>
          
        </div>
        
        {message.text && (
          <div className="fixed top-20 right-10 z-[2000] transition-all duration-300">
            <div
              className={`px-4 py-2 rounded-md text-sm font-medium shadow-lg border max-w-sm ${
                message.type === "success"
                  ? "bg-green-100 text-green-700 border-green-300"
                  : message.type === "error"
                  ? "bg-red-100 text-red-700 border-red-300"
                  : message.type === "warning"
                  ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {message.text}
            </div>
          </div>
        )}
        {/* Employee breadcrumb */}
        {employee && (
<div className="flex items-center gap-6 mb-2">
  <div className="text-sm text-gray-500">
    <span
      className="cursor-pointer hover:text-primary underline decoration-gray-400"
      onClick={() => navigate("/goalevaluation")}
    >
      Goal Assignment
    </span>{" "}
    &gt;{" "}
    <span className="text-primary font-medium">
      {employee.id} / {employee.name}
    </span>
  </div>

  {/* ✅ Checkbox comes immediately after employee details */}
  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
<input
  type="checkbox"
  className="accent-primary cursor-pointer"
  checked={createdByMe}
  onChange={() => setCreatedByMe(prev => !prev)}
/>
Goals created by me


  </label>
</div>

        )}
        {/* Message Box */}




        {/* Table */}
        <div className="border rounded-lg w-full overflow-x-auto overflow-visible">
          <table className="w-full text-left table-auto">
            <thead className="bg-gray-100 text-gray-500 text-sm">
              <tr>
                <th className="py-2 px-2 text-center w-[2%]"></th>
                <th className="py-2 px-4 text-center w-[40%]">Goal Name / Goal Description</th>
                {/* <th className="py-2 px-4 text-center w-[50%]">Goal Description</th> */}
                <th className="py-2 px-4 text-center w-[23%]">Measurement Criteria</th>
                <th className="py-2 px-4 text-center w-[7%]">UOM</th>
                <th className="py-2 px-4 text-center w-[7%]">Weightage</th>
                <th className="py-2 px-4 text-center w-[5%]">Target</th>
                <th className="py-2 px-4 text-center w-[2%]">Upward(U)/ Downward(D)</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((goal, index) => (
                <tr key={goal.id} className="border-b text-sm align-top">
                    <td className="text-center px-1 py-3 align-top">
                    <input type="checkbox" checked={selectedGoals.includes(goal.id)} onChange={(e) => {
                      if (e.target.checked) setSelectedGoals([...selectedGoals, goal.id]);
                      else setSelectedGoals(selectedGoals.filter(id => id !== goal.id));
                    }} />
                  </td>

                  <div className="flex  flex-col justify-center align-top">
                    <td className="relative py-1 px-1 align-top">
                    <div className={`border w-full flex items-center justify-between gap-2 rounded px-2 py-1 cursor-pointer bg-gray-50`} onClick={(e) => {
    if (!isSubmitted) handleGoalClick(goal.id, index, e);
  }}>
                      <span>{goal.name || "Select Goal Name"}</span>
                      {!isSubmitted &&<RiArrowDropDownLine className="text-2xl" />}
                    </div>
                    {dropdownOpen === goal.id && dropdownPos && createPortal(
                      <div className="absolute bg-white border rounded-lg shadow-lg z-[1000] w-[630px]" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                        <div className="p-2 border-b sticky top-0 bg-white z-10">
                          <input type="text" placeholder="Search goal..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        {/* <ul className="max-h-60 overflow-y-auto">
                          {goalOptions.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())).map((g) => (
                            <li key={g.name} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => handleSelectGoal(indexOfFirstRow + index, g.name)}>{g.name}</li>
                          ))}
                          {goalOptions.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())).length === 0 && <li className="px-3 py-2 text-gray-500 italic text-sm">No goals found</li>}
                        </ul> */}
                        <ul className="max-h-60 overflow-y-auto">
                          {goalOptions
                            .filter((g) => g.goal_name.toLowerCase().includes(search.toLowerCase()) || g.name.toLowerCase().includes(search.toLowerCase()))
                            .map((g) => (
                              <li
                                key={g.name}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => handleSelectGoal(indexOfFirstRow + index, g.name)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">{g.goal_name}</span>
                                  <span className="text-xs text-gray-500 italic">{g.name}</span>
                                </div>
                              </li>
                            ))}
                          {goalOptions.filter((g) =>
                            g.goal_name.toLowerCase().includes(search.toLowerCase()) || g.name.toLowerCase().includes(search.toLowerCase())
                          ).length === 0 && (
                            <li className="px-3 py-2 text-gray-500 italic text-sm">No goals found</li>
                          )}
                        </ul>

                      </div>, document.body
                    )}
                  </td>

                   <td className="flex items-center gap-1 py-1 px-1 align-top">
                    <textarea value={goal.desc} onChange={(e) => { const updated = [...goals]; updated[indexOfFirstRow + index].desc = e.target.value; setGoals(updated); setIsEdited(true);
 }}readOnly className={`border p-1 w-full rounded focus:outline-none focus:ring-1 focus:ring-primary ${employee?.status === "Goal Submitted" || "Evaluation Started" || "Evaluation Submitted" ? " cursor-not-allowed border-none focus:outline-none" : "bg-white cursor-text"}`} rows={1} />
                  </td>
                  </div>
                


                  

                  <td className="py-1 px-1 align-top">
                    <input type="text" value={goal.measurement} onChange={(e) => { const updated = [...goals]; updated[indexOfFirstRow + index].measurement = e.target.value; setGoals(updated); setIsEdited(true);
}}readOnly className={`border p-1 w-full rounded ${employee?.status === "Goal Submitted" ? " cursor-not-allowed border-none focus:outline-none" : "bg-white"}`} />
                  </td>



                  <td className="py-1 px-1 lign-top" >
                    <select
                      value={goal.uom || ""}
                      onChange={(e) => {
                        const updated = [...goals];
                        updated[indexOfFirstRow + index].uom = e.target.value;
                        setGoals(updated);
                        setIsEdited(true);
                      }}
                      className="border p-1 w-full rounded bg-white"
                      disabled={isSubmitted || !isEditableStatus(employee?.status || "")}
                    >
                      <option value="">Select</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Number">Number</option>
                    </select>
                  </td>
<td className="py-1 px-1 align-top">
  <input
    type="text"
    value={goal.weightage}
    onChange={(e) => {
      const updated = [...goals];
      updated[indexOfFirstRow + index].weightage = e.target.value;
      setGoals(updated);
      setIsEdited(true);
    }}
    className="border p-1 w-full rounded"
    readOnly={isSubmitted || !isEditableStatus(employee?.status || "")}
  />
</td>
                
                  <td className="py-1 px-1 align-top">
                    <input type="text" value={goal.targetvalue} onChange={(e) => { const updated = [...goals]; updated[indexOfFirstRow + index].targetvalue = e.target.value; setGoals(updated); setIsEdited(true);
}} className="border p-1 w-full rounded" readOnly={isSubmitted || !isEditableStatus(employee?.status || "")}
/>
                  </td>

                  <td className="py-1 px-1 align-top">
                    <select value={goal.seletedvalueOfUorD || ""} onChange={(e) => { const updated = [...goals]; updated[indexOfFirstRow + index].seletedvalueOfUorD = e.target.value; setGoals(updated); setIsEdited(true);
}} className="border p-1 w-full rounded" disabled={isSubmitted || !isEditableStatus(employee?.status || "")}
>
                      <option value="">Select</option>
                      <option value="U">U</option>
                      <option value="D">D</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

        {/* Save / Submit */}
        {!isSubmitted && isEditableStatus(employee?.status || "") && (
        <div className="flex justify-end mt-4 gap-3">
          <button
            onClick={handleDeleteGoals}
            className="flex items-center gap-1 px-3 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all"
          >
            <MdDeleteOutline className="text-lg" /> Delete
          </button>

          <button
            onClick={handleSave}
            disabled={!isEdited} // 🔒 Disable until edited
            className="flex items-center gap-1 px-4 py-2 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 active:scale-95 transition-all"
          >
            <IoSaveOutline className="text-lg" /> Save
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all"
          >
            Submit
          </button>
        </div>
        )}

        {/* Copy Goals Modal */}
       
        {showModal && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
            <div className="bg-white w-[1000px] rounded-lg p-6 relative z-10">
              <div className="flex justify-between  border-b px-5 py-4 items-center mb-4">
                <h2 className="text-lg font-medium text-primary">Copy Goals</h2>
                <IoMdClose className="text-2xl cursor-pointer" onClick={() => setShowModal(false)} />
              </div>
      
              {/* --- Dynamic Year Dropdown --- */}
              {(() => {
                const storedYear = localStorage.getItem("assessment_year");
                const baseYear = storedYear ? parseInt(storedYear) : new Date().getFullYear();
                const availableYears = [baseYear, baseYear - 1, baseYear - 2];

                return (
                  <select
                    className="border px-2 py-1  mb-2 rounded"
                    value={selectedCopyYear}
                    onChange={(e) => setSelectedCopyYear(e.target.value)}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                );
              
              })()}
            
            <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Select Employee</h3>
<div className="flex gap-4">
  {/* Employee List */}
  <div
                className={`w-[30%] border shadow-md rounded p-2 ${
      assignableEmployees.filter(
        (e) =>
          e.id !== employee?.id &&
          e.name.toLowerCase().includes(employeeSearch.toLowerCase())
      ).length > 7
        ? "max-h-[300px] overflow-y-auto"
        : ""
    }`}
  >
    {assignableEmployees
      .filter(
        (e) =>
          e.id !== employee?.id &&
          e.name.toLowerCase().includes(employeeSearch.toLowerCase())
      )
      .map((e) => (
        <div
          key={e.id}
          className={`cursor-pointer p-2 ${
            selectedEmployee === e.id ? "bg-primary/20 text-primary border border-primary rounded-md" : ""
          }`}
          onClick={() => setSelectedEmployee(e.id)}
        >
          {e.name}
        </div>
      ))}
  </div>


  {/* Employee Goals */}
                <div className="w-[70%] border rounded shadow-md p-2 max-h-[300px] overflow-y-auto">
    {modalGoalsLoading ? (
                    <p><div className="flex items-center justify-center h-full text-gray-500 italic">Select an employee to view their goals.</div></p>
    ) : modalGoals.length > 0 ? (
      <ul>
        {modalGoals.map((g) => (
          <li key={g.goal_name} className="flex items-start gap-2 px-2 text-gray-400 py-2 border border-gray-200 shadow-md rounded-md">
            <input
              type="checkbox"
                          checked={checkedGoalsModal.includes(g.goal_name)} 
              onChange={(e) => {
                if (e.target.checked) {
                  setCheckedGoalsModal([...checkedGoalsModal, g.goal_name]);
                } else {
                              setCheckedGoalsModal(checkedGoalsModal.filter((name) => name !== g.goal_name));
                }
              }}
            />
            <div className="flex flex-col">
              <span className="font-medium">{g.goal_name}</span>
                          <span className="text-gray-500 text-sm">{g.measurement_criteria}</span>
            </div>
          </li>
        ))}
      </ul>


    ) : (
      <p className="text-gray-500 italic">No goals found</p>
    )}
  </div>

</div>
            </div>


            <div className="flex gap-4 mt-4">
              <button
                className="w-[30%] bg-gray-300 px-4 py-2 rounded"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                onClick={handleCopySelectedGoals}
                className="w-[70%] bg-[#972E26] text-white text-sm py-2 rounded-lg hover:bg-[#7D241E] transition-all"
              >
                Copy Selected Goals
              </button>
            </div>

            </div>
          </div>,
          document.body
        )}
        
      </div>
    </div>
  );
};

export default GoalCreation;



                  

                  