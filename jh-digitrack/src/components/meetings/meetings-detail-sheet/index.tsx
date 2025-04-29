import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, XIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useDoc, useDocDetail, useDocs } from "@/hooks/doc";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/auth";
import { format } from "date-fns";
import StatusBadge from "../ui/StatusBadge";
import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";

interface MeetingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId?: string;
  onDelete?: (meetingId: string) => void;
}

interface Attachment {
  file_name: string;
  file_url: string;
}

export function MeetingDetailSheet({
  open,
  onOpenChange,
  meetingId,
  onDelete,
}: MeetingDetailSheetProps) {
  console.log(meetingId);
  const { data: currentUser } = useCurrentUser();
  const [showFullAgenda, setShowFullAgenda] = useState(false);
  const agendaRef = useRef<HTMLDivElement>(null);
  const [isAgendaOverflowing, setIsAgendaOverflowing] = useState(false);

  const [showFullRemarks, setShowFullRemarks] = useState(false);
  const remarksRef = useRef<HTMLDivElement>(null);
  const [isRemarksOverflowing, setIsRemarksOverflowing] = useState(false);

  const { data: meetingDetails, isLoading: isLoadingMeetingInfo } =
    useDocDetail<JHGroupedTaskMaster>({
      doctype: "JH Grouped Task Master",
      name: meetingId || "",
      disabled: !meetingId,
    });

  const meeting = meetingDetails?.docs[0];

  const { data: organizer, isLoading: isLoadingOrganizer } =
    useDoc<JHUserMaster>({
      doctype: "JH User Master",
      name: meeting?.organizer || "",
      disabled: !meeting?.organizer,
    });

  const {
    data: internalParticipants,
    isLoading: isLoadingInternalParticipants,
  } = useDocs<JHUserMaster>({
    doctype: "JH User Master",
    fields: ["full_name"],
    filters: [
      [
        "name",
        "in",
        meeting?.internal_participants?.map(
          (participant) => participant.user
        ) ?? [],
      ],
    ],
    limit: 100,
  });

  // Add this effect to check if description is overflowing
  useEffect(() => {
    if (meeting?.agenda) {
      const isOverflowing = meeting?.agenda.length > 350;
      setIsAgendaOverflowing(isOverflowing);
    }
  }, [meeting?.agenda]);

  useEffect(() => {
    if (meeting?.remarks) {
      const isOverflowing = meeting?.remarks.length > 350;
      setIsRemarksOverflowing(isOverflowing);
    }
  }, [meeting?.remarks]);

  // const handleEdit = () => {
  //   if (meetingId && onEdit) onEdit(meetingId);
  // };

  const handleDelete = () => {
    if (meetingId && onDelete) onDelete(meetingId);
  };

  // get attachments and attachment logs from meeting detailed
  const attachments = meetingDetails?.docinfo?.attachments || [];
  const attachmentLogs = meetingDetails?.docinfo?.attachment_logs || [];

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
    (attachment) => getAttachmentOwner(attachment.file_name) === meeting?.owner
  );

  const assigneeAttachments = attachments.filter(
    (attachment) => getAttachmentOwner(attachment.file_name) !== meeting?.owner
  );

  const isLoading =
    isLoadingMeetingInfo || isLoadingOrganizer || isLoadingInternalParticipants;

  const showDeleteButton =
    meeting?.owner === currentUser && meeting?.creation === meeting?.modified;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header with status and actions */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <StatusBadge status={meeting?.status} />
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

          {/* Meeting content */}
          <div className="p-6 space-y-6">
            {/* Meeting ID and Title */}
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-8 w-64" />
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {meeting?.name}
                  </div>
                  <h2 className="text-2xl font-bold mt-1">{meeting?.title}</h2>
                </>
              )}
            </div>

            {/* Meeting details grid */}
            <div className="grid grid-cols-[140px_1fr] gap-y-6">
              <div className="text-sm text-gray-500">Organizer</div>
              <div className="flex items-center gap-2">
                <span>{organizer?.full_name ?? meeting?.organizer}</span>
              </div>
              <div className="text-sm text-gray-500">Internal Participants</div>
              <div className="flex items-center gap-2">
                <span>
                  {internalParticipants
                    ?.map((participant) => participant.full_name)
                    .join(", ")}
                </span>
              </div>
              <div className="text-sm text-gray-500">External Participants</div>
              <div className="flex items-center gap-2">
                <span>{meeting?.participants_external}</span>
              </div>
              <div className="text-sm text-gray-500">Meeting Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>
                  {meeting?.meeting_date
                    ? format(new Date(meeting?.meeting_date), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="text-sm text-gray-500">Location/Meeting Room</div>
              <div className="flex items-center gap-2">
                <span>{meeting?.location}</span>
              </div>
              <div className="text-sm text-gray-500">Duration</div>
              <div className="flex items-center gap-2">
                <span>{meeting?.duration} mins</span>
              </div>
              <div className="text-sm text-gray-500">Completion Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>
                  {meeting?.completion_date
                    ? format(new Date(meeting?.completion_date), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="text-sm text-gray-500">Agenda</div>
              <div>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                ) : (
                  <div
                    ref={agendaRef}
                    className={`bg-gray-50 p-4 rounded-md w-100 break-words  ${
                      !showFullAgenda ? "max-h-[200px] overflow-hidden" : ""
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: meeting?.agenda?.replace(/\n+/g, "<br />") || "",
                    }}
                  />
                )}
                {isAgendaOverflowing && (
                  <Button
                    variant="ghost"
                    className="text-gray-500 mt-2 h-auto p-0 text-sm"
                    onClick={() => setShowFullAgenda(!showFullAgenda)}
                  >
                    {showFullAgenda ? "Show less" : "See full agenda"}
                  </Button>
                )}
              </div>
              <div className="text-sm text-gray-500">Remarks/Decisions</div>
              <div>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                ) : (
                  <div
                    ref={remarksRef}
                    className={`bg-gray-50 p-4 rounded-md w-100 break-words  ${
                      !showFullRemarks ? "max-h-[200px] overflow-hidden" : ""
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: meeting?.remarks?.replace(/\n+/g, "<br />") || "",
                    }}
                  />
                )}
                {isRemarksOverflowing && (
                  <Button
                    variant="ghost"
                    className="text-gray-500 mt-2 h-auto p-0 text-sm"
                    onClick={() => setShowFullRemarks(!showFullRemarks)}
                  >
                    {showFullRemarks ? "Show less" : "See full remarks"}
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
