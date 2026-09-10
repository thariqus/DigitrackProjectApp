import { useState, useEffect } from 'react'
import { toast } from 'sonner';
import { useGoalEvaluation, useSubmitGoalEvaluation, useGoalAssessment, useDeleteGoalAttachment, useAddGoalDocument, GoalDocumentAttachment } from "../../hooks/goalevaluation";
import { useFilesUpload } from "@/hooks/file";
import { HiArrowNarrowDown } from 'react-icons/hi';
import { FaRegSave, FaStar } from 'react-icons/fa';
import {
  IoCloudUploadOutline,
  IoCloseOutline,
  IoTrendingUpOutline,
  IoSchoolOutline,
  IoRibbonOutline,
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircle,
  IoSaveOutline,
} from 'react-icons/io5';
import Pagination from '@/components/Pagination';

const MAX_REVIEW_FILES = 4;
const MAX_COMMENT_LENGTH = 500;

type ReviewFlagKey = "eligibleForIncrement" | "trainingRequirementsIdentified" | "eligibleForPromotion";

interface PendingReviewFile {
  file: File;
  documentType: string;
}

interface ManagerReview {
  rating: number;
  eligibleForIncrement: boolean;
  trainingRequirementsIdentified: boolean;
  eligibleForPromotion: boolean;
  comment: string;
  files: PendingReviewFile[];
}

const emptyReview: ManagerReview = {
  rating: 0,
  eligibleForIncrement: false,
  trainingRequirementsIdentified: false,
  eligibleForPromotion: false,
  comment: "",
  files: [],
};

const REVIEW_CHECKBOXES: { key: ReviewFlagKey; label: string; icon: typeof IoTrendingUpOutline }[] = [
  { key: "eligibleForIncrement", label: "Eligible for Increment", icon: IoTrendingUpOutline },
  { key: "trainingRequirementsIdentified", label: "Training Required", icon: IoSchoolOutline },
  { key: "eligibleForPromotion", label: "Eligible for Promotion", icon: IoRibbonOutline },
];

function ManagerYearlySubmission() {

    const [selectedYear, setSelectedYear] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortField, setSortField] = useState<"id" | "designation" | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [reviews, setReviews] = useState<Record<string, ManagerReview>>({});
    const [hoveredRating, setHoveredRating] = useState<Record<string, number>>({});
    const [savingDocname, setSavingDocname] = useState<string | null>(null);
    const [existingAttachments, setExistingAttachments] = useState<
      Record<string, GoalDocumentAttachment[]>
    >({});

    const getReview = (docname: string) => reviews[docname] || emptyReview;
    const getExistingAttachments = (docname: string) => existingAttachments[docname] || [];

    const toggleReviewFlag = (docname: string, key: ReviewFlagKey) => {
      const current = getReview(docname);
      setReviews((prev) => ({
        ...prev,
        [docname]: { ...current, [key]: !current[key] },
      }));
    };

    const setRating = (docname: string, rating: number) => {
      const current = getReview(docname);
      setReviews((prev) => ({
        ...prev,
        [docname]: { ...current, rating: current.rating === rating ? 0 : rating },
      }));
    };

    const setComment = (docname: string, comment: string) => {
      setReviews((prev) => ({
        ...prev,
        [docname]: { ...getReview(docname), comment },
      }));
    };

    const addFiles = (docname: string, incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const current = getReview(docname);
      const room = MAX_REVIEW_FILES - getExistingAttachments(docname).length - current.files.length;
      if (room <= 0) return;
      const nextFiles = [...current.files, ...Array.from(incoming).slice(0, room)];
      setReviews((prev) => ({
        ...prev,
        [docname]: { ...current, files: nextFiles },
      }));
    };

    const removeFile = (docname: string, index: number) => {
      const current = getReview(docname);
      setReviews((prev) => ({
        ...prev,
        [docname]: { ...current, files: current.files.filter((_, i) => i !== index) },
      }));
    };

    const { evaluations, loading, baseYear, years, refetch } = useGoalEvaluation(
      selectedYear
    );

    useEffect(() => {
      if (!evaluations || evaluations.length === 0) return;

      setReviews((prev) => {
        const next = { ...prev };
        let changed = false;
        evaluations.forEach((emp: any) => {
          if (!next[emp.docname]) {
            next[emp.docname] = {
              rating: emp.rating || 0,
              eligibleForIncrement: !!emp.eligible_for_increment,
              trainingRequirementsIdentified: !!emp.training_requirement_identified,
              eligibleForPromotion: !!emp.eligible_for_promotion,
              comment: emp.comment || "",
              files: [],
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setExistingAttachments((prev) => {
        const next = { ...prev };
        evaluations.forEach((emp: any) => {
          next[emp.docname] = emp.attachments || [];
        });
        return next;
      });
    }, [evaluations]);

    const { createGoalAssessment } = useGoalAssessment();
    const { deleteGoalAttachment } = useDeleteGoalAttachment();
    const filesUpload = useFilesUpload();

    const handleRemoveExistingAttachment = async (
      docname: string,
      employeeCode: string,
      fileUrl: string
    ) => {
      const result = await deleteGoalAttachment(employeeCode, selectedYear, fileUrl);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setExistingAttachments((prev) => ({
        ...prev,
        [docname]: (prev[docname] || []).filter((f) => f.file_url !== fileUrl),
      }));
      toast.success("Attachment removed successfully.");
    };

    const uploadReviewFiles = (docname: string, employeeCode: string, files: File[]) =>
      new Promise<boolean>((resolve) => {
        if (files.length === 0) {
          resolve(true);
          return;
        }

        filesUpload.mutate({
          files,
          employeeCode,
          year: selectedYear,
          doctype: "Goal Assessment",
          docname,
          isPrivate: 1,
          onProgress: () => {},
          onComplete: (status) => resolve(status),
          onError: () => resolve(false),
        });
      });

    const handleSaveReview = async (docname: string, employeeCode: string) => {
      const review = getReview(docname);

      setSavingDocname(docname);
      try {
        const result = await createGoalAssessment({
          employee_code: employeeCode,
          year: selectedYear,
          goals: [],
          rating: review.rating,
          eligible_for_increment: review.eligibleForIncrement,
          training_requirement_identified: review.trainingRequirementsIdentified,
          eligible_for_promotion: review.eligibleForPromotion,
          comment: review.comment.trim(),
        });

        if (result?.error) {
          toast.error(result.error);
          return;
        }

        const filesUploaded = await uploadReviewFiles(docname, employeeCode, review.files);
        if (!filesUploaded) {
          toast.error("Review saved, but some attachments failed to upload.");
        } else {
          toast.success("Review saved successfully!");
        }

        setReviews((prev) => ({
          ...prev,
          [docname]: { ...getReview(docname), files: [] },
        }));
        refetch();
      } finally {
        setSavingDocname(null);
      }
    };

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

    useEffect(() => {
      if (baseYear && !selectedYear) {
        setSelectedYear(baseYear);
      }
    }, [baseYear]);

    const handleSort = (field: "id" | "designation") => {
      if (sortField === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortOrder("asc");
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
        case "designation":
          valA = a.designation_name || "";
          valB = b.designation_name || "";
          break;
      }

      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

    const totalPages = Math.ceil(sortedEmployees.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = sortedEmployees.slice(indexOfFirstRow, indexOfLastRow);

    const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2">
      {/* Header */}
      <div className="flex items-center pb-2">
        <h1 className="text-primary font-semibold mr-4">Yearly Submission</h1>
      </div>
      <div className="flex items-center justify-between gap-3">
         <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2 py-1 border rounded-md text-[0.65rem]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* {fromDate && toDate && (
            <div className="text-[0.65rem] text-gray-600 flex items-center gap-1">
              <span className="font-medium">Period:</span>
              <span>{formatDate(fromDate)}</span>–
              <span>{formatDate(toDate)}</span>
            </div>
          )} */}
          <button className='bg-primary py-1 px-2 text-xs rounded-md text-white'>Submit</button>

      </div>
       <div className="border rounded-lg w-full mt-1">
         {/* Table */}
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[20%]" />
            <col className="w-[25%]" />
            <col className="w-[25%]" />
            <col className="w-[5%]" />
          </colgroup>
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
              {/* Manager Review */}
              <th className="py-3 px-4">Manager Review</th>
              <th className="py-3 px-4">Comments</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : (
              currentRows.map((emp) => {
                const review = getReview(emp.docname);
                const existingFiles = getExistingAttachments(emp.docname);
                const fileLimitReached =
                  existingFiles.length + review.files.length >= MAX_REVIEW_FILES;

                return (
                  <tr key={emp.docname} className="border-b text-xs align-top transition">
                    <td className="px-4 py-3 whitespace-nowrap" title={`${emp.employee_code} / ${emp.employee_name}`}>
                      {emp.employee_code} / {emp.employee_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" title={emp.designation_name || "-"}>
                      {emp.designation_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex w-full flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                        {/* Rating */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">
                            Rating
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(emp.docname, star)}
                                className="p-0.5 transition-transform hover:scale-110"
                                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                              >
                                <FaStar
                                  className={`h-3.5 w-3.5 transition-colors ${
                                    star <= review.rating ? "text-amber-400" : "text-gray-200"
                                  }`}
                                />
                              </button>
                            ))}
                            <span className=" p-1 min-w-[1.5rem] text-[0.65rem] bg-primary/30  font-medium text-primary rounded-full">
                              {review.rating > 0 ? `${review.rating}/5` : "0/5"}
                            </span>
                          </div>
                        </div>

                        {/* Review checkboxes */}
                        <div className="flex flex-col gap-2 px-3 py-2.5">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">
                            Checklist
                          </span>
                          {REVIEW_CHECKBOXES.map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 text-[0.68rem] text-gray-700 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={review[key]}
                                onChange={() => toggleReviewFlag(emp.docname, key)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-primary accent-primary focus:ring-primary"
                              />
                              {label}
                            </label>
                          ))}
                        </div>

                        {/* File upload */}
                        <div className="flex flex-col gap-2 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">
                              Attachments
                            </span>
                            <span className="text-[0.6rem] font-medium text-gray-400">
                              {existingFiles.length + review.files.length}/{MAX_REVIEW_FILES}
                            </span>
                          </div>

                          {existingFiles.length > 0 && (
                            <ul className="flex flex-col gap-1">
                              {existingFiles.map((file) => (
                                <li
                                  key={file.file_url}
                                  className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1 text-[0.6rem]"
                                >
                                  <a
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-primary hover:underline"
                                  >
                                    {file.file_name}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveExistingAttachment(emp.docname, emp.employee_code, file.file_url)
                                    }
                                    className="text-gray-400 hover:text-red-500"
                                    aria-label="Remove file"
                                  >
                                    <IoCloseOutline />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <label
                            className={`flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-[0.65rem] font-medium transition ${
                              fileLimitReached
                                ? "cursor-not-allowed border-gray-200 text-gray-300"
                                : "cursor-pointer border-gray-300 text-gray-500 hover:border-primary hover:bg-secondary/60 hover:text-primary"
                            }`}
                          >
                            <input
                              type="file"
                              multiple
                              hidden
                              disabled={fileLimitReached}
                              onChange={(e) => {
                                addFiles(emp.docname, e.target.files);
                                e.target.value = "";
                              }}
                            />
                            <IoCloudUploadOutline className="text-sm" />
                            {fileLimitReached ? "Limit reached" : "Attach file"}
                          </label>

                          {review.files.length > 0 && (
                            <ul className="flex flex-col gap-1">
                              {review.files.map((file, idx) => (
                                <li
                                  key={`${file.name}-${idx}`}
                                  className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1 text-[0.6rem]"
                                >
                                  <span className="truncate">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(emp.docname, idx)}
                                    className="text-gray-400 hover:text-red-500"
                                    aria-label="Remove file"
                                  >
                                    <IoCloseOutline />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex w-full flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:shadow-md hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">
                            Comments
                          </span>
                          <span className="text-[0.6rem] font-medium text-gray-300">
                            {review.comment.length}/{MAX_COMMENT_LENGTH}
                          </span>
                        </div>
                        <textarea
                          value={review.comment}
                          maxLength={MAX_COMMENT_LENGTH}
                          onChange={(e) => setComment(emp.docname, e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                          placeholder="Add comments or feedback"
                          rows={10}
                          className="w-full resize-none rounded-md border-0 bg-transparent p-0 text-[0.68rem] leading-relaxed text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-0"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSaveReview(emp.docname, emp.employee_code)}
                        disabled={savingDocname === emp.docname}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-secondary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Save review"
                        title="Save review"
                      >
                          <FaRegSave className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
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
  )
}

export default ManagerYearlySubmission