import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Mail, Trash2, XIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { JHTasksMaster } from "@/types/JHDigitrack/JHTasksMaster";
import { useDoc, useDocDetail } from "@/hooks/doc";
import { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useCurrentJhUser } from "@/hooks/auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import StatusBadge from "../ui/StatusBadge";
import TaskTimeline from "../ui/TaskTimeline";
import { Badge } from "@/components/ui/badge";

const getDateDistance = (date: string) => {
  const dueDate = new Date(date);
  const today = new Date();
  const difference = dueDate.getTime() - today.getTime();
  const differenceInDays = Math.ceil(difference / (1000 * 60 * 60 * 24));
  return differenceInDays > 0
    ? `(in ${differenceInDays} days)`
    : differenceInDays === 0
    ? "(today)"
    : `(${Math.abs(differenceInDays)} days ago)`;
};

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskDetailSheet({
  open,
  onOpenChange,
  taskId,
  onEdit,
  onDelete,
}: TaskDetailSheetProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: currentJhUser } = useCurrentJhUser();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionOverflowing, setIsDescriptionOverflowing] =
    useState(false);

  const { data: taskDetailed, isLoading: isLoadingTaskInfo } =
    useDocDetail<JHTasksMaster>({
      doctype: "JH Tasks Master",
      name: taskId || "",
      disabled: !taskId,
    });

  const task = taskDetailed?.docs[0];

  // const { data: taskAfter, isLoading: isLoadingTaskAfter } =
  //   useDoc<JHTasksMaster>({
  //     doctype: "JH Tasks Master",
  //     name: task?.start_after || "",
  //     disabled: !task?.start_after,
  //   });

  const { data: business, isLoading: isLoadingBusiness } =
    useDoc<JHBusinessMaster>({
      doctype: "JH Business Master",
      name: task?.business_id || "",
      disabled: !task?.business_id,
    });

  const { data: assignedTo, isLoading: isLoadingAssignedTo } =
    useDoc<JHUserMaster>({
      doctype: "JH User Master",
      name: task?.assigned_to || "",
      disabled: !task?.assigned_to,
    });

  const { data: createdBy, isLoading: isLoadingCreatedBy } =
    useDoc<JHUserMaster>({
      doctype: "JH User Master",
      name: task?.created_by || "",
      disabled: !task?.created_by,
    });

  // Add this effect to check if description is overflowing
  useEffect(() => {
    if (descriptionRef.current) {
      const isOverflowing = descriptionRef.current.scrollHeight > 200; // 200px height limit
      setIsDescriptionOverflowing(isOverflowing);
    }
  }, [task?.description]);

  const handleEdit = () => {
    if (taskId && onEdit) onEdit(taskId);
  };

  const handleDelete = () => {
    if (taskId && onDelete) onDelete(taskId);
  };

  // get attachments and attachment logs from task detailed
  const attachments = taskDetailed?.docinfo?.attachments || [];
  const attachmentLogs = taskDetailed?.docinfo?.attachment_logs || [];

  // get attachment owner from attachment logs by matching file name with content :check docInfo api response
  const getAttachmentOwner = (fileName: string) => {
    const log = attachmentLogs.find((log) => log.content.includes(fileName));
    return log?.owner;
  };

  const renderAttachment = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachment: any,
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
    (attachment) => getAttachmentOwner(attachment.file_name) === task?.owner
  );

  const assigneeAttachments = attachments.filter(
    (attachment) => getAttachmentOwner(attachment.file_name) !== task?.owner
  );

  const isLoading =
    isLoadingTaskInfo ||
    isLoadingBusiness ||
    isLoadingAssignedTo ||
    isLoadingCreatedBy;

  const showDeleteButton =
    task?.owner === currentUser && task?.creation === task?.modified;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header with status and actions */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <StatusBadge status={task?.status} />
            </div>
            <div className="flex items-center gap-2 mr-5">
              {task?.assigned_to !== currentJhUser?.name && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Mail className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => console.log("remind")}
                      >
                        Remind
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => console.log("escalate")}
                      >
                        Escalate
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button variant="ghost" size="icon" onClick={handleEdit}>
                <Edit className="w-5 h-5" />
              </Button>
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

          {/* Task content */}
          <div className="p-6 space-y-6">
            {/* Task ID and Title */}
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-8 w-64" />
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {task?.name}

                    {task?.private === 1 && (
                      <Badge className="text-xs" variant="outline">
                        Private
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mt-1">{task?.task_name}</h2>
                </>
              )}
            </div>

            {/* Task details grid */}
            <div className="grid grid-cols-[140px_1fr] gap-y-6">
              {/* <div className="text-sm text-gray-500">Serial number</div>
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <div>{task?.serial_number || "—"}</div>
              )}

              <div className="text-sm text-gray-500">Start after</div>
              {isLoadingTaskAfter ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <div className="flex items-center">
                  <span className="font-medium">
                    {task?.start_after || "—"}
                  </span>
                  <span className="ml-1 truncate">
                    {taskAfter?.task_name || ""}
                  </span>
                </div>
              )} */}

              <div className="text-sm text-gray-500">Business</div>
              {isLoadingBusiness ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <div className="flex items-center">
                  <span>{business?.business_name || "—"}</span>
                </div>
              )}

              <div className="text-sm text-gray-500">Created by</div>
              <div className="flex items-center gap-2">
                <span>{createdBy?.full_name ?? task?.created_by}</span>
              </div>

              <div className="text-sm text-gray-500">Assigned to</div>
              {isLoadingAssignedTo ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{assignedTo?.full_name}</span>
                </div>
              )}

              <div className="text-sm text-gray-500">Due Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>
                  {task?.due_date
                    ? format(new Date(task?.due_date), "dd MMM yyyy")
                    : "—"}
                </span>
                <span className="text-sm text-gray-500">
                  {task?.due_date && getDateDistance(task?.due_date)}
                </span>
              </div>

              <div className="text-sm text-gray-500">Revised Due Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {task?.revised_due_date
                    ? format(new Date(task?.revised_due_date), "dd MMM yyyy")
                    : "—"}
                </span>
                <span className="text-sm text-gray-500">
                  {task?.revised_due_date &&
                    getDateDistance(task?.revised_due_date)}
                </span>
              </div>

              <div className="text-sm text-gray-500">Completion Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {task?.completion_date
                    ? format(new Date(task?.completion_date), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>

              <div className="text-sm text-gray-500">Effort</div>
              <div>{task?.effort ? `${task?.effort} hrs` : "—"}</div>

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
                    className={`bg-gray-50 p-4 rounded-md ${
                      !showFullDescription
                        ? "max-h-[200px] overflow-hidden"
                        : ""
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: task?.description || "",
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
            <TaskTimeline taskId={taskId!} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
