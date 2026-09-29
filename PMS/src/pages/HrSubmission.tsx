import React, { useEffect, useRef, useState } from "react";
import { CiCalendar } from "react-icons/ci";
import { MdOutlineFileUpload } from "react-icons/md";
import { FiEye } from "react-icons/fi";
import frappe from "@/utils/frappe-client";
 
const ALLOWED_EXTENSIONS = ["xlsx", "xls"];
 
type SubmissionRow = {
  name: string;
  assessment_year: string;
  attachment: string;
  uploaded_by: string;
  creation: string;
  result?: string;
};
 
type SkippedRow = {
  row: number;
  employee_code: string;
  reason: string;
};
 
type UploadResult = {
  total_rows: number;
  updated: number;
  skipped: SkippedRow[];
};
 
const isAllowedExcelFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return !!extension && ALLOWED_EXTENSIONS.includes(extension);
};
 
function HrSubmission() {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [appraisalEnabled, setAppraisalEnabled] = useState<boolean | null>(null);
  const [cycleClosed, setCycleClosed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const [showClosePopup, setShowClosePopup] = useState(false);
  const [closeRemark, setCloseRemark] = useState("");
  const [selectedResult, setSelectedResult] = useState<string>("");
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
 
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);
 
  useEffect(() => {
    const fetchCurrentYear = async () => {
      try {
        const res = await frappe.api.get<{ message: [string, string, unknown[]] }>(
          "jh_digitrack.api.pms_report.get_pms_years"
        );
        setSelectedYear(res.message?.[0] || "");
      } catch (err) {
        console.error("Error fetching current PMS year", err);
      }
    };
    fetchCurrentYear();
  }, []);
 
  useEffect(() => {
    const fetchAccess = async () => {
      try {
        const res = await frappe.api.get<{
          message: { has_access: boolean; yearly_appraisal_enabled: boolean; cycle_closed: boolean };
        }>("jh_digitrack.api.hr_submission.get_hr_submission_access");
        setAppraisalEnabled(!!res.message?.yearly_appraisal_enabled);
        setCycleClosed(!!res.message?.cycle_closed);
      } catch (err) {
        console.error("Error fetching HR submission access", err);
        setAppraisalEnabled(false);
      }
    };
    fetchAccess();
  }, []);
 
  const fetchSubmissions = async (year: string) => {
    try {
      const res = await frappe.api.get<{ message: SubmissionRow[] }>(
        "jh_digitrack.api.hr_submission.get_hr_submissions",
        { year }
      );
      setSubmissions(res.message || []);
    } catch (err) {
      console.error("Error fetching HR submissions", err);
      setSubmissions([]);
    }
  };
 
  useEffect(() => {
    if (selectedYear) {
      fetchSubmissions(selectedYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);
 
  const handleDeleteSubmission = async (name: string) => {
    if (cycleClosed) return;
    if (!window.confirm("Are you sure you want to delete this HR submission?")) {
      return;
    }
 
    setDeletingName(name);
    try {
      await frappe.api.post("jh_digitrack.api.hr_submission.delete_hr_submission", { name });
      setSubmissions((prev) => prev.filter((row) => row.name !== name));
      setMessage({ text: "HR submission deleted successfully.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to delete HR submission.", type: "error" });
    } finally {
      setDeletingName(null);
    }
  };
 
  // const handleCloseAppraisalCycle = async () => {
  //   if (cycleClosed) return;
  //   if (!window.confirm("Are you sure you want to close the appraisal cycle?")) {
  //     return;
  //   }
 
  //   setIsClosingCycle(true);
  //   try {
  //     await frappe.api.post("jh_digitrack.api.hr_submission.close_appraisal_cycle", {});
  //     setCycleClosed(true);
  //     setMessage({ text: "Appraisal cycle closed successfully.", type: "success" });
  //   } catch (err: any) {
  //     setMessage({ text: err?.message || "Failed to close appraisal cycle.", type: "error" });
  //   } finally {
  //     setIsClosingCycle(false);
  //   }
  // };
      const handleCloseAppraisalCycle = () => {
        if (cycleClosed || isClosingCycle) return;

        setCloseRemark("");
        setShowClosePopup(true);
      };

      const handleCancelClosePopup = () => {
        if (isClosingCycle) return;

        setCloseRemark("");
        setShowClosePopup(false);
      };

      const handleConfirmCloseCycle = async () => {
        const remark = closeRemark.trim();

        if (remark.length < 3) {
          setMessage({
            text: "Please enter at least 3 characters in the remarks.",
            type: "error",
          });
          return;
        }

        setIsClosingCycle(true);

        try {
          await frappe.api.post(
            "jh_digitrack.api.hr_submission.close_appraisal_cycle",
            {
              remarks: remark,
            }
          );

          setCycleClosed(true);
          setShowClosePopup(false);
          setCloseRemark("");

          setMessage({
            text: `Appraisal cycle for ${selectedYear} closed successfully.`,
            type: "success",
          });
        
        
        } catch (err: any) {
          let errorMessage = "Failed to upload HR Excel file.";

          const rawError = [
            err?.message,
            err?.exception,
            err?.response?.data?.message,
            err?.response?.data?.exception,
            err?.response?.data?._server_messages,
            JSON.stringify(err),
          ]
            .filter(Boolean)
            .join(" ");

          const requiredColumnText =
            "Could not find required column(s) in the uploaded file:";

          const startIndex = rawError.indexOf(requiredColumnText);

          if (startIndex !== -1) {
            let extractedMessage = rawError.substring(startIndex);

            // Remove traceback / escaped new lines / JSON characters
            extractedMessage = extractedMessage
              .split("\\n")[0]
              .split("\n")[0]
              .replace(/\\"/g, '"')
              .replace(/["\]]+$/g, "")
              .trim();

            errorMessage = extractedMessage;
          }

          setMessage({
            text: errorMessage,
            type: "error",
          });
               
               
        } finally {
          setIsClosingCycle(false);
        }
      };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!isAllowedExcelFile(file)) {
      setMessage({ text: "Only Excel files (.xlsx, .xls) are allowed.", type: "error" });
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };
 
  const handleUpload = async () => {
    if (cycleClosed) return;
    if (!selectedYear) {
      setMessage({ text: "Current PMS year is not configured in Settings.", type: "error" });
      return;
    }
    if (!selectedFile) {
      setMessage({ text: "Please choose an Excel file to upload.", type: "error" });
      return;
    }
    if (!isAllowedExcelFile(selectedFile)) {
      setMessage({ text: "Only Excel files (.xlsx, .xls) are allowed.", type: "error" });
      return;
    }
 
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);
      formData.append("year", selectedYear);
 
      const csrfToken =
        (window as any)?.frappe?.csrf_token || (window as any)?.csrf_token || "";
 
      const response = await fetch(
        "/api/method/jh_digitrack.api.hr_submission.submit_hr_excel",
        {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
        }
      );
 
      const result = await response.json();
 
      if (!response.ok || !result?.message?.file_url) {
        const errMessage = result?.message || result?.exc || "Upload failed. Please try again.";
        throw new Error(typeof errMessage === "string" ? errMessage : "Upload failed. Please try again.");
      }
 
      const { total_rows, updated, skipped } = result.message as UploadResult;
      setLastResult({ total_rows, updated, skipped: skipped || [] });
      setMessage({
        text: `HR data updated for ${updated} of ${total_rows} employee(s).`,
        type: updated > 0 ? "success" : "error",
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchSubmissions(selectedYear);
    } catch (err: any) {
      let errorMessage = "Upload failed. Please try again.";

      const rawError = [
        err?.message,
        err?.exception,
        err?.response?.data?.message,
        err?.response?.data?.exception,
        err?.response?.data?._server_messages,
        typeof err === "string" ? err : "",
      ]
        .filter(Boolean)
        .join(" ");

      const requiredColumnText =
        "Could not find required column(s) in the uploaded file:";

      const startIndex = rawError.indexOf(requiredColumnText);

      if (startIndex !== -1) {
        let extractedMessage = rawError.substring(startIndex);

        // Stop before traceback / escaped JSON content
        extractedMessage = extractedMessage
          .split("\\n")[0]
          .split("\n")[0]
          .replace(/\\"/g, '"')
          .replace(/["\]}]+$/g, "")
          .trim();

        errorMessage = extractedMessage;
      }

      setMessage({
        text: errorMessage,
        type: "error",
      });
    } finally {    
      setIsUploading(false);
    }
  };
 
  if (appraisalEnabled === null) {
    return (
      <div className="bg-white min-h-screen border rounded-lg px-6 py-2 h-full relative overflow-hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-primary font-medium">HR Submission</h1>
        </div>
      </div>
    );
  }
 
  if (appraisalEnabled === false) {
    return (
      <div className="bg-white min-h-screen border rounded-lg px-6 py-2 h-full relative overflow-hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-primary font-medium">HR Submission</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <p className="text-sm font-medium text-gray-700">
            Yearly Appraisal is not enabled.
          </p>
          <p className="text-xs text-gray-500">
            Enable "Yearly Appraisal" in Admin Settings to use HR Submission.
          </p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 h-full relative overflow-hidden">
      <div className="flex justify-between items-center">
        <h1 className="text-primary font-medium">HR Submission</h1>
      </div>
 
      <div className="flex flex-col gap-8 pt-5">
        <div className="flex items-center gap-2">
          <p className="text-sm flex items-center gap-1">
            <CiCalendar /> Year
          </p>
          <div className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-gray-50">
            {selectedYear || "..."}
          </div>
        </div>
 
        <div className="flex flex-col gap-2 items-start">
          <p className="text-sm">HR Review Excel File</p>
          <div className="flex items-center gap-3">
            <label
              className={`flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-md text-sm ${
                cycleClosed
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-gray-50"
              }`}
            >
              <MdOutlineFileUpload size={18} />
              Browse
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={cycleClosed}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-500">
              {selectedFile ? selectedFile.name : "No file chosen"}
            </span>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !selectedYear || cycleClosed}
              className="text-white text-sm bg-primary px-5 py-2.5 rounded-md cursor-pointer disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {cycleClosed && (
            <p className="text-xs text-gray-500">
              The appraisal cycle for {selectedYear} is closed. Uploads are disabled.
            </p>
          )}
        </div>
      </div>
 
      {lastResult && (
        <div className="mt-6">
          <p className="text-xs text-gray-600">
            Updated HR rating &amp; comment for{" "}
            <span className="font-medium text-primary">{lastResult.updated}</span> of{" "}
            <span className="font-medium">{lastResult.total_rows}</span> row(s) in the last upload.
          </p>
 
          {lastResult.skipped.length > 0 && (
            <div className="border rounded-lg w-full mt-2">
              <table className="w-full text-center table-fixed">
                <thead className="bg-red-50 text-red-600 text-[11px]">
                  <tr>
                    <th className="py-2 px-2 w-[12%]">Row</th>
                    <th className="py-2 px-2 w-[23%]">Employee Code</th>
                    <th className="py-2 px-2 w-[65%] text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {lastResult.skipped.map((row, index) => (
                    <tr key={index} className="border-t text-xs">
                      <td className="py-2 px-2 w-[12%]">{row.row}</td>
                      <td className="py-2 px-2 w-[23%]">{row.employee_code}</td>
                      <td className="py-2 px-2 w-[65%] text-left">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
 
      <div className="border rounded-lg w-full mt-6">
        <table className="w-full text-center table-auto">
          <thead className="bg-gray-100 text-gray-500 text-[11px]">
            <tr>
              <th className="py-2 px-2">Year</th>
              <th className="py-2 px-2">File</th>
              <th className="py-2 px-2">Uploaded By</th>
              <th className="py-2 px-2">Uploaded On</th>
              <th className="py-2 px-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-xs text-gray-400">
                  No submissions uploaded for {selectedYear} yet.
                </td>
              </tr>
            ) : (
              submissions.map((row) => (
                <tr key={row.name} className="border-t text-xs">
                  <td className="py-2 px-2">{row.assessment_year}</td>
                  <td className="py-2 px-2">
                    <a
                      href={row.attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {row.attachment?.split("/").pop()}
                    </a>
                  </td>
                  <td className="py-2 px-2">{row.uploaded_by}</td>
                  <td className="py-2 px-2">{row.creation}</td>
                  {/* <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteSubmission(row.name)}
                      disabled={deletingName === row.name || cycleClosed}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <AiOutlineDelete size={16} className="inline" />
                    </button>
                  </td> */}
                   
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedResult(row.result || "No result available.");
                        setShowResultPopup(true);
                      }}
                      className="text-primary hover:opacity-70"
                      title="View Result"
                    >
                      <FiEye size={16} className="inline" />
                    </button>
                  </td>                                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
 
      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={handleCloseAppraisalCycle}
          disabled={isClosingCycle || cycleClosed}
          className="text-white text-sm bg-primary px-5 py-2.5 rounded-md cursor-pointer disabled:opacity-50"
        >
          {cycleClosed ? "Appraisal Cycle Closed" : isClosingCycle ? "Closing..." : "Close Appraisal Cycle"}
        </button>
      </div>
      {showClosePopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[500px] rounded-lg bg-white shadow-2xl">

            {/* Header */}
            <div className="flex justify-end px-6 pt-4">
              <button
                type="button"
                onClick={handleCancelClosePopup}
                disabled={isClosingCycle}
                className="text-xl leading-none text-gray-400 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold leading-6 text-red-700">
                  Once the appraisal cycle for{" "}
                  <span className="font-bold">{selectedYear}</span>{" "}
                  is closed, it cannot be edited or uploaded.
                </p>
              </div>

              <label className="mt-5 block text-sm font-medium text-gray-700">
                Remarks
              </label>

              <textarea
                value={closeRemark}
                onChange={(e) => setCloseRemark(e.target.value)}
                placeholder="Enter remarks..."
                rows={4}
                disabled={isClosingCycle}
                className="mt-2 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100"
              />

              <p
                className={`mt-1 text-xs ${
                  closeRemark.trim().length < 3
                    ? "text-gray-500"
                    : "text-green-600"
                }`}
              >
                Minimum 3 characters required.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={handleCancelClosePopup}
                disabled={isClosingCycle}
                className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCloseCycle}
                disabled={
                  isClosingCycle ||
                  closeRemark.trim().length < 3
                }
                className="rounded-md bg-primary px-5 py-2.5 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isClosingCycle ? "Confirming..." : "Confirm"}
              </button>
            </div>

          </div>
        </div>
      )}
      {showResultPopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[750px] rounded-lg bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-medium text-primary">
                Upload Result
              </h2>

              <button
                type="button"
                onClick={() => setShowResultPopup(false)}
                className="text-xl leading-none text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Result */}
            <div className="px-6 py-5">
              {selectedResult ? (
                <div className="overflow-hidden rounded-md border border-gray-200">
                  <table className="w-full table-fixed text-center text-xs">

                    <thead className="bg-red-50 text-red-600 text-[11px]">
                      <tr>
                        <th className="py-2 px-2 w-[12%]">
                          Row
                        </th>

                        <th className="py-2 px-2 w-[23%]">
                          Employee Code
                        </th>

                        <th className="py-2 px-2 w-[65%] text-left">
                          Reason
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedResult
                        .split("\n")
                        .slice(1)
                        .filter((line) => line.trim())
                        .map((line, index) => {
                          const parts = line.split("|");

                          const rowNumber = parts[0]?.trim() || "";
                          const employeeCode = parts[1]?.trim() || "";
                          const reason = parts.slice(2).join("|").trim();

                          return (
                            <tr key={index} className="border-t text-xs">
                              <td className="py-2 px-2 w-[12%]">
                                {rowNumber}
                              </td>

                              <td className="py-2 px-2 w-[23%]">
                                {employeeCode}
                              </td>

                              <td className="py-2 px-2 w-[65%] text-left">
                                {reason}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>

                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">
                  No result available.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowResultPopup(false)}
                className="rounded-md bg-primary px-5 py-2.5 text-sm text-white"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )} 
      {message.text && (
        <div
          className={`fixed top-5 right-5 flex items-center justify-between gap-3 px-6 py-3 rounded-lg shadow-xl text-sm font-medium z-[9999]
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
  );
}
 
export default HrSubmission;
 
 