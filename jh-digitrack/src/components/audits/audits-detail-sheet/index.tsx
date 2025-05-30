import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, XIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useDoc, useDocDetail } from "@/hooks/doc";
import { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/auth";
import { format } from "date-fns";
import StatusBadge from "../ui/StatusBadge";
// import AuditTimeline from "../ui/AuditTimeline";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import { JHDivisionMaster } from "@/types/JHDigitrack/JHDivisionMaster";

function renderHyperlink(text: string | undefined) {
  if (!text) return "-";
  const isUrl = text.match(/^https?:\/\/[^\s]+$/);
  if (isUrl) {
    return `<a href="${text}" target="_blank" class="underline">${text}</a>`;
  }
  return text;
}

interface AuditDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId?: string;
  onDelete?: (auditId: string) => void;
}

interface Attachment {
  file_name: string;
  file_url: string;
}

export function AuditDetailSheet({
  open,
  onOpenChange,
  auditId,
  onDelete,
}: AuditDetailSheetProps) {
  console.log(auditId);
  const { data: currentUser } = useCurrentUser();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionOverflowing, setIsDescriptionOverflowing] =
    useState(false);

  const { data: auditDetails, isLoading: isLoadingAuditInfo } =
    useDocDetail<JHAudits>({
      doctype: "JH Audit Master",
      name: auditId || "",
      disabled: !auditId,
    });

  const audit = auditDetails?.docs[0];

  const { data: business, isLoading: isLoadingBusiness } =
    useDoc<JHBusinessMaster>({
      doctype: "JH Business Master",
      name: audit?.business || "",
      disabled: !audit?.business,
    });

  const { data: division, isLoading: isLoadingDivision } =
    useDoc<JHDivisionMaster>({
      doctype: "JH Division Master",
      name: audit?.division || "",
      disabled: !audit?.division,
    });

  const { data: createdBy, isLoading: isLoadingCreatedBy } =
    useDoc<JHUserMaster>({
      doctype: "JH User Master",
      name: audit?.created_by || "",
      disabled: !audit?.created_by,
    });

  // Add this effect to check if description is overflowing
  useEffect(() => {
    if (audit?.audit_description) {
      const isOverflowing = audit?.audit_description.length > 350;
      setIsDescriptionOverflowing(isOverflowing);
    }
  }, [audit?.audit_description]);

  // const handleEdit = () => {
  //   if (auditId && onEdit) onEdit(auditId);
  // };

  const handleDelete = () => {
    if (auditId && onDelete) onDelete(auditId);
  };

  // get attachments and attachment logs from audit detailed
  const attachments = auditDetails?.docinfo?.attachments || [];
  const attachmentLogs = auditDetails?.docinfo?.attachment_logs || [];

  // get attachment owner from attachment logs by matching file name with content :check docInfo api response
  const getAttachmentOwner = (fileName: string) => {
    const log = attachmentLogs.find((log) => log.content.includes(fileName));
    return log?.owner;
  };

  const renderAttachment = (
    attachment: Attachment,
    index: number,
    keyPrefix: string
  ) => (
    <div key={`${keyPrefix}-${index}`} className="flex flex-col items-center">
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
      >
        <div
          className={`w-full aspect-square rounded-md flex items-center justify-center ${
            attachment.file_name.match(/\.(jpg|jpeg|png)$/i)
              ? "bg-gray-200"
              : "bg-gray-100"
          }`}
        >
          <span className="text-xl">
            {attachment.file_name.match(/\.(jpg|jpeg|png)$/i) ? (
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                className="w-full h-full object-cover"
              />
            ) : attachment.file_name.match(/\.pdf$/i) ? (
              "PDF"
            ) : (
              "📄"
            )}
          </span>
        </div>
        <span className="text-xs text-center mt-1 truncate w-full block overflow-hidden">
          {attachment.file_name}
        </span>
      </a>
    </div>
  );

  // filter attachments by owner
  const creatorAttachments = attachments.filter(
    (attachment) => getAttachmentOwner(attachment.file_name) === audit?.owner
  );

  const assigneeAttachments = attachments.filter(
    (attachment) => getAttachmentOwner(attachment.file_name) !== audit?.owner
  );

  const isLoading =
    isLoadingAuditInfo || isLoadingBusiness || isLoadingCreatedBy;

  const showDeleteButton =
    audit?.owner === currentUser && audit?.creation === audit?.modified;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header with status and actions */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <StatusBadge status={audit?.status} />
            </div>
            <div className="flex items-center gap-2 mr-5">
              {/* <Button variant="ghost" size="icon" onClick={handleEdit}>
                <Edit className="w-5 h-5" />
              </Button> */}
              {showDeleteButton && (
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              )}
              <SheetClose>
                <Button variant="ghost" size="icon">
                  <XIcon className="size-4" />
                </Button>
              </SheetClose>
            </div>
          </div>

          {/* Audit content */}
          <div className="p-6 space-y-6">
            {/* Audit ID and Title */}
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-8 w-64" />
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {audit?.name}
                  </div>
                  <h2 className="text-2xl font-bold mt-1">
                    {audit?.audit_name}
                  </h2>
                </>
              )}
            </div>

            {/* Audit details grid */}
            <div className="grid grid-cols-[140px_1fr] gap-y-6">
              <div className="text-sm text-gray-500">Business</div>
              {isLoadingBusiness ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <div className="flex items-center">
                  <span>{business?.business_name || "—"}</span>
                </div>
              )}
              <div className="text-sm text-gray-500">Division</div>
              {isLoadingDivision ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <div className="flex items-center">
                  <span>{division?.division_name || "—"}</span>
                </div>
              )}
              <div className="text-sm text-gray-500">Folder Name</div>
              <div className="flex items-center">
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderHyperlink(audit?.folder_name),
                  }}
                />
              </div>
              <div className="text-sm text-gray-500">File Name</div>
              <div className="flex items-center">
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderHyperlink(audit?.file_name),
                  }}
                />
              </div>
              <div className="text-sm text-gray-500">Created by</div>
              <div className="flex items-center gap-2">
                <span>{createdBy?.full_name ?? audit?.created_by}</span>
              </div>
              <div className="text-sm text-gray-500">Start Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>
                  {audit?.start_date
                    ? format(new Date(audit?.start_date), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="text-sm text-gray-500">Completion Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {audit?.completion_date
                    ? format(new Date(audit?.completion_date), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="text-sm text-gray-500">Description</div>
              <div>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                ) : (
                  <div
                    ref={descriptionRef}
                    className={`bg-gray-50 p-1 rounded-md max-w-lg overflow-x-auto ${
                      !showFullDescription ? "line-clamp-4" : ""
                    }`}
                    dangerouslySetInnerHTML={{
                      __html:
                        audit?.audit_description?.replace(/\n+/g, "<br />") ||
                        "",
                    }}
                  />
                )}
                {isDescriptionOverflowing && (
                  <Button
                    variant="ghost"
                    className="text-gray-500 mt-2 h-auto p-0 text-sm"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? "Show less" : "See full description"}
                  </Button>
                )}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="text-sm text-gray-500 mb-2">Attachments</div>

              {isLoading ? (
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="w-full aspect-square" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {creatorAttachments.length > 0 && (
                    <div>
                      <div className="text-sm mb-2">Creator Attachments</div>
                      <div className="grid grid-cols-5 gap-2">
                        {creatorAttachments.map((attachment, index) =>
                          renderAttachment(attachment, index, "creator")
                        )}
                      </div>
                    </div>
                  )}
                  {assigneeAttachments.length > 0 && (
                    <div>
                      <div className="text-sm mb-2">Assignee Attachments</div>
                      <div className="grid grid-cols-5 gap-2">
                        {assigneeAttachments.map((attachment, index) =>
                          renderAttachment(attachment, index, "assignee")
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* <AuditTimeline auditId={auditId!} /> */}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
