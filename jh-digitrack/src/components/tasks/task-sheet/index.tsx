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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDocs,
  useSaveDoc,
  useDocDetail,
  useUpdateDoc,
  useDoc,
  type DocFilters,
} from "@/hooks/doc";
import { useFilesUpload, useFileRemove } from "@/hooks/file";
import { toast } from "sonner";
import type { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import type { JHDivisionMaster } from "@/types/JHDigitrack/JHDivisionMaster";
import type { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { cn } from "@/lib/utils";
import { useCurrentJhUser, useCurrentUser } from "@/hooks/auth";
import type { Attachment } from "@/types/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskStatusSelector } from "../ui/TaskStatusSelector";
import { useAddTaskRemark } from "@/hooks/task";
import { queryClient } from "@/utils/query-client";
import TaskTimeline from "../ui/TaskTimeline";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChangelogRemarkDialog from "./ChangeLogRemarkDialog";
import FileAttachmentHandler from "./FileAttachmentHandler";
import frappeClient from "@/utils/frappe-client";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import { JHGroupedTaskMaster } from "@/types/JHDigitrack/JHGroupedTaskMaster";
import { Task } from "@/types/tasks";

// ==========================================
// COMPONENT PROPS INTERFACE
// ==========================================
interface TaskSheetProps {
  open: boolean;
  taskId?: string;
  onOpenChange: (open: boolean) => void;
  refetch?: () => Promise<unknown>;
  source?: string;
  sourceDocType?:
    | "JH Audit Master"
    | "JH TS Projects"
    | "JH Grouped Task Master";
}

export function TaskSheet({
  open,
  taskId,
  onOpenChange,
  refetch,
  source,
  sourceDocType,
}: TaskSheetProps) {
  const isEdit = Boolean(taskId);

  // ==========================================
  // FORM VALIDATION SCHEMA
  // ==========================================
  /**
   * Task form validation schema
   * Validates all form inputs before submission
   */
  const taskSchema = z
    .object({
      start_after: z.string().optional(),
      task_name: z
        .string()
        .min(1, "Task name is required")
        .max(140, "Task name cannot be longer than 140 characters"),
      private: z.boolean().default(false),
      no_automated_email_assignor: z.boolean().default(false),
      no_automated_email_assignee: z.boolean().default(false),
      business_id: z.string().optional(),
      division_id: z.string().optional(),
      assigned_to: z.string().min(1, "Assignee is required"),
      effort: z
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
            message: "Effort must be a non-negative number",
          }
        ),
      revised_due_date: z.string().optional(),
      due_date: z.string().refine(
        (date) => {
          if (isEdit) return true;
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set to start of today
          return new Date(date) >= today;
        },
        {
          message: "Due date cannot be in the past",
        }
      ),
      description: z.string().optional(),
      assignee_comments: z.string().optional(),
    })
    .transform((arg) => ({
      ...arg,
      due_date: format(arg.due_date, "yyyy-MM-dd"), // Use date-fns for consistent formatting
    }));

  /**
   * Type definition for the task form data
   */
  type TaskFormData = z.infer<typeof taskSchema>;

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [fileState, setFileState] = useState({
    files: [] as File[],
    existingFiles: [] as Attachment[],
  });

  const [searchState, setSearchState] = useState({
    assigneeSearch: "",
    businessSearch: "",
    divisionSearch: "",
    startAfterSearch: "",
  });

  const [changelogState, setChangelogState] = useState({
    dialogOpen: false,
    type: null as "Status Change" | "Reassign" | null,
    pendingStatus: null as Task["status"] | null,
    comment: "",
    completionDate: format(new Date(), "yyyy-MM-dd"),
  });

  const [loading, setLoading] = useState(false);
  const [dataToSave, setDataToSave] = useState<TaskFormData | null>(null);

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
    data: taskDetails,
    isLoading: isTaskLoading,
    refetch: refetchTaskDetails,
  } = useDocDetail<Task>({
    doctype: "JH Task Master",
    name: taskId || "",
    disabled: !taskId,
  });

  // ==========================================
  // DERIVED STATE & COMPUTATIONS
  // ==========================================
  // get the doc from the docDetails - use optional chaining to prevent errors
  const task = taskDetails?.docs?.[0];
  const isClosed = task?.status === "Closed";
  const isDeleted = Boolean(task?.deleted_at);
  const isOwner = task?.owner === currentUser;
  const showStartAfter =
    source &&
    (sourceDocType === "JH Audit Master" ||
      sourceDocType === "JH Grouped Task Master");

  // Function to get default form values - memoized to avoid unnecessary recalculations
  const getDefaultValues = useCallback(
    () => ({
      start_after: "",
      task_name: "",
      private: false,
      no_automated_email_assignee: false,
      no_automated_email_assignor: false,
      business_id: "",
      division_id: "",
      assigned_to: "",
      due_date: format(new Date(), "yyyy-MM-dd"), // Format as string to match schema
      description: "",
      assignee_comments: "",
      effort: "",
      revised_due_date: format(new Date(), "yyyy-MM-dd"),
    }),
    []
  );

  // ==========================================
  // FORM SETUP
  // ==========================================
  // form
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: getDefaultValues(),
    mode: "onBlur", // Validate fields when they lose focus for better UX
    reValidateMode: "onChange", // Re-validate when the user makes changes
  });

  // form control
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
    setValue,
    watch,
    reset,
  } = form;

  // Compute button text based on state rather than using a separate state variable
  const buttonText = useMemo(() => {
    if (loading) {
      if (fileState.files.length > 0) return "Uploading Attachments";
      return isEdit ? "Saving Task" : "Creating Task";
    }
    return isEdit ? "Save Task" : "Create Task";
  }, [loading, isEdit, fileState.files.length]);

  // ==========================================
  // API MUTATIONS
  // ==========================================
  // save and update doc
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const addTaskRemark = useAddTaskRemark();

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
  // Reset form when task details are loaded or when switching between create/edit modes
  useEffect(() => {
    if (task) {
      reset({
        start_after: task.start_after || "",
        task_name: task.task_name || "",
        private: task.private === 1,
        no_automated_email_assignor: task.no_automated_email_assignor === 1,
        no_automated_email_assignee: task.no_automated_email_assignee === 1,
        business_id: task.business_id || "",
        division_id: task.division_id || "",
        assigned_to: task.assigned_to || "",
        due_date: task.due_date || format(new Date(), "yyyy-MM-dd"),
        description: task.description || "",
        assignee_comments: task.assignee_comments || "",
        effort: task.effort || "",
        revised_due_date:
          task.revised_due_date || format(new Date(), "yyyy-MM-dd"),
      });

      // Set existing files when task is loaded
      if (taskDetails?.docinfo?.attachments) {
        setFileState((prev) => ({
          ...prev,
          existingFiles: taskDetails.docinfo.attachments,
        }));
      }
    } else if (open && !taskId) {
      // Reset form when opening in create mode
      reset(getDefaultValues());
      setFileState({
        files: [],
        existingFiles: [],
      });
    }
  }, [task, taskDetails, open, taskId, reset, getDefaultValues]);

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

  // Auto-assign current user when task is private
  const isPrivate = watch("private");
  const assignedTo = watch("assigned_to");

  const { data: assigneeJhUser } = useDoc<JHUserMaster>({
    doctype: "JH User Master",
    name: assignedTo,
    disabled: !assignedTo,
  });

  const { data: audit } = useDoc<JHAudits>({
    doctype: "JH Audit Master",
    name: task?.source ?? source ?? "",
    disabled: (!task?.source && !source) || sourceDocType !== "JH Audit Master",
  });

  const { data: groupedTask } = useDoc<JHGroupedTaskMaster>({
    doctype: "JH Grouped Task Master",
    name: task?.source ?? source ?? "",
    disabled:
      (!task?.source && !source) || sourceDocType !== "JH Grouped Task Master",
  });

  const sourceData = audit || groupedTask;

  useEffect(() => {
    if (isPrivate && currentJhUser?.name) {
      setValue("assigned_to", currentJhUser.name, { shouldValidate: true });
    }
  }, [isPrivate, currentJhUser, setValue, assignedTo]);

  useEffect(() => {
    let isMounted = true;

    async function fetchAndSetBusinessAndDivision() {
      try {
        if (
          !assignedTo ||
          !assigneeJhUser?.business ||
          !assigneeJhUser?.division
        ) {
          return;
        }

        const [business_data, division_data] = await Promise.all([
          frappeClient.db.getDoc("JH Business Master", assigneeJhUser.business),
          frappeClient.db.getDoc("JH Division Master", assigneeJhUser.division),
        ]);

        if (!isMounted) return;

        setSearchState((prev) => ({
          ...prev,
          businessSearch: business_data?.business_name ?? "",
          divisionSearch: division_data?.division_name ?? "",
          assigneeSearch: assigneeJhUser?.full_name ?? "",
        }));

        setValue("business_id", business_data?.name, { shouldValidate: true });
        setValue("division_id", division_data?.name, { shouldValidate: true });
      } catch (error) {
        console.error("Error fetching business and division data:", error);
        // Handle error appropriately - maybe show a notification to user
      }
    }

    fetchAndSetBusinessAndDivision();

    return () => {
      isMounted = false;
    };
  }, [
    assignedTo,
    assigneeJhUser?.business,
    assigneeJhUser?.division,
    assigneeJhUser?.full_name,
    setValue,
  ]);

  // ==========================================
  // DATA SAVING FUNCTIONS
  // ==========================================
  /**
   * Handles the task saving process, including file uploads
   * @param data Form data to save
   * @returns Promise that resolves when the task is saved
   */
  const saveTask = useCallback(
    async (data: TaskFormData) => {
      try {
        setLoading(true);

        // Create document object
        const doc = {
          ...data,
          doctype: "JH Task Master",
          ...(taskId && { name: taskId }),
        };

        // Save or update the task
        let savedTaskName = taskId;
        if (isEdit && taskId) {
          await updateDoc.mutateAsync({
            doc,
            name: taskId,
            doctype: "JH Task Master",
          });
        } else {
          const savedTask = await saveDoc.mutateAsync({
            ...doc,
            created_by: currentJhUser?.name,
            source: source,
            source_doctype: sourceDocType,
          });
          savedTaskName = savedTask.name;
        }

        // Upload files if any
        if (fileState.files.length > 0 && savedTaskName) {
          await uploadFiles.mutateAsync({
            files: fileState.files,
            docname: savedTaskName,
            doctype: "JH Task Master",
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
          queryKey: ["Docs"],
        });
        await queryClient.invalidateQueries({
          queryKey: [
            "DocInfo",
            {
              doctype: "JH Task Master",
              name: taskId,
            },
          ],
        });
        await queryClient.invalidateQueries({
          queryKey: ["task-counts", source],
        });

        // Success handling
        toast.success(
          isEdit ? "Task updated successfully" : "Task created successfully"
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
        console.error("Task submission error:", error);
        toast.error(
          isEdit
            ? `Error updating task: ${
                (error as Error)?.message || "Unknown error"
              }`
            : `Error creating task: ${
                (error as Error)?.message || "Unknown error"
              }`
        );
      } finally {
        setLoading(false);
      }
    },
    [
      currentJhUser?.name,
      fileState.files,
      getDefaultValues,
      isEdit,
      onOpenChange,
      refetch,
      reset,
      saveDoc,
      source,
      sourceDocType,
      taskId,
      updateDoc,
      uploadFiles,
    ]
  );

  // Form submission handler with improved error handling
  const onSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!isEdit) {
        await saveTask(data);
      } else if (data.assigned_to !== task?.assigned_to) {
        setChangelogState({
          dialogOpen: true,
          type: "Reassign",
          pendingStatus: null,
          comment: "",
          completionDate: format(new Date(), "yyyy-MM-dd"),
        });
        setDataToSave(data);
      } else {
        await saveTask(data);
      }
    },
    [isEdit, saveTask, task?.assigned_to, setChangelogState, setDataToSave]
  );

  // ==========================================
  // STATUS MANAGEMENT FUNCTIONS
  // ==========================================
  // Function to open the dialog and store the pending status
  const openStatusChangeDialog = useCallback((newStatus: Task["status"]) => {
    setChangelogState({
      dialogOpen: true,
      type: "Status Change",
      pendingStatus: newStatus,
      comment: "",
      completionDate: format(new Date(), "yyyy-MM-dd"),
    });
  }, []);

  // ==========================================
  // DATA FILTERING & QUERYING
  // ==========================================
  // Read selected values from form for memoized filters
  const selectedBusiness = watch("business_id");
  const selectedDivision = watch("division_id");
  const dueDate = watch("due_date");

  useEffect(() => {
    if (!isEdit) {
      if (dueDate) setValue("revised_due_date", dueDate);
    }
  }, [isEdit, dueDate, setValue]);

  // Create memoized business filters
  const businessFilters = useMemo(() => {
    if (!searchState.businessSearch) return undefined;
    return [
      ["business_name", "like", `%${searchState.businessSearch}%`],
    ] as DocFilters<JHBusinessMaster>;
  }, [searchState.businessSearch]);

  // Create memoized division filters
  const divisionFilters = useMemo(() => {
    const filters: Array<[string, string, string]> = [];

    if (selectedBusiness) {
      filters.push(["business", "=", selectedBusiness]);
    }

    if (searchState.divisionSearch) {
      filters.push([
        "division_name",
        "like",
        `%${searchState.divisionSearch}%`,
      ]);
    }

    return filters as DocFilters<JHDivisionMaster>;
  }, [selectedBusiness, searchState.divisionSearch]);

  // Memoize user filters for better performance
  const usersFilters = useMemo(() => {
    const filters: Array<[string, string, string]> = [
      ["full_name", "!=", "JH Admin"],
    ];

    if (selectedBusiness) {
      filters.push(["business", "=", selectedBusiness]);
    }

    if (selectedDivision && selectedBusiness) {
      filters.push(["division", "=", selectedDivision]);
    }

    if (searchState.assigneeSearch) {
      filters.push(["full_name", "like", `%${searchState.assigneeSearch}%`]);
    }

    return filters as DocFilters<JHUserMaster>;
  }, [selectedBusiness, selectedDivision, searchState.assigneeSearch]);

  // ==========================================
  // DATA FETCHING
  // ==========================================
  // Get businesses with memoized filters
  const { data: businesses = [], isLoading: isBusinessesLoading } =
    useDocs<JHBusinessMaster>({
      doctype: "JH Business Master",
      fields: ["business_id", "business_name"],
      filters: businessFilters,
      orderBy: {
        field: "business_name",
        order: "asc",
      },
    });

  // Get divisions with memoized filters
  const { data: divisions = [], isLoading: isDivisionsLoading } =
    useDocs<JHDivisionMaster>({
      doctype: "JH Division Master",
      fields: ["division_id", "division_name"],
      filters: divisionFilters,
      enabled: !!selectedBusiness,
      orderBy: {
        field: "division_name",
        order: "asc",
      },
    });

  const { data: startAfterTasks = [], isLoading: isStartAfterLoading } =
    useDocs<Task>({
      doctype: "JH Task Master",
      fields: ["name", "task_name", "serial_number", "deleted_at"],
      filters: [
        ["source_doctype", "=", sourceDocType!],
        ["source", "=", source!],
        ["task_name", "like", `%${searchState.startAfterSearch}%`],
      ],
      enabled: !!source && !!sourceDocType,
      orderBy: {
        field: "serial_number",
        order: "asc",
      },
    });

  // Get users with memoized filters
  const { data: users = [], isLoading: isUsersLoading } = useDocs<JHUserMaster>(
    {
      doctype: "JH User Master",
      fields: ["full_name", "name"],
      filters: usersFilters,
      orderBy: {
        field: "full_name",
        order: "asc",
      },
    }
  );

  // ==========================================
  // STATUS CHANGE HANDLERS
  // ==========================================
  const handleStatusChange = useCallback(
    async (newStatus: Task["status"]) => {
      if (!task) return;

      try {
        const updatedTask = {
          ...task,
          status: newStatus,
          doctype: "JH Task Master",
        };

        if (newStatus === "Completed") {
          updatedTask.completion_date = format(
            changelogState.completionDate,
            "yyyy-MM-dd"
          );
        }

        await saveDoc.mutateAsync(updatedTask);
        await addTaskRemark.mutateAsync({
          task_id: task.name,
          comment: changelogState.comment,
          creator: currentJhUser?.name || "",
          type: "Status Change",
          remark: `changed status from ${task.status} to ${newStatus}`,
        });
        toast.success("Status updated successfully");
        await refetchTaskDetails();

        // Clear the remark after successful update
        setChangelogState((prev) => ({
          ...prev,
          comment: "",
          completionDate: format(new Date(), "yyyy-MM-dd"),
        }));

        await queryClient.invalidateQueries({
          queryKey: ["Docs"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["task-change-logs", task.name],
        });
        await queryClient.invalidateQueries({
          queryKey: ["team-tasks"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["task-counts", source],
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to update status");
      }
    },
    [
      task,
      changelogState.completionDate,
      changelogState.comment,
      saveDoc,
      addTaskRemark,
      currentJhUser?.name,
      refetchTaskDetails,
    ]
  );

  // Function to confirm status change with remark
  const confirmStatusChange = useCallback(async () => {
    if (changelogState.pendingStatus) {
      await handleStatusChange(changelogState.pendingStatus);
      setChangelogState((prev) => ({
        ...prev,
        dialogOpen: false,
        type: null,
      }));
    }
  }, [changelogState.pendingStatus, handleStatusChange]);

  // ==========================================
  // TASK REASSIGNMENT HANDLER
  // ==========================================
  const handleReassignTask = useCallback(async () => {
    if (!task) return;
    if (task.assigned_to === dataToSave?.assigned_to) return;

    await saveTask(dataToSave!);

    console.log(task.assigned_to, dataToSave?.assigned_to);

    if (!task.assigned_to || !dataToSave?.assigned_to) return;
    const fromAssignee = await frappeClient.db.getLastDoc<JHUserMaster>(
      "JH User Master",
      {
        filters: [["name", "=", task.assigned_to!]],
      }
    );

    const toAssignee = await frappeClient.db.getLastDoc<JHUserMaster>(
      "JH User Master",
      {
        filters: [["name", "=", dataToSave.assigned_to]],
      }
    );

    console.log(fromAssignee, toAssignee);

    await addTaskRemark.mutateAsync({
      task_id: task.name,
      comment: changelogState.comment,
      creator: currentJhUser?.name || "",
      type: "Reassign",
      remark: `reassigned from ${fromAssignee?.full_name} to ${toAssignee?.full_name}`,
    });
    await refetchTaskDetails();

    // Clear the remark after successful update
    setChangelogState((prev) => ({
      ...prev,
      comment: "",
      type: null,
    }));

    await queryClient.invalidateQueries({
      queryKey: ["Docs"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["task-change-logs", task.name],
    });

    setChangelogState((prev) => ({
      ...prev,
      dialogOpen: false,
    }));
  }, [
    task,
    dataToSave,
    saveTask,
    addTaskRemark,
    changelogState.comment,
    currentJhUser?.name,
    refetchTaskDetails,
  ]);

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
      if (!taskId) return;

      try {
        await fileRemove.mutateAsync({
          fid: file.name,
          dt: "JH Task Master",
          dn: taskId,
        });

        setFileState((prev) => ({
          ...prev,
          existingFiles: prev.existingFiles.filter((f) => f.name !== file.name),
        }));

        toast.success(`File ${file.file_name} removed successfully`);
        await queryClient.invalidateQueries({
          queryKey: [
            "DocInfo",
            {
              doctype: "JH Task Master",
              name: taskId,
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
    [fileRemove, taskId]
  );

  // ==========================================
  // LOADING STATE HANDLING
  // ==========================================
  // Add loading state for initial task fetch
  if (
    isEdit &&
    isTaskLoading &&
    isUsersLoading &&
    isBusinessesLoading &&
    isDivisionsLoading &&
    isStartAfterLoading &&
    isCurrentJhUserLoading &&
    isCurrentUserLoading
  ) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-h-3xl px-5">
          <div className="flex items-center justify-center h-full">
            <p>Loading task details...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const attachmentLogs = taskDetails?.docinfo?.attachment_logs || [];

  // get attachment owner from attachment logs by matching file name with content :check docInfo api response
  const getAttachmentOwner = (fileName: string) => {
    const log = attachmentLogs.find((log) => log.content.includes(fileName));
    return log?.owner;
  };

  const isAlreadyEdited = task?.creation !== task?.modified;

  // ==========================================
  // COMPONENT RENDER
  // ==========================================
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5">
        <SheetHeader className="px-0 flex-row justify-between items-center">
          <SheetTitle className="text-2xl font-semibold truncate max-w-[100ch]">
            {isEdit
              ? `Edit Task: ${
                  task?.serial_number ? "#" + task?.serial_number + " " : ""
                }${task?.task_name}`
              : "Create Task"}
          </SheetTitle>
          <div className="ml-auto">
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <XIcon className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="max-h-screen">
          <SheetDescription className="h-[calc(100vh-100px)]">
            {(isClosed || isDeleted) && (
              <Alert variant={"destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {`This task is ${
                    isClosed ? "closed" : "in the recycle bin"
                  }. You cannot edit it.`}
                </AlertDescription>
              </Alert>
            )}

            {["JH Audit Master", "JH Grouped Task Master"].includes(
              sourceDocType!
            ) && (
              <div className="space-y-2">
                <span>
                  <b>{sourceData?.name}</b>:{" "}
                  {sourceDocType === "JH Audit Master"
                    ? (sourceData as JHAudits)?.audit_name
                    : (sourceData as JHGroupedTaskMaster)?.title}
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center mt-4">
                {isEdit && isTaskLoading ? (
                  <Skeleton className="w-[180px] h-10" />
                ) : task ? (
                  <TaskStatusSelector
                    task={task!}
                    handleStatusChange={(value) =>
                      openStatusChangeDialog(value as Task["status"])
                    }
                  />
                ) : null}
              </div>
              <ChangelogRemarkDialog
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
                    : changelogState.type === "Reassign"
                    ? handleReassignTask
                    : () => Promise.resolve()
                }
              />
              <div className="space-y-2">
                <Label
                  htmlFor="task-name"
                  className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                >
                  Task Name
                </Label>
                <Controller
                  name="task_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      disabled={
                        isClosed ||
                        isDeleted ||
                        (isEdit && !isOwner) ||
                        (isEdit && isAlreadyEdited)
                      }
                      id="task-name"
                      placeholder="Enter task name"
                      autoComplete="off"
                      aria-invalid={errors.task_name ? "true" : "false"}
                      aria-describedby={
                        errors.task_name ? "task-name-error" : undefined
                      }
                      {...field}
                    />
                  )}
                />
                {errors.task_name && (
                  <p className="text-red-500 text-sm" id="task-name-error">
                    {errors.task_name.message}
                  </p>
                )}
              </div>
              {showStartAfter && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business">Start After</Label>
                    <Controller
                      name="start_after"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={startAfterTasks
                            .filter(
                              (t) =>
                                t.deleted_at === null ||
                                t.deleted_at === undefined ||
                                t.deleted_at === "" ||
                                !t.deleted_at
                            )
                            .filter((t) => t.name !== task?.name)
                            .map((task) => ({
                              value: task.name || "",
                              label: `${
                                task.serial_number
                                  ? "#" + task.serial_number
                                  : ""
                              } ${task.task_name ?? ""}`,
                            }))}
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          onSearch={(value) =>
                            updateSearchState("startAfterSearch", value)
                          }
                          searchKeyword={searchState.startAfterSearch}
                          placeholder="Select task"
                          disabled={isPrivate || isClosed || isDeleted}
                          className={errors.start_after ? "border-red-500" : ""}
                        />
                      )}
                    />
                    {errors.start_after && (
                      <p className="text-red-500 text-sm">
                        {errors.start_after.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Controller
                  name="private"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      disabled={isEdit || Boolean(source)}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="private-task"
                    />
                  )}
                />
                <Label htmlFor="private-task">Private task</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business">Business</Label>
                  <Controller
                    name="business_id"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={businesses.map((business) => ({
                          value: business.business_id || "",
                          label: business.business_name || "",
                        }))}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value)}
                        onSearch={(value) =>
                          updateSearchState("businessSearch", value)
                        }
                        searchKeyword={searchState.businessSearch}
                        placeholder="Select business"
                        disabled={isPrivate || isClosed || isDeleted}
                        className={errors.business_id ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.business_id && (
                    <p className="text-red-500 text-sm">
                      {errors.business_id.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Controller
                    name="division_id"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={divisions.map((division) => ({
                          value: division.division_id || "",
                          label: division.division_name || "",
                        }))}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value)}
                        onSearch={(value) =>
                          updateSearchState("divisionSearch", value)
                        }
                        searchKeyword={searchState.divisionSearch}
                        placeholder="Select business division"
                        emptyMessage={
                          watch("business_id")
                            ? "No divisions found"
                            : "Select business first"
                        }
                        disabled={isPrivate || isClosed || isDeleted}
                        className={errors.division_id ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.division_id && (
                    <p className="text-red-500 text-sm">
                      {errors.division_id.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="assignee"
                    className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                  >
                    Assigned To
                  </Label>
                  <Controller
                    name="assigned_to"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={users.map((user) => ({
                          value: user.name!,
                          label: user.full_name!,
                        }))}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value)}
                        onSearch={(value) =>
                          updateSearchState("assigneeSearch", value)
                        }
                        searchKeyword={searchState.assigneeSearch}
                        placeholder="Select assignee"
                        disabled={isPrivate || isClosed || isDeleted}
                        className={errors.assigned_to ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.assigned_to && (
                    <p className="text-red-500 text-sm" id="assignee-error">
                      {errors.assigned_to.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="due_date"
                    className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                  >
                    Due Date
                  </Label>
                  <Controller
                    name="due_date"
                    control={control}
                    render={({ field }) => (
                      <input
                        min={format(new Date(), "yyyy-MM-dd")}
                        disabled={isEdit || isClosed || isDeleted}
                        type="date"
                        id="due_date"
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
                        aria-invalid={errors.due_date ? "true" : "false"}
                        aria-describedby={
                          errors.due_date ? "due-date-error" : undefined
                        }
                      />
                    )}
                  />
                  {errors.due_date && (
                    <p className="text-red-500 text-sm" id="due-date-error">
                      {errors.due_date.message}
                    </p>
                  )}
                </div>
                {isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="revised_due_date">Revised Due Date</Label>
                    <Controller
                      name="revised_due_date"
                      control={control}
                      render={({ field }) => (
                        <input
                          // min={format(new Date(), "yyyy-MM-dd")}
                          type="date"
                          id="revised_due_date"
                          disabled={isClosed || isDeleted}
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
                          aria-invalid={
                            errors.revised_due_date ? "true" : "false"
                          }
                          aria-describedby={
                            errors.revised_due_date
                              ? "revised-due-date-error"
                              : undefined
                          }
                        />
                      )}
                    />
                    {errors.revised_due_date && (
                      <p
                        className="text-red-500 text-sm"
                        id="revised-due-date-error"
                      >
                        {errors.revised_due_date.message}
                      </p>
                    )}
                  </div>
                )}
                {isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="effort">Effort (In Hrs)</Label>
                    <Controller
                      name="effort"
                      control={control}
                      render={({ field }) => (
                        <Input
                          disabled={isClosed || isDeleted}
                          id="effort"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter effort in hours"
                          autoComplete="off"
                          aria-invalid={errors.effort ? "true" : "false"}
                          aria-describedby={
                            errors.effort ? "effort-error" : undefined
                          }
                          onKeyDown={(e) => {
                            // Allow: backspace, delete, tab, escape, enter, decimal point
                            if (
                              [46, 8, 9, 27, 13, 110, 190].indexOf(
                                e.keyCode
                              ) !== -1 ||
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
                          {...field}
                        />
                      )}
                    />
                    {errors.effort && (
                      <p className="text-red-500 text-sm" id="effort-error">
                        {errors.effort.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 pb-10">
                <Label htmlFor="description">Description</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
                      readOnly={
                        isClosed ||
                        isDeleted ||
                        (isEdit && !isOwner) ||
                        (isEdit && isAlreadyEdited)
                      }
                      id="description"
                      className="h-[150px] max-h-[150px]"
                      placeholder="Enter task description"
                      theme="snow"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm">
                    {errors.description.message}
                  </p>
                )}
              </div>
              {isEdit && (
                <div className="space-y-2 pb-10">
                  <Label htmlFor="assignee_comments">Assignee Remarks</Label>
                  <Controller
                    name="assignee_comments"
                    control={control}
                    render={({ field }) => (
                      <ReactQuill
                        readOnly={isOwner}
                        id="assignee_comments"
                        className="h-[150px] max-h-[150px]"
                        placeholder="Enter assignee remarks"
                        theme="snow"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.assignee_comments && (
                    <p className="text-red-500 text-sm">
                      {errors.assignee_comments.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 pb-28">
                <FileAttachmentHandler
                  existingFiles={fileState.existingFiles}
                  disabled={isClosed || isDeleted}
                  onFilesChange={handleFilesChange}
                  onExistingFileRemove={handleRemoveExistingFile}
                  getAttachmentOwner={getAttachmentOwner}
                  currentUser={currentUser}
                  taskOwner={task?.owner}
                />

                <div className="flex items-center space-x-2 mt-6">
                  <Controller
                    name="no_automated_email_assignee"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        // disabled={isPrivate}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="no-automated-email-assignee"
                      />
                    )}
                  />
                  <Label htmlFor="no-automated-email-assignee">
                    No Automated Email For Assignee
                  </Label>
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <Controller
                    name="no_automated_email_assignor"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        // disabled={isPrivate}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="no-automated-email-assignor"
                      />
                    )}
                  />
                  <Label htmlFor="no-automated-email-assignor">
                    No Automated Email For Assignor
                  </Label>
                </div>

                <div className="mt-6">
                  {isEdit && <TaskTimeline taskId={taskId!} />}
                </div>
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
