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

export interface StageReviewData {
  rating?: number;
  comment?: string;
  submittedByName?: string;
  submittedOn?: string;
}

export interface ManagerStageReviewData extends StageReviewData {
  checklist?: ManagerReviewChecklistItem[];
  attachments?: ManagerReviewAttachment[];
}

// Read-only review summary rendered as a table: one row per review stage
// (reporting manager, functional manager, skip-level manager) with the stage
// heading, star rating + "checked by", and comment each in their own column.
// The manager's checklist and attachments always render as their own rows at
// the bottom, after every submitted stage row — so once a functional or
// skip-level review is added, those detail rows move below it instead of
// staying pinned under the manager row.
export function StageReviewCard({
  manager,
  functional,
  skipLevel,
}: {
  manager: ManagerStageReviewData;
  functional?: StageReviewData;
  skipLevel?: StageReviewData;
}) {
  const rows: { stage: ReviewStage; data: StageReviewData }[] = [
    { stage: "manager", data: manager },
  ];
  if (functional) rows.push({ stage: "functional", data: functional });
  if (skipLevel) rows.push({ stage: "skip_level", data: skipLevel });

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {rows.map(({ stage, data }, idx) => {
        const config = STAGE_CONFIG[stage];
        const Icon = config.icon;
        return (
          <div
            key={stage}
            className={`grid grid-cols-[11rem_6rem_1fr] items-start gap-3 border-l-4 ${config.border} ${
              idx > 0 ? "border-t border-gray-100" : ""
            } px-3 py-2`}
          >
            {/* Column 1: stage heading */}
            <span
              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold ${config.badgeBg} ${config.badgeText}`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {config.label}
            </span>

            {/* Column 2: stars + checked by */}
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`h-3 w-3 ${star <= (data.rating || 0) ? "text-amber-400" : "text-gray-200"}`}
                  />
                ))}
                <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[0.6rem] font-medium text-gray-500">
                  {data.rating && data.rating > 0 ? `${data.rating}/5` : "0/5"}
                </span>
              </div>
              
            </div>

            {/* Column 3: comment */}
            <p className="min-w-0 whitespace-pre-wrap break-words text-[0.68rem] italic leading-snug text-gray-600">
              {data.comment ? `"${data.comment}"` : "No comments added."}
            </p>
          </div>
        );
      })}

      {/* Checklist row — manager's, always last */}
      {manager.checklist && manager.checklist.length > 0 && (
        <div className="grid grid-cols-1 items-center gap-3 border-t border-gray-100  px-3 py-2">
          {/* <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">Checklist</span> */}
          <div className="flex flex-wrap items-center gap-1.5">
            {manager.checklist.map(({ key, label, value }) => (
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
        </div>
      )}

      {/* Attachments row — manager's, always last */}
      {manager.attachments && manager.attachments.length > 0 && (
        <div className="grid grid-cols-1 items-center gap-3  px-3 py-2">
          {/* <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-gray-400">Attachments</span> */}
          <div className="flex flex-wrap gap-1.5">
            {manager.attachments.map((file) => (
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
        </div>
      )}
    </div>
  );
}
