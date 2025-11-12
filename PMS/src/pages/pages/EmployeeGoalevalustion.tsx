import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination";
import { IoCloseOutline, IoCloudUploadOutline } from "react-icons/io5";
import { MdOutlineDelete } from "react-icons/md";
import { useGoalAssessment, useEmployeeGoals ,useSubmitGoalEvaluation, useUploadGoalAttachment, useDeleteGoalAttachment} from "../../hooks/goalevaluation";

interface Goal {
  id: string;
  goal_id: string;
  name: string;
  desc: string;
  measurement: string;
  targetvalue: string;
  uom: string;
  score?: string;
  achievement_score: string;

  remark?: string;
}

interface Employee {
  id: string;
  name: string;
}

function EmployeeGoalEvaluation() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({ text: "", type: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [files, setFiles] = useState<File[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const { createGoalAssessment, loading } = useGoalAssessment();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { submitGoalEvaluation } = useSubmitGoalEvaluation();
  const { uploadGoalAttachment } = useUploadGoalAttachment();
  const [attachments, setAttachments] = useState<{ file_url: string; file_name: string }[]>([]);
  const { deleteGoalAttachment, loading: deleteLoading } = useDeleteGoalAttachment();
useEffect(() => {
  const empData = localStorage.getItem("SelectedEmployee");
  const selectedYear = localStorage.getItem("SelectedYear");


  if (empData) {
    try {
      const emp = JSON.parse(empData);

      setEmployee({
        id: emp.employee_code || emp.id || "",
        name: emp.employee_name || emp.name || "",
      });

    } catch (error) {
      console.error(" Failed to parse employee data:", error);
    }
  } else {
    console.warn(" No SelectedEmployee found in localStorage, navigating back.");
    navigate("/goalevaluation");
  }

  if (selectedYear) {
    setYear(selectedYear);
  }
}, [navigate]);

useEffect(() => {
  const empData = localStorage.getItem("SelectedEmployee");
  const selectedYear = localStorage.getItem("SelectedYear");
  const savedStatus = localStorage.getItem("SelectedStatus"); 
  if (empData) {
    try {
      const emp = JSON.parse(empData);
      setEmployee({
        id: emp.employee_code || emp.id || "",
        name: emp.employee_name || emp.name || "",
      });
    } catch (error) {
      console.error("Failed to parse employee data:", error);
    }
  } else {
    console.warn("No SelectedEmployee found in localStorage, navigating back.");
    navigate("/goalevaluation");
  }

  if (selectedYear) setYear(selectedYear);

  if (savedStatus && savedStatus === "Evaluation Submitted") {
    setIsSubmitted(true);
  } else {
    setIsSubmitted(false);
  }
}, [navigate]);


  const { employeeGoals: fetchedEmployeeGoals, attachments: fetchedAttachments } = useEmployeeGoals(employee?.id || "", year || "");

  useEffect(() => {
    if (fetchedEmployeeGoals && fetchedEmployeeGoals.length > 0) {
      const formattedGoals = fetchedEmployeeGoals.map((goal: any, index: number) => ({
        id: `${index + 1}`,
        name: goal.goal_name || "",
        goal_id: goal.goal_id || "",
        desc: goal.description || "",
        measurement: goal.measurement_criteria || "",
        targetvalue: goal.target || "",
        uom: goal.uom || "",
        achievement_score: goal.achievement_score || "",
        score: goal.achievement_score || "",
        remark: goal.remark || "",
      }));
      setGoals(formattedGoals);
    }

    if (fetchedAttachments && fetchedAttachments.length > 0) {
      setAttachments(fetchedAttachments);
    }
  }, [fetchedEmployeeGoals, fetchedAttachments]);



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 2 * 1024 * 1024) {
      setMessage({ text: "File must be less than 2MB.", type: "error" });
      return;
    }

    if (!employee || !year) {
      setMessage({ text: "Missing employee or year.", type: "error" });
      return;
    }

    try {
      const result = await uploadGoalAttachment(employee.id, year, selectedFile);
      if (result.error) {
        setMessage({ text: result.error, type: "error" });
      } else {
        setMessage({ text: "File uploaded successfully!", type: "success" });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);

        // ✅ Append the uploaded file to the local UI list
        setAttachments((prev) => [
          ...prev,
          { file_name: selectedFile.name, file_url: result.file_url || "" },
        ]);

      }
    } catch (err) {
      setMessage({ text: "File upload failed.", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);

    }
  };



  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
  };
  const handleDeleteAttachment = async (fileUrl: string) => {
    if (!employee || !year) {
      setMessage({ text: "Missing employee or year.", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
      return;
    }

    try {
      const result = await deleteGoalAttachment(employee.id, year, fileUrl);

      if (result?.error) {
        setMessage({ text: result.error, type: "error" });
      } else {
        setMessage({ text: "Attachment deleted successfully!", type: "success" });

        // ✅ Update UI like you do for upload success
        setAttachments((prev) => prev.filter((a) => a.file_url !== fileUrl));
      }
    } catch (error) {
      console.error("Delete failed:", error);
      setMessage({ text: "Failed to delete attachment.", type: "error" });
    }

    // ✅ Match same timeout style as save/submit
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };


  const handleInputChange = (index: number, field: "score" | "remark", value: string) => {
    const updatedGoals = [...goals];
    updatedGoals[index][field] = value;
    setGoals(updatedGoals);
  };

  const handleSave = async () => {
    if (!employee || !year) {
      setMessage({ text: "Missing employee or year.", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);

      return;
    }
  // ✅ Validation before submitting
  const missingFields = goals.filter(
    (g) => !g.score || g.score.trim() === "" || !g.remark || g.remark.trim() === ""
  );

  if (missingFields.length > 0) {
    setMessage({
      text: "Please fill all required fields before saving.",
      type: "error",
    });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);

    return;
  }
    const payload = {
      employee_code: employee.id,
      year: year,
      goals: goals.map((g) => ({
        goal_name: g.goal_id,
        description: g.desc,
        measurement_criteria: g.measurement,
        target: g.targetvalue,
        uom: g.uom,
        achievement_score: g.score || g.achievement_score || "",
        remarks: g.remark || "",
      })),
    };

  const result = await createGoalAssessment(payload);

  if (result?.error) {
    console.error(" Error from API:", result.error);
    setMessage({ text: "Failed to save goal evaluation.", type: "error" });
  } else {
    setMessage({ text: "Goal Evaluation saved successfully!", type: "success" });
  }

  setTimeout(() => setMessage({ text: "", type: "" }), 3000);
};

  const handleSubmit = async () => {
    if (!employee || !year) return;

  const missingFields = goals.filter(
    (g) => !g.score || g.score.trim() === "" || !g.remark || g.remark.trim() === ""
  );

  if (missingFields.length > 0) {
    setMessage({
      text: "Please fill all required fields before submitting.",
      type: "error",
    });
    return;
  }
    const response = await submitGoalEvaluation(employee.id, year);

    if (response.error) {
      setMessage({ text: response.error, type: "error" });
    } else {
      setMessage({ text: response.message || "Goal Evaluation submitted!", type: "success" });
      setIsSubmitted(true); 
    }

    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };


  // const handleNavigation = () => {
  //   navigate("/goalevaluation");
  // };
  const handleNavigation = () => {
  localStorage.removeItem("SelectedStatus");
  navigate("/goalevaluation");
};


  const averageScore = useMemo(() => {
    const numericScores = goals.map((g) => parseFloat(g.score || "")).filter((s) => !isNaN(s));
    if (numericScores.length === 0) return 0;
    const total = numericScores.reduce((acc, curr) => acc + curr, 0);
    return parseFloat((total / numericScores.length).toFixed(2));
  }, [goals]);

  const totalPages = Math.ceil(goals.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = goals.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="fixed top-0 py-5 px-10 inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpenModal(false)}></div>

      <div className="bg-white w-full h-full border rounded-lg px-6 py-5 relative">
        <div className="flex items-start justify-between">
          <h1 className="text-xl text-primary font-medium mb-5">Employee Goal Evaluation</h1>
          <IoCloseOutline className="text-2xl cursor-pointer" onClick={() => navigate("/goalevaluation")} />
        </div>

        <div className="flex items-start justify-between">
          {employee && (
            <div className="text-sm text-gray-500">
              <span className="cursor-pointer hover:text-primary underline decoration-gray-400" onClick={handleNavigation}>
                Goal Evaluation
              </span>{" "}
              &gt;{" "}
              <span className="text-primary font-medium">
                {employee.id} / {employee.name}
              </span>
            </div>
          )}

          {averageScore !== null && (
            <div className="text-sm font-medium text-gray-700">
              <p>
                Average Score: <span className="text-primary">{averageScore.toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg w-full mt-2 overflow-x-auto">
          <table className="w-full text-left table-auto border-collapse">
            <thead className="bg-gray-100 text-gray-700 text-sm font-normal">
              <tr>
                <th className="py-3 px-1 w-[27%] sticky left-0 bg-gray-100 z-10">Goal Name/Goal Description</th>
                <th className="py-3 px-1 w-[23%]">Measurement Criteria</th>
                <th className="py-3 px-1 w-[8%] text-center">Target Value / UOM</th>
                <th className="py-3 px-1 w-[5%] text-center">Achievement Score</th>
                <th className="py-3 px-1 w-[30%] text-center">Remark</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((goal, idx) => (
                <tr key={goal.id} className="border-b text-sm">
                  <td className="py-2 px-1 flex flex-col gap-1 sticky left-0 bg-white z-5">
                    <span>{goal.name}   </span>
                    <span>{goal.desc}</span>
                    <input type="hidden" value={goal.goal_id} readOnly />
                  </td>
                  <td className="py-2 px-1">{goal.measurement}</td>
                  <td className="py-2 px-1 text-center">
                    <span>{goal.targetvalue} </span>
                    <span>{goal.uom}</span>
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      value={goal.score || ""}
                      readOnly={isSubmitted}
                      onChange={(e) => !isSubmitted && handleInputChange(idx, "score", e.target.value)}
                      className="border p-1 w-full rounded"
                    />
                  </td>
                  <td className="py-2 px-4 break-words max-w-[300px]">
                    <textarea
                      value={goal.remark || ""}
                        readOnly={isSubmitted}
                        onChange={(e) => !isSubmitted && handleInputChange(idx, "remark", e.target.value)}  
                        className="border p-1 w-full rounded"
                      rows={2}
                    />
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

        {/* Footer */}
        <div className={`flex items-center gap-4 mt-6 ${isSubmitted ? "justify-start" : "justify-end"}`}>

          {/* File Upload */}
          
            
          <div className="relative min-w-[250px]">
            {!isSubmitted && (
            <label className="flex items-center bg-secondary gap-2 px-4 py-2 rounded-sm cursor-pointer hover:bg-gray-100 transition">
              <input type="file" className="hidden" multiple onChange={handleFileChange} />
              <IoCloudUploadOutline className="text-gray-500" />
              <span className="text-gray-500 text-sm font-medium">Attach File</span>
            </label>
            )}
            
            {attachments.length > 0 && (
              <div className="absolute  left-280 mt-1 w-full border border-gray-200 rounded-sm p-2 bg-white">

                <ul className="flex flex-col gap-2">
                  {attachments.map((file, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between text-sm text-gray-700 border-b pb-1 last:border-none"
                    >
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate w-3/4 text-blue-600 hover:underline"
                      >
                        {file.file_name}
                      </a>
                      {!isSubmitted && (
                      <button
                        onClick={() => handleDeleteAttachment(file.file_url)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        <MdOutlineDelete className="text-lg" />
                      </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}


          </div>
          {!isSubmitted && (
            <>
          {/* Buttons */}
          <button onClick={handleSave} className="px-4 py-2 text-sm rounded-sm bg-secondary text-gray-600 hover:bg-secondary/80">
            Save
          </button>

          <button onClick={handleSubmit} className="px-4 py-2 text-sm rounded-sm bg-primary text-white hover:bg-primary/80">
            Submit
          </button>
          </>
          )}
        </div>
        
        {/* Alert message */}
        {message.text && (
          <div
            className={`fixed top-5 right-5 flex items-center justify-between gap-3 px-7 py-4 rounded-lg shadow-xl text-sm font-medium z-[9999]
            ${message.type === "success" ? "bg-green-100 text-green-700 border border-green-300" : ""}
            ${message.type === "error" ? "bg-red-100 text-red-700 border border-red-300" : ""}`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ text: "", type: "" })}
              className="ml-3 text-lg font-bold leading-none text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeGoalEvaluation;

