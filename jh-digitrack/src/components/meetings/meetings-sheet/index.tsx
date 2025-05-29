import { useEffect, useState, useCallback, useMemo } from "react";

import { format } from "date-fns";
import { AlertCircle, XIcon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./quill.css";
import { Combobox } from "@/components/ui/combobox";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSaveDoc, useDocDetail, useUpdateDoc, useDocs } from "@/hooks/doc";
import { useFilesUpload, useFileRemove } from "@/hooks/file";
import { toast } from "sonner";
import { useCurrentJhUser, useCurrentUser } from "@/hooks/auth";
import type { Attachment } from "@/types/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { MeetingStatusSelector } from "../ui/MeetingStatusSelector";
import { queryClient } from "@/utils/query-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChangelogRemarkDialog from "./ChangeLogRemarkDialog";
import FileAttachmentHandler from "./FileAttachmentHandler";
import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectCombobox } from "@/components/ui/multi-select";
import { useAddMeetingRemark } from "@/hooks/meetings";
import { cn } from "@/lib/utils";
// ==========================================
// COMPONENT PROPS INTERFACE
// ==========================================
interface MeetingSheetProps {
  open: boolean;
  meetingId?: string;
  onOpenChange: (open: boolean) => void;
  refetch?: () => Promise<unknown>;
}

export function MeetingSheet({
  open,
  meetingId,
  onOpenChange,
  refetch,
}: MeetingSheetProps) {
  const isEdit = Boolean(meetingId);

  // ==========================================
  // FORM VALIDATION SCHEMA
  // ==========================================
  /**
   * meeting form validation schema
   * Validates all form inputs before submission
   */
  const meetingSchema = z
    .object({
      title: z
        .string()
        .min(1, "Meeting title is required")
        .max(140, "Meeting title cannot be longer than 140 characters"),
      type: z.string().optional(),
      organizer: z.string(),
      meeting_date: z.string().min(1, "Meeting Date is required"),
      duration: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val) return true;
            const num = Number.parseFloat(val);
            if (val && !/^\d*\.?\d*$/.test(val)) {
              return false;
            }
            return !isNaN(num) && num >= 0;
          },
          {
            message: "Duration must be a non-negative number",
          }
        ),
      location: z.string().optional(),
      internal_participants: z.array(z.string()).optional(),
      participants_external: z.string().optional(),
      agenda: z.string().optional(),
      remarks: z.string().optional(),
      visible_to_all: z.boolean().optional(),
    })
    .transform((arg) => ({
      ...arg,
      meeting_date: format(arg.meeting_date!, "yyyy-MM-dd"),
    }));

  /**
   * Type definition for the meeting form data
   */
  type MeetingFormData = z.infer<typeof meetingSchema>;

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [fileState, setFileState] = useState({
    files: [] as File[],
    existingFiles: [] as Attachment[],
  });

  const [searchState, setSearchState] = useState<{
    organizerSearch?: string;
    internalParticipantsSearch?: string;
  }>({
    organizerSearch: "",
    internalParticipantsSearch: "",
  });

  const [changelogState, setChangelogState] = useState({
    dialogOpen: false,
    type: null as "Status Change" | "Reassign" | null,
    pendingStatus: null as JHGroupedTaskMaster["status"] | null,
    comment: "",
    completionDate: format(new Date(), "yyyy-MM-dd"),
  });

  const [loading, setLoading] = useState(false);

  // ==========================================
  // API HOOKS
  // ==========================================
  const uploadFiles = useFilesUpload();
  const fileRemove = useFileRemove();
  const { data: currentJhUser, isLoading: isCurrentJhUserLoading } =
    useCurrentJhUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();

  const {
    data: meetingDetails,
    isLoading: isMeetingLoading,
    refetch: refetchMeetingDetails,
  } = useDocDetail<JHGroupedTaskMaster>({
    doctype: "JH Grouped Task Master",
    name: meetingId || "",
    disabled: !meetingId,
  });

  // ==========================================
  // DERIVED STATE & COMPUTATIONS
  // ==========================================
  // get the doc from the docDetails - use optional chaining to prevent errors
  const meeting = meetingDetails?.docs?.[0];
  const isCompleted = meeting?.status === "Completed";
  const isOwner = meeting?.owner === currentUser;

  // Function to get default form values - memoized to avoid unnecessary recalculations
  const getDefaultValues = useCallback(
    () => ({
      title: "",
      type: "group_task",
      organizer: currentJhUser?.name ?? "",
      meeting_date: "",
      duration: "",
      location: "",
      internal_participants: [],
      participants_external: "",
      agenda: "",
      remarks: "",
      visible_to_all: true,
    }),
    []
  );

  // ==========================================
  // FORM SETUP
  // ==========================================
  // form
  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: getDefaultValues(),
    mode: "onBlur", // Validate fields when they lose focus for better UX
    reValidateMode: "onChange", // Re-validate when the user makes changes
  });

  // form control
  const { control, handleSubmit, formState, reset, watch } = form;
  const { errors, isSubmitting, isDirty, isValid } = formState;

  // Compute button text based on state rather than using a separate state variable
  const buttonText = useMemo(() => {
    if (loading) {
      if (fileState.files.length > 0) return "Uploading Attachments";
      return isEdit ? "Saving Meeting" : "Creating Meeting";
    }
    return isEdit ? "Save Meeting" : "Create Meeting";
  }, [loading, isEdit, fileState.files.length]);

  // ==========================================
  // API MUTATIONS
  // ==========================================
  // save and update doc
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const addMeetingRemark = useAddMeetingRemark();

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  // Update search state setters
  const updateSearchState = (
    field: keyof typeof searchState,
    value: string
  ) => {
    setSearchState((prev) => ({ ...prev, [field]: value }));
  };

  // ==========================================
  // EFFECTS
  // ==========================================

  // useEffect(() => {
  //   if (!searchState.organizerSearch && currentJhUser) {
  //     setSearchState({
  //       organizerSearch: currentJhUser.full_name!,
  //     });
  //   }
  // }, [currentJhUser, searchState.organizerSearch]);

  // Reset form when meeting details are loaded or when switching between create/edit modes
  useEffect(() => {
    if (meeting) {
      reset({
        title: meeting.title || "",
        type: meeting.type || "",
        organizer: meeting.organizer || "",
        meeting_date: meeting.meeting_date || format(new Date(), "yyyy-MM-dd"),
        duration: meeting.duration || "",
        location: meeting.location || "",
        internal_participants: meeting.internal_participants
          ? meeting.internal_participants.map((participant) => participant.user)
          : [],
        participants_external: meeting.participants_external || "",
        agenda: meeting.agenda || "",
        remarks: meeting.remarks || "",
        visible_to_all: meeting.visible_to_all === 1 ? true : false,
      });

      // Set existing files when meeting is loaded
      if (meetingDetails?.docinfo?.attachments) {
        setFileState((prev) => ({
          ...prev,
          existingFiles: meetingDetails.docinfo.attachments,
        }));
      }
    } else if (open && !meetingId) {
      // Reset form when opening in create mode
      reset(getDefaultValues());
      setFileState({
        files: [],
        existingFiles: [],
      });
    }
  }, [meeting, meetingDetails, open, meetingId, reset, getDefaultValues]);

  // Reset form when sheet is closed
  useEffect(() => {
    if (!open) {
      reset(getDefaultValues());
      setFileState({
        files: [],
        existingFiles: [],
      });
    }
  }, [open, reset, getDefaultValues]);

  // ==========================================
  // DATA SAVING FUNCTIONS
  // ==========================================
  /**
   * Handles the meeting saving process, including file uploads
   * @param data Form data to save
   * @returns Promise that resolves when the meeting is saved
   */
  const saveMeeting = useCallback(
    async (data: MeetingFormData) => {
      try {
        setLoading(true);

        // Create document object
        const doc = {
          ...data,
          doctype: "JH Grouped Task Master",
          ...(meetingId && { name: meetingId }),
        };

        // Save or update the meeting
        let savedMeetingName = meetingId;
        if (isEdit && meetingId) {
          await updateDoc.mutateAsync({
            doc: {
              ...doc,
              internal_participants: doc?.internal_participants?.map(
                (participant) => ({ user: participant })
              ),
            },
            name: meetingId,
            doctype: "JH Grouped Task Master",
          });
        } else {
          const savedMeeting = await saveDoc.mutateAsync({
            ...doc,
            internal_participants: doc?.internal_participants?.map(
              (participant) => ({ user: participant })
            ),
            naming_series: doc.type === "meeting" ? "MTG" : "GPT",
          });
          savedMeetingName = savedMeeting.name;
        }

        // Upload files if any
        if (fileState.files.length > 0 && savedMeetingName) {
          await uploadFiles.mutateAsync({
            files: fileState.files,
            docname: savedMeetingName,
            doctype: "JH Grouped Task Master",
            onProgress: (progress) =>
              console.log(`Upload progress: ${progress}%`),
            onComplete: (status) => {
              if (status) {
                toast.success("Files uploaded successfully");
              } else {
                toast.error("Error uploading files");
              }
            },
            onError: (error) => {
              console.error("File upload error:", error);
              toast.error(
                `Error uploading files: ${error?.message || "Unknown error"}`
              );
            },
          });
        }

        await queryClient.invalidateQueries({
          queryKey: ["team-meetings"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["Docs"],
        });
        await queryClient.invalidateQueries({
          queryKey: [
            "DocInfo",
            {
              doctype: "JH Grouped Task Master",
              name: meetingId,
            },
          ],
        });

        // Success handling
        toast.success(
          isEdit
            ? "Meeting updated successfully"
            : "Meeting created successfully"
        );
        onOpenChange(false);
        await refetch?.();

        // Reset state after successful submission
        reset(getDefaultValues());
        setFileState({
          files: [],
          existingFiles: [],
        });
      } catch (error) {
        console.error("Meeting submission error:", error);
        toast.error(
          isEdit
            ? `Error updating meeting: ${
                (error as Error)?.message || "Unknown error"
              }`
            : `Error creating meeting: ${
                (error as Error)?.message || "Unknown error"
              }`
        );
      } finally {
        setLoading(false);
      }
    },
    [
      fileState.files,
      getDefaultValues,
      isEdit,
      onOpenChange,
      refetch,
      reset,
      saveDoc,
      meetingId,
      updateDoc,
      uploadFiles,
    ]
  );

  // Form submission handler with improved error handling
  const onSubmit = useCallback(
    async (data: MeetingFormData) => {
      await saveMeeting(data);
    },
    [saveMeeting]
  );

  // ==========================================
  // STATUS MANAGEMENT FUNCTIONS
  // ==========================================
  // Function to open the dialog and store the pending status
  const openStatusChangeDialog = useCallback(
    (newStatus: JHGroupedTaskMaster["status"]) => {
      setChangelogState({
        dialogOpen: true,
        type: "Status Change",
        pendingStatus: newStatus,
        comment: "",
        completionDate: format(new Date(), "yyyy-MM-dd"),
      });
    },
    []
  );

  // ==========================================
  // STATUS CHANGE HANDLERS
  // ==========================================
  const handleStatusChange = useCallback(
    async (newStatus: JHGroupedTaskMaster["status"]) => {
      if (!meeting) return;

      try {
        const updatedMeeting = {
          ...meeting,
          status: newStatus,
          doctype: "JH Grouped Task Master",
        };

        if (newStatus === "Completed") {
          updatedMeeting.completion_date = format(
            changelogState.completionDate,
            "yyyy-MM-dd"
          );
        }

        await saveDoc.mutateAsync(updatedMeeting);
        await addMeetingRemark.mutateAsync({
          meeting_id: meeting.name,
          comment: changelogState.comment,
          creator: currentJhUser?.name || "",
          type: "Status Change",
          remark: `changed status from ${meeting.status} to ${newStatus}`,
        });

        toast.success("Status updated successfully");
        await refetchMeetingDetails();

        // Clear the remark after successful update
        setChangelogState((prev) => ({
          ...prev,
          comment: "",
          completionDate: format(new Date(), "yyyy-MM-dd"),
        }));

        await queryClient.invalidateQueries({
          queryKey: ["team-meetings"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["task-change-logs", meeting.name],
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to update status");
      }
    },
    [
      meeting,
      changelogState.completionDate,
      changelogState.comment,
      saveDoc,
      addMeetingRemark,
      currentJhUser?.name,
      refetchMeetingDetails,
    ]
  );

  // Function to confirm status change with remark
  const confirmStatusChange = useCallback(() => {
    if (changelogState.pendingStatus) {
      handleStatusChange(changelogState.pendingStatus);
      setChangelogState((prev) => ({
        ...prev,
        dialogOpen: false,
        type: null,
      }));
    }
  }, [changelogState.pendingStatus, handleStatusChange]);

  // ==========================================
  // FILE HANDLING FUNCTIONS
  // ==========================================
  // Handle file changes from the FileAttachmentHandler component
  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFileState((prev) => ({
      ...prev,
      files: newFiles,
    }));
  }, []);

  // Handle existing file removal
  const handleRemoveExistingFile = useCallback(
    async (file: Attachment) => {
      if (!meetingId) return;

      try {
        await fileRemove.mutateAsync({
          fid: file.name,
          dt: "JH Grouped Task Master",
          dn: meetingId,
        });

        setFileState((prev) => ({
          ...prev,
          existingFiles: prev.existingFiles.filter((f) => f.name !== file.name),
        }));

        toast.success(`File ${file.location} removed successfully`);
        await queryClient.invalidateQueries({
          queryKey: [
            "DocInfo",
            {
              doctype: "JH Grouped Task Master",
              name: meetingId,
            },
          ],
        });
      } catch (error) {
        console.error("Error removing file:", error);
        toast.error(
          `Error removing file: ${(error as Error)?.message || "Unknown error"}`
        );
      }
    },
    [fileRemove, meetingId]
  );

  // Get users with memoized filters
  const { data: organizerUserList } = useDocs<JHUserMaster>({
    doctype: "JH User Master",
    fields: ["full_name", "name"],
    filters: searchState.organizerSearch
      ? [["full_name", "like", `%${searchState.organizerSearch}%`]]
      : [],
    orderBy: {
      field: "full_name",
      order: "asc",
    },
  });

  const { data: internalParticipantsUserList } = useDocs<JHUserMaster>({
    doctype: "JH User Master",
    fields: ["full_name", "name"],
    filters: searchState.internalParticipantsSearch
      ? [["full_name", "like", `%${searchState.internalParticipantsSearch}%`]]
      : [],
    orderBy: {
      field: "full_name",
      order: "asc",
    },
  });

  const { data: selectedInternalParticipantsUserList } = useDocs<JHUserMaster>({
    doctype: "JH User Master",
    fields: ["full_name", "name"],
    filters: watch("internal_participants")
      ? [["name", "in", watch("internal_participants")!]]
      : [],
    orderBy: {
      field: "full_name",
      order: "asc",
    },
    limit: 100,
  });

  // ==========================================
  // LOADING STATE HANDLING
  // ==========================================
  // Add loading state for initial task fetch
  if (
    isEdit &&
    isMeetingLoading &&
    isCurrentJhUserLoading &&
    isCurrentUserLoading
  ) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-h-3xl px-5">
          <div className="flex items-center justify-center h-full">
            <p>Loading meeting details...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const attachmentLogs = meetingDetails?.docinfo?.attachment_logs || [];

  // get attachment owner from attachment logs by matching file name with content :check docInfo api response
  const getAttachmentOwner = (fileName: string) => {
    const log = attachmentLogs.find((log) => log.content.includes(fileName));
    return log?.owner;
  };

  const isAlreadyEdited = meeting?.creation !== meeting?.modified;

  // ==========================================
  // COMPONENT RENDER
  // ==========================================
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5">
        <SheetHeader className="px-0 flex-row justify-between items-center">
          <SheetTitle className="text-2xl font-bold">
            {isEdit
              ? `Edit Meeting: ${meeting?.title || meetingId}`
              : "Create Meeting / Grouped Tasks"}
          </SheetTitle>
          <div className="ml-auto">
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <XIcon className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        {isCompleted && (
          <Alert variant={"destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {`This meeting / grouped task is ${
                isCompleted ? "completed" : "in the recycle bin"
              }. You cannot edit it.`}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-screen">
          <SheetDescription className="h-[calc(100vh-100px)]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center">
                {isEdit && isMeetingLoading ? (
                  <Skeleton className="w-[180px] h-10" />
                ) : meeting ? (
                  <MeetingStatusSelector
                    meeting={meeting!}
                    handleStatusChange={(value) =>
                      openStatusChangeDialog(
                        value as JHGroupedTaskMaster["status"]
                      )
                    }
                  />
                ) : null}
              </div>
              <ChangelogRemarkDialog
                meetingId={meetingId!}
                showCompletionDatePicker={
                  changelogState.pendingStatus == "Completed"
                }
                completionDate={changelogState.completionDate}
                setCompletionDate={(date) =>
                  setChangelogState((prev) => ({
                    ...prev,
                    completionDate: date,
                  }))
                }
                open={changelogState.dialogOpen}
                onOpenChange={(open) =>
                  setChangelogState((prev) => ({ ...prev, dialogOpen: open }))
                }
                changelogComment={changelogState.comment}
                setChangelogComment={(comment) =>
                  setChangelogState((prev) => ({ ...prev, comment: comment }))
                }
                confirmChangelogRemark={
                  changelogState.type === "Status Change"
                    ? confirmStatusChange
                    : () => {}
                }
                minCompletionDate={meeting?.meeting_date}
              />
              <div className="space-y-2">
                <Label
                  htmlFor="meeting-title"
                  className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                >
                  Title
                </Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      disabled={
                        isCompleted ||
                        (isEdit && !isOwner) ||
                        (isEdit && isAlreadyEdited)
                      }
                      id="meeting-title"
                      placeholder="Enter Meeting Title"
                      autoComplete="off"
                      aria-invalid={errors.title ? "true" : "false"}
                      aria-describedby={
                        errors.title ? "meeting-title-error" : undefined
                      }
                      {...field}
                    />
                  )}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm" id="meeting-title-error">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      disabled={isEdit}
                      checked={field.value === "meeting"}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? "meeting" : "group_task");
                      }}
                      defaultValue={"meeting"}
                      id="type"
                    />
                  )}
                />
                <Label htmlFor="type">
                  {watch("type") === "meeting" ? "Meeting" : "Grouped Task"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="visible_to_all"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      disabled={isEdit}
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? true : false);
                      }}
                      id="visible_to_all"
                    />
                  )}
                />
                <Label htmlFor="visible_to_all">
                  {watch("visible_to_all") === true
                    ? "Visible to all"
                    : "Visible to creator/assignee"}
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="meeting_date"
                    className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                  >
                    Meeting Date
                  </Label>
                  <Controller
                    name="meeting_date"
                    control={control}
                    render={({ field }) => (
                      <input
                        // min={format(new Date(), "yyyy-MM-dd")} // allowing past dates
                        type="date"
                        id="meeting_date"
                        disabled={isCompleted}
                        {...field}
                        value={
                          field.value
                            ? format(new Date(field.value), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? format(new Date(e.target.value), "yyyy-MM-dd")
                              : undefined
                          )
                        }
                        className={cn(
                          "pl-3 text-left font-normal w-full h-9 border rounded-sm",
                          !field.value && "text-muted-foreground"
                        )}
                        aria-invalid={errors.meeting_date ? "true" : "false"}
                        aria-describedby={
                          errors.meeting_date ? "meeting-date-error" : undefined
                        }
                      />
                    )}
                  />
                  {errors.meeting_date && (
                    <p className="text-red-500 text-sm" id="meeting-date-error">
                      {errors.meeting_date.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (in minutes)</Label>
                  <Controller
                    name="duration"
                    control={control}
                    render={({ field }) => (
                      <Input
                        disabled={isCompleted || (isEdit && !isOwner)}
                        id="duration"
                        placeholder="Enter Duration"
                        type="number"
                        min="0"
                        step="0.01"
                        onKeyDown={(e) => {
                          // Allow: backspace, delete, tab, escape, enter, decimal point
                          if (
                            [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !==
                              -1 ||
                            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                            (e.keyCode >= 65 &&
                              e.keyCode <= 90 &&
                              e.ctrlKey === true) ||
                            // Allow: home, end, left, right
                            (e.keyCode >= 35 && e.keyCode <= 39) ||
                            // Allow: numbers
                            (e.keyCode >= 48 && e.keyCode <= 57) ||
                            (e.keyCode >= 96 && e.keyCode <= 105)
                          ) {
                            return;
                          }
                          // Stop keypress
                          e.preventDefault();
                        }}
                        autoComplete="off"
                        aria-invalid={errors.duration ? "true" : "false"}
                        aria-describedby={
                          errors.duration ? "duration-error" : undefined
                        }
                        {...field}
                      />
                    )}
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm">
                      {errors.duration.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <Input
                        disabled={isCompleted || (isEdit && !isOwner)}
                        id="location"
                        placeholder="Enter Location"
                        autoComplete="off"
                        aria-invalid={errors.location ? "true" : "false"}
                        aria-describedby={
                          errors.location ? "file-name-error" : undefined
                        }
                        {...field}
                      />
                    )}
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm">
                      {errors.location.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="organizer"
                    className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                  >
                    Organizer
                  </Label>
                  <Controller
                    name="organizer"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={organizerUserList.map((user) => ({
                          value: user.name!,
                          label: user.full_name!,
                        }))}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value)}
                        onSearch={(value) =>
                          updateSearchState("organizerSearch", value)
                        }
                        searchKeyword={searchState.organizerSearch!}
                        placeholder="Select organizer"
                        // disabled={isCompleted || (isEdit && !isOwner)}
                        disabled={true}
                        className={errors.organizer ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.organizer && (
                    <p className="text-red-500 text-sm" id="assignee-error">
                      {errors.organizer.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internal_participants">
                    Internal Participants
                  </Label>
                  <Controller
                    name="internal_participants"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectCombobox
                        selectedOptions={selectedInternalParticipantsUserList.map(
                          (user) => ({
                            value: user.name!,
                            label: user.full_name!,
                          })
                        )}
                        options={internalParticipantsUserList.map((user) => ({
                          value: user.name!,
                          label: user.full_name!,
                        }))}
                        selected={field.value || []}
                        onChange={(value) => field.onChange(value)}
                        onSearch={(value) =>
                          updateSearchState("internalParticipantsSearch", value)
                        }
                        searchKeyword={searchState.internalParticipantsSearch!}
                      />
                    )}
                  />
                  {errors.internal_participants && (
                    <p className="text-red-500 text-sm" id="assignee-error">
                      {errors.internal_participants.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2 pb-1">
                <Label htmlFor="participants_external">
                  External Participants
                </Label>
                <Controller
                  name="participants_external"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="participants_external"
                      placeholder="Add External Participants"
                      value={field.value || ""}
                      onChange={field.onChange}
                      className="h-[150px] max-h-[150px]"
                    />
                  )}
                />
                {errors.agenda && (
                  <p className="text-red-500 text-sm">
                    {errors.agenda.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 pb-10">
                <Label htmlFor="agenda">Agenda</Label>
                <Controller
                  name="agenda"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
                      readOnly={
                        isCompleted ||
                        (isEdit && !isOwner) ||
                        (isEdit && isAlreadyEdited)
                      }
                      id="agenda"
                      className="h-[150px] max-h-[150px]"
                      placeholder="Enter Agenda"
                      theme="snow"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.agenda && (
                  <p className="text-red-500 text-sm">
                    {errors.agenda.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 pb-10">
                <Label htmlFor="remarks">Remarks</Label>
                <Controller
                  name="remarks"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
                      readOnly={isCompleted || (isEdit && !isOwner)}
                      id="remarks"
                      className="h-[150px] max-h-[150px]"
                      placeholder="Enter Remarks"
                      theme="snow"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.remarks && (
                  <p className="text-red-500 text-sm">
                    {errors.remarks.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 pb-28">
                <FileAttachmentHandler
                  existingFiles={fileState.existingFiles}
                  disabled={isCompleted}
                  onFilesChange={handleFilesChange}
                  onExistingFileRemove={handleRemoveExistingFile}
                  getAttachmentOwner={getAttachmentOwner}
                  currentUser={currentUser}
                  owner={meeting?.owner}
                />
              </div>
              <SheetFooter className="flex-col absolute bottom-0 w-full bg-white">
                <Separator className="my-4" />
                <div className="flex w-full">
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="mr-2 w-full"
                      onClick={() => {
                        reset(getDefaultValues());
                        setFileState({
                          files: [],
                          existingFiles: [],
                        });
                      }}
                      type="button"
                    >
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button
                    type="submit"
                    className="bg-[#972e26] hover:bg-[#972e26]/90 w-full"
                    disabled={
                      loading ||
                      isSubmitting ||
                      (!isEdit && (!isDirty || !isValid))
                    }
                  >
                    {loading || isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-3"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {buttonText}
                      </span>
                    ) : (
                      buttonText
                    )}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </SheetDescription>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
