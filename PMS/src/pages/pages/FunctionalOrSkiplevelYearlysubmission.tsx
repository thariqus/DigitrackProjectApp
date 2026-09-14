import { useState, useEffect } from 'react'
import { useYearlySubmission } from "../../hooks/goalevaluation";
import { HiArrowNarrowDown } from 'react-icons/hi';
import { FaRegSave, FaStar } from 'react-icons/fa';
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

const REVIEW_CHECKBOXES: { key: ReviewFlagKey; label: string; icon: typeof IoTrendingUpOutline }[] = [
  { key: "eligibleForIncrement", label: "Eligible for Increment", icon: IoTrendingUpOutline },
  { key: "trainingRequirementsIdentified", label: "Training Required", icon: IoSchoolOutline },
  { key: "eligibleForPromotion", label: "Eligible for Promotion", icon: IoRibbonOutline },
];

function FunctionalOrSkiplevelYearlysubmission() {

  const [selectedYear, setSelectedYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<"id" | "designation" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [skipReviews, setSkipReviews] = useState<Record<string, SkipLevelReview>>({});

  const getSkipReview = (docname: string) => skipReviews[docname] || emptySkipLevelReview;

  const setSkipRating = (docname: string, rating: number) => {
    const current = getSkipReview(docname);
    setSkipReviews((prev) => ({
      ...prev,
      [docname]: { ...current, rating: current.rating === rating ? 0 : rating },
    }));
  };

  const setSkipComment = (docname: string, comment: string) => {
    setSkipReviews((prev) => ({
      ...prev,
      [docname]: { ...getSkipReview(docname), comment },
    }));
  };

  const { evaluations, loading, baseYear, years, enableYearlyAppraisal } = useYearlySubmission(
    selectedYear
  );

  const allSubmitted =
    !!evaluations && evaluations.length > 0 &&
    evaluations.every((emp: any) => emp.status === "Evaluation Submitted");

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
          disabled={!enableYearlyAppraisal || allSubmitted}
          className="bg-primary py-1 px-2 text-xs rounded-md text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>

      </div>
      <div className="border rounded-lg w-full mt-1">
        {/* Table */}
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[17%]" />
            <col className="w-[58%]" />
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
                const isManagerSubmitted = emp.status === "Evaluation Submitted";
                const isRowLocked = !enableYearlyAppraisal;
                const managerAttachments = emp.attachments || [];

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
                          className={`flex flex-col gap-1.5 rounded-t-xl px-3 py-2  bg-green-50/60`}
                        >
                          {/* Status + Rating, single row */}
                          <div className="flex items-center justify-between gap-2">
                            {/* <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                                isManagerSubmitted
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isManagerSubmitted && <IoCheckmarkCircle className="h-3 w-3" />}
                              {isManagerSubmitted ? "Manager Submitted" : "Manager Review Pending"}
                            </span> */}
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
                                    flagValue ? "bg-white text-gray-600" : "bg-white/60 text-gray-300"
                                  }`}
                                >
                                  {flagValue ? (
                                    <IoCheckmarkCircle className="h-3 w-3 text-green-500 shrink-0" />
                                  ) : (
                                    <IoCloseCircle className="h-3 w-3 text-gray-300 shrink-0" />
                                  )}
                                  {label}
                                </span>
                              );
                            })}
                          </div>

                          {/* Comment, compact quote */}
                          <p className="line-clamp-2 text-[0.68rem] italic leading-snug text-gray-600">
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
                          {isManagerSubmitted && (
                            <div className="mt-0.5 flex items-center gap-1.5 border-t border-white pt-1.5">
                              {/* <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.55rem] font-bold text-primary">
                                {getInitials(emp.manager_name)}
                              </span> */}
                              <span className="truncate text-[0.65rem] font-medium text-gray-700">
                                {emp.manager_name || "Manager"} Submitted
                              </span>
                             
                            </div>
                          )}
                        </div>

                        {/* ── Separator ── */}
                        <hr className="border-gray-200" />

                        {/* ── Editable: Skip / Functional level manager review ── */}
                        <div className="flex flex-col gap-2.5 px-3 py-2.5">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">
                            Your Review
                          </span>

                          {/* Rating */}
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

                          {/* Comment */}
                          <div className="flex w-full flex-col gap-1.5 rounded-lg border border-gray-200 bg-white p-2 focus-within:border-primary/50">
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
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        disabled={isRowLocked}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-secondary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Save review"
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

export default FunctionalOrSkiplevelYearlysubmission
