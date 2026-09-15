import { useState, useEffect } from 'react'
import { toast } from 'sonner';
import {
  useFunctionalOrSkipLevelYearlySubmission,
  useGoalAssessment,
  useSubmitGoalEvaluation,
} from "../../hooks/goalevaluation";
import { HiArrowNarrowDown } from 'react-icons/hi';
import { FaRegSave, FaStar } from 'react-icons/fa';
import { TiTickOutline } from "react-icons/ti";
import {
  IoTrendingUpOutline,
  IoSchoolOutline,
  IoRibbonOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
} from 'react-icons/io5';
import Pagination from '@/components/Pagination';

const MAX_COMMENT_LENGTH = 500;

type ReviewFlagKey = "eligibleForIncrement" | "trainingRequirementsIdentified" | "eligibleForPromotion";

interface SkipLevelReview {
  rating: number;
  comment: string;
}

const emptySkipLevelReview: SkipLevelReview = {
  rating: 0,
  comment: "",
};

const getInitials = (name?: string) => {
  if (!name) return "M";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "M";
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const datePart = date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const timePart = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
};

const REVIEW_CHECKBOXES: { key: ReviewFlagKey; label: string; icon: typeof IoTrendingUpOutline }[] = [
  { key: "eligibleForIncrement", label: "Eligible for Increment", icon: IoTrendingUpOutline },
  { key: "trainingRequirementsIdentified", label: "Training Required", icon: IoSchoolOutline },
  { key: "eligibleForPromotion", label: "Eligible for Promotion", icon: IoRibbonOutline },
];

// Read-only summary of a stage that has already been submitted (functional
// manager's review, or skip-level manager's review), shown to later-stage
// reviewers alongside their own editable fields.
function StageReadOnlyBlock({ label, rating, comment }: { label: string; rating?: number; comment?: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 bg-gray-50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-500">{label}</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={`h-3 w-3 ${star <= (rating || 0) ? "text-amber-400" : "text-gray-200"}`}
            />
          ))}
          <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[0.6rem] font-medium text-gray-500">
            {rating && rating > 0 ? `${rating}/5` : "0/5"}
          </span>
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-[0.68rem] italic leading-snug text-gray-600">
        {comment ? `"${comment}"` : "No comments added."}
      </p>
    </div>
  );
}

function FunctionalOrSkiplevelYearlysubmission() {

  const [selectedYear, setSelectedYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<"id" | "designation" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [skipReviews, setSkipReviews] = useState<Record<string, SkipLevelReview>>({});
  const [savingDocname, setSavingDocname] = useState<string | null>(null);
  const [submittingDocname, setSubmittingDocname] = useState<string | null>(null);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, { rating?: boolean; comment?: boolean }>
  >({});

  const getSkipReview = (docname: string) => skipReviews[docname] || emptySkipLevelReview;

  const clearValidationError = (docname: string, key: "rating" | "comment") => {
    setValidationErrors((prev) => {
      if (!prev[docname]?.[key]) return prev;
      const rest = { ...prev[docname] };
      delete rest[key];
      return { ...prev, [docname]: rest };
    });
  };

  const setSkipRating = (docname: string, rating: number) => {
    const current = getSkipReview(docname);
    setSkipReviews((prev) => ({
      ...prev,
      [docname]: { ...current, rating: current.rating === rating ? 0 : rating },
    }));
    clearValidationError(docname, "rating");
  };

  const setSkipComment = (docname: string, comment: string) => {
    setSkipReviews((prev) => ({
      ...prev,
      [docname]: { ...getSkipReview(docname), comment },
    }));
    if (comment.trim()) clearValidationError(docname, "comment");
  };

  const { evaluations, loading, baseYear, years, enableYearlyAppraisal, refetch } = useFunctionalOrSkipLevelYearlySubmission(
    selectedYear
  );

  useEffect(() => {
    if (!evaluations || evaluations.length === 0) return;

    setSkipReviews((prev) => {
      const next = { ...prev };
      let changed = false;
      evaluations.forEach((emp: any) => {
        const rowKey = emp.docname || emp.employee_code;
        if (!next[rowKey]) {
          const rating =
            emp.reviewer_role === "skip_level" ? emp.skip_level_manager_rating : emp.functional_manager_rating;
          const comment =
            emp.reviewer_role === "skip_level" ? emp.skip_level_manager_comment : emp.functional_manager_comment;
          next[rowKey] = { rating: rating || 0, comment: comment || "" };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [evaluations]);

  const { createGoalAssessment } = useGoalAssessment();
  const { submitGoalEvaluation } = useSubmitGoalEvaluation();

  const isCurrentYear = !!baseYear && selectedYear === baseYear;

  // Whether it's this reviewer's own turn to act on the row (their stage is
  // the one currently pending). Once submitted, the row stays visible but
  // moves to view-only for that reviewer.
  const isOwnTurn = (emp: any) =>
    emp.reviewer_role === "functional"
      ? emp.status === "Functional Manager Review"
      : emp.status === "Skip Level Manager Review";

  const handleSaveReview = async (docname: string, employeeCode: string) => {
    const review = getSkipReview(docname);

    setSavingDocname(docname);
    try {
      const result = await createGoalAssessment({
        employee_code: employeeCode,
        year: selectedYear,
        rating: review.rating,
        comment: review.comment.trim(),
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Review saved successfully!");
      refetch();
    } finally {
      setSavingDocname(null);
    }
  };

  const validateRow = (docname: string, review: SkipLevelReview) => {
    const rowErrors: { rating?: boolean; comment?: boolean } = {};
    if (!review.rating || review.rating <= 0) rowErrors.rating = true;
    if (!review.comment || !review.comment.trim()) rowErrors.comment = true;
    return rowErrors;
  };

  const handleSubmitReview = async (docname: string, employeeCode: string) => {
    const review = getSkipReview(docname);
    const rowErrors = validateRow(docname, review);

    if (rowErrors.rating || rowErrors.comment) {
      setValidationErrors((prev) => ({ ...prev, [docname]: rowErrors }));
      toast.error("Rating and comments are required before submitting.");
      return;
    }

    setSubmittingDocname(docname);
    try {
      const result = await submitGoalEvaluation(employeeCode, selectedYear, review.comment.trim(), review.rating);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Review submitted successfully!");
      setValidationErrors((prev) => {
        const rest = { ...prev };
        delete rest[docname];
        return rest;
      });
      refetch();
    } finally {
      setSubmittingDocname(null);
    }
  };

  const allSubmitted =
    !!evaluations && evaluations.length > 0 &&
    evaluations.every((emp: any) => !isOwnTurn(emp));

  const handleSubmitAll = async () => {
    if (!enableYearlyAppraisal || allSubmitted || !isCurrentYear) return;
    if (!evaluations || evaluations.length === 0) return;

    const errors: Record<string, { rating?: boolean; comment?: boolean }> = {};
    const missingEmployees: string[] = [];

    evaluations.forEach((emp: any) => {
      if (!isOwnTurn(emp)) return;
      const rowKey = emp.docname || emp.employee_code;
      const review = getSkipReview(rowKey);
      const rowErrors = validateRow(rowKey, review);

      if (rowErrors.rating || rowErrors.comment) {
        errors[rowKey] = rowErrors;
        missingEmployees.push(`${emp.employee_code} - ${emp.employee_name}`);
      }
    });

    setValidationErrors(errors);

    if (missingEmployees.length > 0) {
      toast.error("Rating and comments are required for all employees");
      return;
    }

    setIsSubmittingAll(true);
    try {
      let failedCount = 0;

      for (const emp of evaluations) {
        if (!isOwnTurn(emp)) continue;
        const rowKey = emp.docname || emp.employee_code;
        const review = getSkipReview(rowKey);

        const result = await submitGoalEvaluation(emp.employee_code, selectedYear, review.comment.trim(), review.rating);
        if (result?.error) {
          failedCount += 1;
        }
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} employee review(s) failed to submit. Please try again.`);
      } else {
        toast.success("All employee reviews submitted successfully!");
        setValidationErrors({});
      }

      refetch();
    } finally {
      setIsSubmittingAll(false);
    }
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

        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={isSubmittingAll || !enableYearlyAppraisal || allSubmitted || !isCurrentYear}
          className="bg-primary py-1 px-2 text-xs rounded-md text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmittingAll ? "Submitting..." : "Submit All"}
        </button>

      </div>
      <div className="border rounded-lg w-full mt-1">
        {/* Table */}
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[17%]" />
            <col className="w-[53%]" />
            <col className="w-[4%]" />
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
              <th className="py-3 px-4">Review</th>
              <th className="py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : (
              currentRows.map((emp: any) => {
                const rowKey = emp.docname || emp.employee_code;
                const skipReview = getSkipReview(rowKey);
                const isFunctionalReviewer = emp.reviewer_role === "functional";
                const isSkipLevelReviewer = emp.reviewer_role === "skip_level";
                const rowIsOwnTurn = isOwnTurn(emp);
                const isRowLocked = !enableYearlyAppraisal || !rowIsOwnTurn || !isCurrentYear;
                const managerAttachments = emp.attachments || [];
                const rowErrors = validationErrors[rowKey];
                const ownStageLabel = isFunctionalReviewer ? "Functional Manager Review" : "Skip Level Manager Review";
                // Functional review stage is auto-skipped when the functional manager is the
                // same person as the reporting manager (their review already happened as the
                // reporting manager) — no rating/comment ever gets recorded for that stage.
                const hasFunctionalReview =
                  !!(emp.functional_manager_comment && emp.functional_manager_comment.trim()) ||
                  (emp.functional_manager_rating || 0) > 0;

                return (
                  <tr key={rowKey} className="border-b text-xs align-top transition">
                    <td className="px-4 py-3 whitespace-nowrap" title={`${emp.employee_code} / ${emp.employee_name}`}>
                      {emp.employee_code} / {emp.employee_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" title={emp.designation_name || "-"}>
                      {emp.designation_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex w-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">

                        {/* ── View mode: Manager's submitted review ── */}
                        <div
                          className={`flex flex-col gap-1.5 rounded-t-xl px-3 py-2  bg-gray-100`}
                        >
                          {/* Status + Rating, single row */}
                          <div className="flex items-center justify-between gap-2">
                            <span className='text-gray-500'>Manager Review</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= (emp.rating || 0) ? "text-amber-400" : "text-gray-200"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[0.6rem] font-medium text-gray-500">
                                {emp.rating > 0 ? `${emp.rating}/5` : "0/5"}
                              </span>
                            </div>
                          </div>

                          {/* Checklist, inline pills */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {REVIEW_CHECKBOXES.map(({ key, label }) => {
                              const flagValue =
                                key === "eligibleForIncrement"
                                  ? emp.eligible_for_increment
                                  : key === "trainingRequirementsIdentified"
                                  ? emp.training_requirement_identified
                                  : emp.eligible_for_promotion;
                              return (
                                <span
                                  key={key}
                                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6rem] ${
                                    flagValue ? "bg-white text-gray-600" : "bg-gray-200 text-gray-500"
                                  }`}
                                >
                                  {flagValue ? (
                                    <IoCheckmarkCircle className="h-3 w-3 text-green-500 shrink-0" />
                                  ) : (
                                    <IoCloseCircle className="h-3 w-3 text-gray-500 shrink-0" />
                                  )}
                                  {label}
                                </span>
                              );
                            })}
                          </div>

                          {/* Comment, compact quote */}
                          <p className="whitespace-pre-wrap break-words text-[0.68rem] italic leading-snug text-gray-600">
                            {emp.comment ? `"${emp.comment}"` : "No comments added."}
                          </p>

                          {/* Attachments, inline chips */}
                          {managerAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {managerAttachments.map((file: any) => (
                                <a
                                  key={file.file_url}
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="max-w-[8rem] truncate rounded-full bg-white px-2 py-0.5 text-[0.6rem] text-primary hover:underline"
                                >
                                  {file.file_name}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Manager attribution */}
                          <div className="mt-0.5 flex items-center  gap-1.5 border-t border-white pt-1.5">
                            <span className="truncate text-[0.65rem] font-medium text-gray-700">
                              {emp.manager_name || "Manager"} Submitted
                              {emp.submitted_on && (
                                <span className="ml-1 font-normal text-gray-700">
                                  on {formatDateTime(emp.submitted_on)}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* ── Functional Manager Review (hidden when the stage was auto-skipped) ── */}
                        {isSkipLevelReviewer && hasFunctionalReview && (
                          <>
                            <hr className="border-gray-200" />
                            <StageReadOnlyBlock
                              label="Functional Manager Review"
                              rating={emp.functional_manager_rating}
                              comment={emp.functional_manager_comment}
                            />
                          </>
                        )}

                        {isFunctionalReviewer && !rowIsOwnTurn && hasFunctionalReview && (
                          <>
                            <hr className="border-gray-200" />
                            <StageReadOnlyBlock
                              label="Functional Manager Review"
                              rating={emp.functional_manager_rating}
                              comment={emp.functional_manager_comment}
                            />
                          </>
                        )}

                        {/* ── Skip Level Manager Review (read-only, once submitted) ── */}
                        {isSkipLevelReviewer && !rowIsOwnTurn && (
                          <>
                            <hr className="border-gray-200" />
                            <StageReadOnlyBlock
                              label="Skip Level Manager Review"
                              rating={emp.skip_level_manager_rating}
                              comment={emp.skip_level_manager_comment}
                            />
                          </>
                        )}

                        {/* ── Editable: this reviewer's own pending review ── */}
                        {rowIsOwnTurn && (
                          <>
                            <hr className="border-gray-200" />
                            <div className="flex flex-col gap-2.5 px-3 py-2.5">
                              <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">
                                {ownStageLabel} (Your Review)
                              </span>

                              {/* Rating */}
                              <div
                                className={`flex flex-col gap-1 ${rowErrors?.rating ? "bg-red-50" : ""}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[0.65rem] text-gray-600">Rating</span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setSkipRating(rowKey, star)}
                                        disabled={isRowLocked}
                                        className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                      >
                                        <FaStar
                                          className={`h-3.5 w-3.5 transition-colors ${
                                            star <= skipReview.rating ? "text-amber-400" : "text-gray-200"
                                          }`}
                                        />
                                      </button>
                                    ))}
                                    <span className="p-1 min-w-[1.5rem] text-[0.65rem] bg-primary/30 font-medium text-primary rounded-full">
                                      {skipReview.rating > 0 ? `${skipReview.rating}/5` : "0/5"}
                                    </span>
                                  </div>
                                </div>
                                {rowErrors?.rating && (
                                  <span className="text-[0.6rem] font-medium text-red-500">
                                    Rating is required
                                  </span>
                                )}
                              </div>

                              {/* Comment */}
                              <div
                                className={`flex w-full flex-col gap-1.5 rounded-lg border p-2 ${
                                  rowErrors?.comment
                                    ? "border-red-300 bg-red-50 focus-within:border-red-400"
                                    : "border-gray-200 bg-white focus-within:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[0.6rem] font-medium text-gray-400">Comments</span>
                                  <span className="text-[0.6rem] font-medium text-gray-300">
                                    {skipReview.comment.length}/{MAX_COMMENT_LENGTH}
                                  </span>
                                </div>
                                <textarea
                                  value={skipReview.comment}
                                  maxLength={MAX_COMMENT_LENGTH}
                                  onChange={(e) => setSkipComment(rowKey, e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                                  placeholder="Add comments or feedback"
                                  rows={4}
                                  disabled={isRowLocked}
                                  className="w-full resize-none rounded-md border-0 bg-transparent p-0 text-[0.68rem] leading-relaxed text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                {rowErrors?.comment && (
                                  <span className="text-[0.6rem] font-medium text-red-500">
                                    Comment is required
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="flex gap-1 items-center px-1 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSaveReview(rowKey, emp.employee_code)}
                        disabled={isRowLocked || savingDocname === rowKey || submittingDocname === rowKey}
                        className="inline-flex items-center justify-center rounded-md  text-gray-500 transition hover:bg-secondary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Save review"
                      >
                        <FaRegSave className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitReview(rowKey, emp.employee_code)}
                        disabled={isRowLocked || savingDocname === rowKey || submittingDocname === rowKey}
                        className="inline-flex items-center justify-center rounded-md text-gray-500 transition hover:bg-secondary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Submit review"
                      >
                        <TiTickOutline className="h-5 w-5" />
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

export default FunctionalOrSkiplevelYearlysubmission
