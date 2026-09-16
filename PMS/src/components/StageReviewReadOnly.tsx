import { FaStar } from 'react-icons/fa';
import { IoCheckmarkCircle, IoCloseCircle, IoPersonOutline, IoBriefcaseOutline, IoArrowUpCircleOutline } from 'react-icons/io5';

export const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const datePart = date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const timePart = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
};

export const getInitials = (name?: string) => {
  if (!name) return "M";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "M";
};

export interface ManagerReviewChecklistItem {
  key: string;
  label: string;
  value: boolean;
}

export interface ManagerReviewAttachment {
  file_url: string;
  file_name: string;
}

export type ReviewStage = "manager" | "functional" | "skip_level";

const STAGE_CONFIG: Record<
  ReviewStage,
  { label: string; icon: typeof IoPersonOutline; border: string; badgeBg: string; badgeText: string; avatarBg: string; avatarText: string }
> = {
  manager: {
    label: "Manager Review",
    icon: IoPersonOutline,
    border: "border-l-secondary",
    badgeBg: "bg-primary/10",
    badgeText: "text-primary",
    avatarBg: "bg-primary/15",
    avatarText: "text-primary",
  },
  functional: {
    label: "Functional Manager Review",
    icon: IoBriefcaseOutline,
    border: "border-l-indigo-400",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-600",
    avatarBg: "bg-indigo-100",
    avatarText: "text-indigo-600",
  },
  skip_level: {
    label: "Skip Level Manager Review",
    icon: IoArrowUpCircleOutline,
    border: "border-l-amber-400",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-600",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-600",
  },
};

// Read-only summary card for one review stage (reporting manager, functional
// manager, or skip-level manager) once it has been submitted. Each stage gets
// its own color-coded, bordered card so the three stages stay visually
// distinct instead of blending into one continuous block.
export function StageReviewCard({
  stage,
  rating,
  checklist,
  comment,
  attachments,
  submittedByName,
  submittedOn,
}: {
  stage: ReviewStage;
  rating?: number;
  checklist?: ManagerReviewChecklistItem[];
  comment?: string;
  attachments?: ManagerReviewAttachment[];
  submittedByName?: string;
  submittedOn?: string;
}) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-gray-200 border-l-4  bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md`}
    >
      {/* Stage badge + rating */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold ${config.badgeBg} ${config.badgeText}`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {config.label}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={`h-3 w-3 ${star <= (rating || 0) ? "text-amber-400" : "text-gray-200"}`}
            />
          ))}
          <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[0.6rem] font-medium text-gray-500">
            {rating && rating > 0 ? `${rating}/5` : "0/5"}
          </span>
        </div>
      </div>

      {/* Checklist, inline pills */}
      {checklist && checklist.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {checklist.map(({ key, label, value }) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6rem] ${
                value ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-400"
              }`}
            >
              {value ? (
                <IoCheckmarkCircle className="h-3 w-3 text-green-500 shrink-0" />
              ) : (
                <IoCloseCircle className="h-3 w-3 text-gray-400 shrink-0" />
              )}
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Comment, compact quote */}
      <p className="whitespace-pre-wrap break-words rounded-md bg-gray-50 px-2 py-1.5 text-[0.68rem] italic leading-snug text-gray-600">
        {comment ? `"${comment}"` : "No comments added."}
      </p>

      {/* Attachments, inline chips */}
      {attachments && attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((file) => (
            <a
              key={file.file_url}
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[8rem] truncate rounded-full bg-gray-100 px-2 py-0.5 text-[0.6rem] text-primary hover:underline"
            >
              {file.file_name}
            </a>
          ))}
        </div>
      )}

      {/* Attribution */}
      <div className="flex items-center gap-1.5 border-t border-gray-100 pt-1.5">
        {/* <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5rem] font-semibold ${config.avatarBg} ${config.avatarText}`}
        >
          {getInitials(submittedByName)}
        </span> */}
        <span className="truncate text-[0.62rem] font-medium text-gray-700">
          <span className="">{submittedByName || "Manager"}</span>
          {submittedOn ? <> submitted on <span className="">{formatDateTime(submittedOn)}</span></> : " submitted"}
        </span>
      </div>
    </div>
  );
}
