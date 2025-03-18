import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Cloud, File, X, XIcon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./quill.css";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  useDocs,
  useSaveDoc,
  useDocDetail,
  useUpdateDoc,
  useDoc,
} from "@/hooks/doc";
import { useFilesUpload, useFileRemove } from "@/hooks/file";
import { JHTasksMaster } from "@/types/JHDigitrack/JHTasksMaster";
import { toast } from "sonner";
import { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import { JHDivisionMaster } from "@/types/JHDigitrack/JHDivisionMaster";
import { JHUserMaster } from "@/types/JHDigitrack/JHUserMaster";
import { cn } from "@/lib/utils";
import { useCurrentJhUser, useCurrentUser } from "@/hooks/auth";
import { Attachment } from "@/types/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskStatusSelector } from "./task-status-selector";
import { useAddTaskRemark } from "@/hooks/task";
import { queryClient } from "@/utils/query-client";

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const taskSchema = z
  .object({
    start_after: z.string(),
    task_name: z.string().min(1, "Task name is required"),
    private: z.boolean(),
    business_id: z.string().optional(),
    division_id: z.string().optional(),
    assigned_to: z.string().min(1, "Assignee is required"),
    due_date: z.string().refine(
      (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        return new Date(date) >= today;
      },
      {
        message: "Due date cannot be in the past",
      }
    ),
    description: z.string().optional(),
  })
  .transform((arg) => ({
    ...arg,
    due_date: format(arg.due_date, "yyyy-MM-dd"), // Use date-fns for consistent formatting
  }));

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskSheetProps {
  open: boolean;
  taskId?: string;
  onOpenChange: (open: boolean) => void;
  refetch?: () => Promise<unknown>;
}

export function TaskSheet({
  open,
  taskId,
  onOpenChange,
  refetch,
}: TaskSheetProps) {
  const isEdit = Boolean(taskId);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingFiles, setExistingFiles] = useState<Attachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    JHTasksMaster["status"] | null
  >(null);
  const [statusRemark, setStatusRemark] = useState("");

  const uploadFiles = useFilesUpload();
  const fileRemove = useFileRemove();
  const { data: currentJhUser } = useCurrentJhUser();
  const { data: currentUser } = useCurrentUser();

  const {
    data: taskDetails,
    isLoading: isTaskLoading,
    refetch: refetchTaskDetails,
  } = useDocDetail<JHTasksMaster>({
    doctype: "JH Tasks Master",
    name: taskId || "",
    disabled: !taskId,
  });

  // get the doc from the docDetails - use optional chaining to prevent errors
  const task = taskDetails?.docs?.[0];

  // Function to get default form values - memoized to avoid unnecessary recalculations
  const getDefaultValues = useCallback(
    () => ({
      start_after: "",
      task_name: "",
      private: false,
      business_id: "",
      division_id: "",
      assigned_to: "",
      due_date: format(new Date(), "yyyy-MM-dd"), // Format as string to match schema
      description: "",
    }),
    []
  );

  // form
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: getDefaultValues(),
  });

  // form control
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = form;

  // Compute button text based on state rather than using a separate state variable
  const buttonText = useMemo(() => {
    if (loading) {
      if (files.length > 0) return "Uploading Attachments";
      return isEdit ? "Saving Task" : "Creating Task";
    }
    return isEdit ? "Save Task" : "Create Task";
  }, [loading, isEdit, files.length]);

  // save and update doc
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const addTaskRemark = useAddTaskRemark();

  // Reset form when task details are loaded or when switching between create/edit modes
  useEffect(() => {
    if (task) {
      reset({
        start_after: task.start_after || "",
        task_name: task.task_name || "",
        private: task.private === 1,
        business_id: task.business_id || "",
        division_id: task.division_id || "",
        assigned_to: task.assigned_to || "",
        due_date: task.due_date || format(new Date(), "yyyy-MM-dd"),
        description: task.description || "",
      });

      // Set existing files when task is loaded
      if (taskDetails?.docinfo?.attachments) {
        setExistingFiles(taskDetails.docinfo.attachments);
      }
    } else if (open && !taskId) {
      // Reset form when opening in create mode
      reset(getDefaultValues());
      setFiles([]);
      setExistingFiles([]);
    }
  }, [task, taskDetails, open, taskId, reset, getDefaultValues]);

  // Reset form when sheet is closed
  useEffect(() => {
    if (!open) {
      reset(getDefaultValues());
      setFiles([]);
      setExistingFiles([]);
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

  useEffect(() => {
    if (isPrivate && currentJhUser?.name) {
      setValue("assigned_to", currentJhUser.name, { shouldValidate: true });
    }
  }, [isPrivate, currentJhUser, setValue]);

  useEffect(() => {
    if (assignedTo) {
      setValue("business_id", assigneeJhUser?.business, {
        shouldValidate: true,
      });
      setValue("division_id", assigneeJhUser?.division, {
        shouldValidate: true,
      });
    }
  }, [assignedTo, assigneeJhUser, setValue]);

  // Form submission handler with improved error handling
  const onSubmit = async (data: TaskFormData) => {
    try {
      setLoading(true);

      // Create document object
      const doc = {
        ...data,
        doctype: "JH Tasks Master",
        ...(taskId && { name: taskId }),
      };

      // Save or update the task
      let savedTaskName = taskId;
      if (isEdit && taskId) {
        await updateDoc.mutateAsync({
          doc,
          name: taskId,
          doctype: "JH Tasks Master",
        });
      } else {
        const savedTask = await saveDoc.mutateAsync({
          ...doc,
          created_by: currentJhUser?.name,
        });
        savedTaskName = savedTask.name;
      }

      // Upload files if any
      if (files.length > 0 && savedTaskName) {
        await uploadFiles.mutateAsync({
          files,
          docname: savedTaskName,
          doctype: "JH Tasks Master",
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

      // Success handling
      toast.success(
        isEdit ? "Task updated successfully" : "Task created successfully"
      );
      onOpenChange(false);
      await refetch?.();

      // Reset state after successful submission
      reset(getDefaultValues());
      setFiles([]);
      setExistingFiles([]);
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
  };

  // Function to open the dialog and store the pending status
  const openStatusChangeDialog = (newStatus: JHTasksMaster["status"]) => {
    setPendingStatus(newStatus);
    setStatusRemark(""); // Reset remark when opening dialog
    setStatusDialogOpen(true);
  };

  // Function to confirm status change with remark
  const confirmStatusChange = () => {
    if (pendingStatus) {
      handleStatusChange(pendingStatus);
      setStatusDialogOpen(false);
    }
  };

  const handleStatusChange = async (newStatus: JHTasksMaster["status"]) => {
    if (!task) return;

    try {
      await saveDoc.mutateAsync({
        ...task,
        status: newStatus,
        doctype: "JH Tasks Master",
      });
      await addTaskRemark.mutateAsync({
        task_id: task.name,
        comment: statusRemark,
        creator: currentJhUser?.name || "",
        type: "Status Change",
      });
      toast.success("Status updated successfully");
      await refetchTaskDetails();
      // Clear the remark after successful update
      setStatusRemark("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  // File handling with validation
  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File ${file.name} exceeds the maximum file size of 10MB`);
      return false;
    }
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files);

      // Validate files
      const validFiles = fileList.filter(validateFile);

      // Check total number of files
      if (files.length + validFiles.length > MAX_FILES) {
        toast.error(`You can upload a maximum of ${MAX_FILES} files`);
        return;
      }

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  // Improved drag and drop handling
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files);

      // Validate files
      const validFiles = fileList.filter(validateFile);

      // Check total number of files
      if (files.length + validFiles.length > MAX_FILES) {
        toast.error(`You can upload a maximum of ${MAX_FILES} files`);
        return;
      }

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveExistingFile = async (file: Attachment) => {
    if (!taskId) return;

    try {
      await fileRemove.mutateAsync({
        fid: file.name,
        dt: "JH Tasks Master",
        dn: taskId,
      });
      setExistingFiles((prev) => prev.filter((f) => f.name !== file.name));
      toast.success(`File ${file.file_name} removed successfully`);
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error(
        `Error removing file: ${(error as Error)?.message || "Unknown error"}`
      );
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { data: businesses = [] } = useDocs<JHBusinessMaster>({
    doctype: "JH Business Master",
    fields: ["business_id", "business_name"],
  });

  const { data: divisions = [] } = useDocs<JHDivisionMaster>({
    doctype: "JH Division Master",
    fields: ["division_id", "division_name"],
  });

  const { data: users = [] } = useDocs<JHUserMaster>({
    doctype: "JH User Master",
    fields: ["full_name", "name"],
  });

  // Add loading state for initial task fetch
  if (isEdit && isTaskLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-3xl px-5">
          <div className="flex items-center justify-center h-full">
            <p>Loading task details...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl px-5">
        <SheetHeader className="px-0 flex-row justify-between items-center">
          <SheetTitle className="text-2xl font-bold">
            {isEdit ? `Edit Task: ${task?.task_name || taskId}` : "Create Task"}
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center">
                {isEdit && isTaskLoading ? (
                  <Skeleton className="w-[180px] h-10" />
                ) : task ? (
                  <TaskStatusSelector
                    currentStatus={task.status!}
                    handleStatusChange={(value) =>
                      openStatusChangeDialog(value as JHTasksMaster["status"])
                    }
                    hideClosed={currentUser !== task.owner}
                  />
                ) : null}
              </div>

              {/* Status Change Dialog */}
              <Dialog
                open={statusDialogOpen}
                onOpenChange={setStatusDialogOpen}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Status Remark</DialogTitle>
                    <DialogDescription>
                      Please provide a remark for this status change.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea
                      placeholder="Enter your remark here..."
                      value={statusRemark}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setStatusRemark(e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setStatusDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmStatusChange}
                      className="bg-[#972e26] hover:bg-[#972e26]/90"
                    >
                      Update Status
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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

              <div className="flex items-center space-x-2">
                <Controller
                  name="private"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="private-task"
                    />
                  )}
                />
                <Label htmlFor="private-task">Private task</Label>
              </div>

              {!isPrivate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business">Business</Label>
                    <Controller
                      name="business_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "placeholder" ? "" : value)
                          }
                          value={field.value || "placeholder"}
                        >
                          <SelectTrigger id="business">
                            <SelectValue placeholder="Select business" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placeholder">
                              Select business
                            </SelectItem>
                            {businesses.map((business) => (
                              <SelectItem
                                key={business.business_id || business.name}
                                value={business.business_id || ""}
                              >
                                {business.business_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "placeholder" ? "" : value)
                          }
                          value={field.value || "placeholder"}
                        >
                          <SelectTrigger id="division">
                            <SelectValue placeholder="Select business division" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placeholder">
                              Select business division
                            </SelectItem>
                            {divisions.map((division) => (
                              <SelectItem
                                key={division.division_id || division.name}
                                value={division.division_id || ""}
                              >
                                {division.division_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.division_id && (
                      <p className="text-red-500 text-sm">
                        {errors.division_id.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "placeholder" ? "" : value)
                        }
                        value={field.value || "placeholder"}
                        disabled={isPrivate}
                      >
                        <SelectTrigger
                          id="assignee"
                          aria-invalid={errors.assigned_to ? "true" : "false"}
                          aria-describedby={
                            errors.assigned_to ? "assignee-error" : undefined
                          }
                        >
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder">
                            Select assignee
                          </SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.name} value={user.name}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              </div>

              <div className="space-y-2 pb-10">
                <Label htmlFor="description">Description</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
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

              <div className="space-y-2 pb-28">
                <Label>Attachments</Label>
                <div className="flex space-x-4 mt-2 max-w-2xl overflow-x-auto shadow-sm">
                  {existingFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex flex-col items-center gap-1 w-36"
                    >
                      <div className="w-full h-24 border rounded-md">
                        {file.file_url &&
                        file.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={file.file_url}
                            alt={file.file_name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <File className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between w-full items-center">
                        <div
                          className="text-sm text-gray-500 truncate px-1 w-full"
                          title={file.file_name}
                        >
                          {file.file_name}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-min"
                          style={{ paddingInline: 0 }}
                          onClick={() => handleRemoveExistingFile(file)}
                          disabled={fileRemove.isPending}
                          aria-label={`Remove file ${file.file_name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center gap-1 w-36"
                    >
                      <div className="w-full h-24 border rounded-md">
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover rounded-md"
                            onLoad={() =>
                              URL.revokeObjectURL(URL.createObjectURL(file))
                            }
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <File className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between w-full items-center">
                        <div
                          className="text-sm text-gray-500 truncate px-1 w-full"
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-min"
                          style={{ paddingInline: 0 }}
                          onClick={() => handleRemoveNewFile(index)}
                          aria-label={`Remove file ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <ScrollBar orientation="horizontal" />
                </div>

                <div
                  className={cn(
                    "border-2 border-dashed border-[#cbd5e1] rounded-md p-8 text-center transition-colors",
                    dragActive && "border-[#972e26] bg-[#972e26]/5"
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  aria-label="File upload area"
                >
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Cloud className="h-10 w-10 mx-auto mb-2 text-[#94a3b8]" />
                    <div className="text-sm text-[#64748b]">
                      Drag your file(s) or{" "}
                      <span className="text-[#972e26] cursor-pointer">
                        browse
                      </span>
                    </div>
                    <div className="text-xs text-[#94a3b8] mt-2">
                      You can upload up to {MAX_FILES} files, with a maximum
                      size of 10 MB each.
                    </div>
                  </label>
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
                        setFiles([]);
                        setExistingFiles([]);
                      }}
                      type="button"
                    >
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button
                    type="submit"
                    className="bg-[#972e26] hover:bg-[#972e26]/90 w-full"
                    disabled={loading || isSubmitting}
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
