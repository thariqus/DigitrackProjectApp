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
  achieved?: string;
  remark?: string;
  upwarddownward?: "U" | "D"; 
  weightage: string;
}

interface Employee {
  id: string;
  name: string;
  designation_name?: string;
  grade?: string;
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
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittedComment, setSubmittedComment] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const cameFromViewflag = localStorage.getItem("CameFromView");

useEffect(() => {
  if (message.text !== "") {
    const timer = setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [message]);

useEffect(() => {
  const empData = localStorage.getItem("SelectedEmployee");
  const selectedYear = localStorage.getItem("SelectedYear");


  if (empData) {
    try {
      const emp = JSON.parse(empData);

      setEmployee({
        id: emp.employee_code || emp.id || "",
        name: emp.employee_name || emp.name || "",
        designation_name: emp.designation_name || "",
        grade: emp.grade || "",
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
  const cameFromView = localStorage.getItem("CameFromView"); 
  if (empData) {
    try {
      const emp = JSON.parse(empData);
      setEmployee({
        id: emp.employee_code || emp.id || "",
        name: emp.employee_name || emp.name || "",
        designation_name: emp.designation_name || "",
        grade: emp.grade || "",
      });
    } catch (error) {
      console.error("Failed to parse employee data:", error);
    }
  } else {
    console.warn("No SelectedEmployee found in localStorage, navigating back.");
    navigate("/goalevaluation");
  }

  if (selectedYear) setYear(selectedYear);
  if (savedStatus && savedStatus === "Evaluation Submitted" || cameFromView === "1") {
    setIsSubmitted(true);
  } else {
    setIsSubmitted(false);
  }
}, [navigate]);


  const {
    employeeGoals: fetchedEmployeeGoals,
    attachments: fetchedAttachments,
    comment: fetchedComment,
    enableGoalEvaluation,
  } = useEmployeeGoals(employee?.id || "", year || "");

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
        weightage: goal.weightage || "",
        upwarddownward: goal.upwarddownward || "", 
        achievement_score: goal.achievement_score || "",
        score: goal.achievement_score || "",
        // achieved: goal.achieved || "",
        achieved:
          goal.uom === "Text"
            ? goal.achieved || ""
            : goal.achieved
              ? parseFloat(goal.achieved).toFixed(2)
              : "",

        remark: goal.remark || "",
      }));
      setGoals(formattedGoals);
    }

    if (fetchedAttachments && fetchedAttachments.length > 0) {
      setAttachments(fetchedAttachments);
    }
    if (fetchedComment) {
      setSubmittedComment(fetchedComment);
    }
  }, [fetchedEmployeeGoals, fetchedAttachments, fetchedComment]);

  const calculateAchievedScore = (
    achievement: string,
    target: string,
    direction?: "U" | "D"
  ): string => {
    const ach = parseFloat(achievement);
    const tar = parseFloat(target);

    if (isNaN(ach) || isNaN(tar) || tar === 0) return "";

    let score = 0;

    if (direction === "U") {
      score = (ach / tar) * 100;
    } else if (direction === "D") {
      score = (tar / ach) * 100;
    } else {
      return "";
    }

    if (!isFinite(score)) return "";
    return score.toFixed(2);
  };


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
        const result = await uploadGoalAttachment(
          employee.id,
          year,
          selectedFile,
          {
            attach1: attachments[0]?.file_url || null,
            attach2: attachments[1]?.file_url || null,
            attach3: attachments[2]?.file_url || null,
          }
        );

        if (result.error) {
          // ❗ If it's the 3-file limit — do NOT push to UI
          setMessage({ text: result.error, type: "error" });
          return;
        }

        // SUCCESS → push to UI
        setMessage({ text: "File uploaded successfully!", type: "success" });

        setAttachments((prev) => [
          ...prev,
          { file_name: selectedFile.name, file_url: result.file_url || "" },
        ]);


     
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

        setAttachments((prev) => prev.filter((a) => a.file_url !== fileUrl));
      }
    } catch (error) {
      console.error("Delete failed:", error);
      setMessage({ text: "Failed to delete attachment.", type: "error" });
    }

    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };


  const handleInputChange = (
    index: number,
    field: "score" | "remark",
    value: string
  ) => {
    const updatedGoals = [...goals];
    updatedGoals[index][field] = value;

    if (field === "score" && updatedGoals[index].uom !== "Text") {
      updatedGoals[index].achieved = calculateAchievedScore(
        value,
        updatedGoals[index].targetvalue,
        updatedGoals[index].upwarddownward
      );
    }

    setGoals(updatedGoals);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!employee || !year) {
      setMessage({ text: "Missing employee or year.", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);

      return;
    }
  // const missingFields = goals.filter(
  //   (g) => !g.score || g.score.trim() === "" || !g.remark || g.remark.trim() === ""
  // );
  const missingFields = goals.filter((g) => {
    if (g.uom === "Text") {
      return !g.achieved || !g.remark?.trim();
    }
    return !g.score || g.score.trim() === "" || !g.remark?.trim();
  });

  if (missingFields.length > 0) {
    setMessage({
      text: "Please fill all required fields before saving.",
      type: "error",
    });
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
        // achievement_score: g.score || g.achievement_score || "",
        achievement_score:
          g.uom === "Text"
            ? null
            : g.score || g.achievement_score || "",

        achieved:
          g.uom === "Text"
            ? g.achieved || ""
            : null,
        remarks: g.remark || "",
      })),
    };

  const result = await createGoalAssessment(payload);


  if (result?.error) {
    setIsDirty(false);
    setMessage({ text: "Failed to save goal evaluation.", type: "error" });
  } else {
    setMessage({ text: "Goal Evaluation saved successfully!", type: "success" });

    const achievedScores = result?.message?.achieved_scores || result?.achieved_scores || {};
    setIsDirty(false);
    setGoals((prevGoals) =>
      prevGoals.map((g) => ({
        ...g,
        // achieved: achievedScores[g.goal_id]?.toFixed(2) || g.achieved || "",
        achieved: achievedScores[g.goal_id] 
          ? parseFloat(achievedScores[g.goal_id]).toFixed(2)
          : g.achieved || "",

      }))
      
    );
  }
  };

  const handleSubmit = async (comment: string = "") => {
    if (isDirty) {
      setMessage({
        text: "You have unsaved changes. Please save before submitting.",
        type: "error",
      });
      return;
    }

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
  const userConfirmed = window.confirm(
    "Are you sure you want to submit the goals? Once submitted, you cannot edit."
  );

  if (!userConfirmed) return;
  setShowCommentPopup(true);

  };
  const handleFinalSubmit = async (comment: string) => {
    if (!employee || !year) return;
    const response = await submitGoalEvaluation(employee.id, year, comment);

    if (response.error) {
      setMessage({ text: response.error, type: "error" });
    } else {
      setMessage({ text: response.message || "Goal Evaluation submitted!", type: "success" });
      setIsSubmitted(true);
      setSubmittedComment(comment);
    }
    localStorage.setItem("SelectedStatus", "Evaluation Submitted");
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };


  const handleNavigation = () => {
  localStorage.removeItem("SelectedStatus");
  localStorage.removeItem("CameFromView");
  navigate("/goalevaluation");
};
  const finalScore = useMemo(() => {
    const scores = goals.map((g) => {
      const achieved = parseFloat(g.achieved || "0");
      const weight = parseFloat(g.weightage || "0");

      if (isNaN(achieved) || isNaN(weight)) return 0;

      return (achieved * weight) / 100;
    });

    const total = scores.reduce((sum, val) => sum + val, 0);
    return parseFloat(total.toFixed(2));
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

      <div className="bg-white w-full h-full border rounded-lg px-6 py-2 relative overflow-y-auto">
        <div className="flex items-start justify-between">
          <h1 className=" text-primary font-medium mb-3">Employee Goal Evaluation</h1>
          {/* <IoCloseOutline className="text-2xl cursor-pointer" onClick={() => navigate("/goalevaluation")} /> */}
          {/* <IoCloseOutline
            className="text-2xl cursor-pointer"
            onClick={() => {
              localStorage.removeItem("CameFromView");
              navigate("/goalevaluation");
            }}
          /> */}
          <IoCloseOutline
            className="text-2xl cursor-pointer"
            onClick={() => {
              const cameFromView = localStorage.getItem("CameFromView");

              // Remove the flag so future openings don't trigger self-view flow
              localStorage.removeItem("CameFromView");

              // Redirect based on entry route
              if (cameFromView === "1") {
                navigate("/self-evaluation-history");
              } else {
                navigate("/goalevaluation");
              }
            }}
          />

        </div>

        <div className="flex items-start justify-between">
          {employee && (
          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500">
            {!cameFromViewflag && (
              <>
                <span
                  className="cursor-pointer hover:text-primary underline decoration-gray-400"
                  onClick={handleNavigation}
                >
                  Goal Evaluation
                </span>
                <span>&gt;</span>
              </>
            )}

            <span className="text-primary font-medium">
              {employee.id} / {employee.name}
            </span>
            {(employee.designation_name || employee.grade) && (
              <span className="text-xs text-gray-500">
                {employee.designation_name}
                {employee.designation_name && employee.grade && " / "}
                {employee.grade}
              </span>
            )}
          </div>


            // </div>
          )}
        


          <div className="text-sm font-medium text-gray-700">
            <p>
              Final Score: <span className="text-primary">{finalScore}</span>
            </p>
          </div>

        </div>

        {/* Table */}
        <div className="border rounded-lg w-full mt-2 overflow-x-auto">
          <table className="w-full text-left table-auto border-collapse">
            <thead className="bg-gray-100 text-gray-700 text-xs font-normal">
              <tr>
                <th className="py-3 px-1 w-[27.5%] sticky left-0 bg-gray-100 z-10">Goal Name/Goal Description</th>
                <th className="py-3 px-1 w-[27.5%]">Measurement Criteria</th>
                <th className="py-3 px-1 w-[8%] text-center">Target Value / UOM </th>
                <th className="py-3 px-1 w-[5%] text-center">Achievement Value</th>
                <th className="py-3 px-1 w-[5%] text-center">Weightage/ Achieved Score</th> 
                <th className="py-3 px-1 w-[27%] text-center">Remark</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((goal, idx) => (
                <tr key={goal.id} className="border-b text-sm">
                  {/* <td className="py-2 px-1 flex flex-col gap-1 sticky left-0 bg-white z-5"> */}
                  <td className="py-2 px-1 flex flex-col gap-1 sticky left-0 bg-white z-5 
                  max-w-[520px] break-words whitespace-pre-wrap overflow-hidden">

                    <span>{goal.name}   </span>
                    <span>{goal.desc}</span>
                    <input type="hidden" value={goal.goal_id} readOnly />
                  </td>
                  {/* <td className="py-2 px-1">{goal.measurement}</td> */}
                  <td className="py-2 px-1 max-w-[180px] break-words whitespace-pre-wrap overflow-hidden">
                    {goal.measurement}
                  </td>

                 
                  <td className="py-2 px-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Target Value */}
                      <span>{goal.targetvalue}</span>

                      {/* UOM */}
                      <span className="text-xs font-medium text-gray-700">
                        {goal.uom === "Percentage"
                          ? "%"
                          : goal.uom === "Number"
                          ? "NUM"
                          : goal.uom === "Text"
                          ? "TXT"
                          : "-"}
                      </span>


                      {/* Upward / Downward */}
                      {goal.upwarddownward === "U" && (
                        <span className="text-green-500">↑</span>
                      )}
                      {goal.upwarddownward === "D" && (
                        <span className="text-red-500">↓</span>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-1 text-center">
                    {/* <input
                      key={goal.id}  
                      type="text"
                      value={goal.score || ""}
                      readOnly={isSubmitted || !enableGoalEvaluation}
                      onChange={(e) => {
                        if (isSubmitted) return;
                        let value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                        handleInputChange(idx, "score", value);
                      }}
                      className="border p-1 w-20 rounded text-center"
                    /> */}
                    <input
                      key={goal.id}
                      type="text"
                      value={goal.uom === "Text" ? "0" : goal.score || ""}

                      readOnly={
                        isSubmitted ||
                        !enableGoalEvaluation ||
                        goal.uom === "Text"
                      }
                      disabled={goal.uom === "Text"}
                      onChange={(e) => {
                        if (goal.uom === "Text" || isSubmitted) return;

                        let value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                        handleInputChange(idx, "score", value);
                      }}
                      className={`border p-1 w-20 rounded text-center
                        ${goal.uom === "Text" ? "bg-gray-100 cursor-not-allowed" : ""}
                      `}
                    />

                  </td>

                  {/* WEIGHTAGE + ACHIEVED IN SINGLE LINE */}
                  <td className="py-2 px-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Weightage */}
                      <span>
                        {goal.weightage}%
                      </span>
                      {/* <input
                        type="text"
                        value={goal.achieved || ""}
                        readOnly
                        className="border p-1 w-16 rounded text-center bg-gray-50"
                      /> */}
                      <input
                        key={goal.id}
                        type="text"
                        value={goal.achieved || ""}
                        readOnly={goal.uom !== "Text" || isSubmitted || !enableGoalEvaluation}
                        onChange={(e) => {
                          if (goal.uom !== "Text") return;

                          let value = e.target.value.replace(/[^0-9.]/g, "").slice(0, 3);

                          const updated = [...goals];
                          updated[idx].achieved = value;
                          setGoals(updated);
                          setIsDirty(true);
                        }}
                        className={`border p-1 w-16 rounded text-center
                          ${goal.uom === "Text" ? "" : "bg-gray-50"}
                        `}
                      />

                    </div>
                  </td>

                  <td className="py-2 px-4 break-words max-w-[300px]">

                    {/* When submitted → show remark as plain text */}
                    {isSubmitted ? (
                      <p className="text-gray-700 text-sm whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border">
                        {goal.remark || "-"}
                      </p>
                    ) : (
                      /* Before submit → show textarea */
                      <textarea
                        value={goal.remark || ""}
                        readOnly={isSubmitted || !enableGoalEvaluation}
                        maxLength={140}
                        onChange={(e) => {
                          if (isSubmitted) return;

                          const value = e.target.value.slice(0, 250);
                          handleInputChange(idx, "remark", value);
                        }}
                        className="border p-1 w-full rounded "
                        rows={4}
                      />
                    )}

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
                  {/* Submitted Comment */}
        {/* {isSubmitted && submittedComment && (
          <div className="mx-2  mb-2 px-4 py-2 border rounded-lg bg-gray-50">
            <h3 className="text-md font-medium text-gray-800 mb-1">Comment</h3>
            <p className="text-gray-700 text-sm h-20 overflow-x-none overflow-y-auto whitespace-pre-line">{submittedComment}</p>
          </div>
        )} */}
        

        {isSubmitted && submittedComment && (
          <div className="mx-2 mb-2 px-4 py-2 border rounded-lg bg-gray-50">
            <h3 className="text-md font-medium text-gray-800 mb-1">Comment</h3>

            <p className="text-gray-700 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap break-words leading-5 p-2 border rounded bg-white">
              {submittedComment}
            </p>
          </div>
        )}
        </div>
        {/* Footer */}


        <div className="flex items-start justify-between mt-2 w-full">

          {/* ---------------- LEFT SIDE: ATTACHMENTS LIST ---------------- */}
          <div className="min-w-[260px] relative">
            {attachments.length > 0 && (
              <div className="border border-gray-200 rounded-sm p-2 bg-white w-full">
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
                        className="truncate w-3/4 text-primary hover:underline"
                      >
                        {file.file_name}
                      </a>

                      {!isSubmitted && enableGoalEvaluation &&(
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

          {!isSubmitted && enableGoalEvaluation &&(
            <div className="flex items-center gap-4">

              {/* Attach File */}
              <label
                className="flex items-center bg-secondary gap-2 px-4 py-2 rounded-sm cursor-pointer hover:bg-gray-100 transition"
                title="Allowed file types: PDF, JPG, PNG, DOCX, XLSX, CSV, SVG(Max 2MB)"
              >
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
                <IoCloudUploadOutline className="text-gray-500" />
                <span className="text-gray-600 text-sm font-medium">Attach File</span>
              </label>

              {/* Save */}
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm rounded-sm bg-secondary text-gray-600 hover:bg-secondary/80"
              >
                Save
              </button>

              {/* Submit */}
                  <button
                    onClick={() => {

                      handleSubmit();
                    }}
                    className="px-4 py-2 text-sm rounded-sm bg-primary text-white hover:bg-primary/80"
                  >
                    Submit
                  </button>
            </div>
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
        {showCommentPopup && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-lg w-[870px]  shadow-lg">
              <h2 className="text-lg font-medium mb-3 text-primary">Add Comment</h2>

              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 500); 
                  setCommentText(value);
                }}
                className="w-full border rounded p-2 h-50 text-sm"
                placeholder="Add comment (optional)"
              ></textarea>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  className="px-4 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  onClick={() => {
                    setShowCommentPopup(false);
                  }}
                >
                  Close
                </button>

                <button
                  className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary/80"
                  onClick={() => {
                    if (!commentText.trim()) {
                      setMessage({
                        text: "Comment cannot be empty while submitting.",
                        type: "error",
                      });
                      return; // ⛔ stop here
                    }

                    setShowCommentPopup(false);
                    handleFinalSubmit(commentText);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EmployeeGoalEvaluation;

