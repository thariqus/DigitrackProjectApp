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
import {
  useSaveDoc,
  useDocDetail,
  useUpdateDoc,
  DocFilters,
  useDocs,
} from "@/hooks/doc";
import { useFilesUpload, useFileRemove } from "@/hooks/file";
import { toast } from "sonner";
import type { JHBusinessMaster } from "@/types/JHDigitrack/JHBusinessMaster";
import type { JHDivisionMaster } from "@/types/JHDigitrack/JHDivisionMaster";
import { useCurrentJhUser, useCurrentUser } from "@/hooks/auth";
import type { Attachment } from "@/types/doc";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditStatusSelector } from "../ui/AuditStatusSelector";
import { queryClient } from "@/utils/query-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChangelogRemarkDialog from "./ChangeLogRemarkDialog";
import FileAttachmentHandler from "./FileAttachmentHandler";
import { JHAudits } from "@/types/JHDigitrack/JHAudits";
import { useAddAuditRemark } from "@/hooks/audits";
import { Switch } from "@/components/ui/switch";
// ==========================================
// COMPONENT PROPS INTERFACE
// ==========================================
interface AuditSheetProps {
  open: boolean;
  auditId?: string;
  onOpenChange: (open: boolean) => void;
  refetch?: () => Promise<unknown>;
}

export function AuditSheet({
  open,
  auditId,
  onOpenChange,
  refetch,
}: AuditSheetProps) {
  const isEdit = Boolean(auditId);

  // ==========================================
  // FORM VALIDATION SCHEMA
  // ==========================================
  /**
   * Audit form validation schema
   * Validates all form inputs before submission
   */
  const auditSchema = z
    .object({
      audit_name: z
        .string()
        .min(1, "Audit name is required")
        .max(140, "Audit name cannot be longer than 140 characters"),
      audit_description: z.string().optional(),
      additional_comments: z.string().optional(),
      business: z.string().optional(),
      division: z.string().optional(),
      start_date: z.string().optional(),
      file_name: z.string().optional(),
      folder_name: z.string().optional(),
      visible_to_all: z.boolean().optional(),
    })
    .transform((arg) => ({
      ...arg,
      start_date: format(arg.start_date!, "yyyy-MM-dd"),
    }));

  /**
   * Type definition for the audit form data
   */
  type AuditFormData = z.infer<typeof auditSchema>;

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
  });

  const [changelogState, setChangelogState] = useState({
    dialogOpen: false,
    type: null as "Status Change" | "Reassign" | null,
    pendingStatus: null as JHAudits["status"] | null,
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
    data: auditDetails,
    isLoading: isAuditLoading,
    refetch: refetchAuditDetails,
  } = useDocDetail<JHAudits>({
    doctype: "JH Audit Master",
    name: auditId || "",
    disabled: !auditId,
  });

  // ==========================================
  // DERIVED STATE & COMPUTATIONS
  // ==========================================
  // get the doc from the docDetails - use optional chaining to prevent errors
  const audit = auditDetails?.docs?.[0];
  const isCompleted = audit?.status === "Completed";
  const isOwner = audit?.owner === currentUser;

  // Function to get default form values - memoized to avoid unnecessary recalculations
  const getDefaultValues = useCallback(
    () => ({
      audit_name: "",
      audit_description: "",
      additional_comments: "",
      business: "",
      division: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      file_name: "",
      folder_name: "",
      visible_to_all: true,
    }),
    []
  );

  // ==========================================
  // FORM SETUP
  // ==========================================
  // form
  const form = useForm<AuditFormData>({
    resolver: zodResolver(auditSchema),
    defaultValues: getDefaultValues(),
    mode: "onBlur", // Validate fields when they lose focus for better UX
    reValidateMode: "onChange", // Re-validate when the user makes changes
  });

  // form control
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
    watch,
    reset,
  } = form;

  // Compute button text based on state rather than using a separate state variable
  const buttonText = useMemo(() => {
    if (loading) {
      if (fileState.files.length > 0) return "Uploading Attachments";
      return isEdit ? "Saving Audit" : "Creating Audit";
    }
    return isEdit ? "Save Audit" : "Create Audit";
  }, [loading, isEdit, fileState.files.length]);

  // ==========================================
  // API MUTATIONS
  // ==========================================
  // save and update doc
  const saveDoc = useSaveDoc();
  const updateDoc = useUpdateDoc();
  const addAuditRemark = useAddAuditRemark();

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
  // Reset form when audit details are loaded or when switching between create/edit modes
  useEffect(() => {
    if (audit) {
      reset({
        audit_name: audit.audit_name || "",
        audit_description: audit.audit_description || "",
        additional_comments: audit.additional_comments || "",
        business: audit.business || "",
        division: audit.division || "",
        start_date: audit.start_date || format(new Date(), "yyyy-MM-dd"),
        file_name: audit.file_name || "",
        folder_name: audit.folder_name || "",
        visible_to_all: audit.visible_to_all === 1 ? true : false,
      });

      // Set existing files when audit is loaded
      if (auditDetails?.docinfo?.attachments) {
        setFileState((prev) => ({
          ...prev,
          existingFiles: auditDetails.docinfo.attachments,
        }));
      }
    } else if (open && !auditId) {
      // Reset form when opening in create mode
      reset(getDefaultValues());
      setFileState({
        files: [],
        existingFiles: [],
      });
    }
  }, [audit, auditDetails, open, auditId, reset, getDefaultValues]);

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
   * Handles the audit saving process, including file uploads
   * @param data Form data to save
   * @returns Promise that resolves when the audit is saved
   */
  const saveAudit = useCallback(
    async (data: AuditFormData) => {
      try {
        setLoading(true);

        // Create document object
        const doc = {
          ...data,
          doctype: "JH Audit Master",
          ...(auditId && { name: auditId }),
        };

        // Save or update the audit
        let savedAuditName = auditId;
        if (isEdit && auditId) {
          await updateDoc.mutateAsync({
            doc,
            name: auditId,
            doctype: "JH Audit Master",
          });
        } else {
          const savedAudit = await saveDoc.mutateAsync({
            ...doc,
            created_by: currentJhUser?.name,
          });
          savedAuditName = savedAudit.name;
        }

        // Upload files if any
        if (fileState.files.length > 0 && savedAuditName) {
          await uploadFiles.mutateAsync({
            files: fileState.files,
            docname: savedAuditName,
            doctype: "JH Audit Master",
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
          queryKey: ["team-audits"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["Docs"],
        });
        await queryClient.invalidateQueries({
          queryKey: [
            "DocInfo",
            {
              doctype: "JH Audit Master",
              name: auditId,
            },
          ],
        });

        // Success handling
        toast.success(
          isEdit ? "Audit updated successfully" : "Audit created successfully"
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
        console.error("Audit submission error:", error);
        toast.error(
          isEdit
            ? `Error updating audit: ${
                (error as Error)?.message || "Unknown error"
              }`
            : `Error creating audit: ${
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
      auditId,
      updateDoc,
      uploadFiles,
    ]
  );

  // Form submission handler with improved error handling
  const onSubmit = useCallback(
    async (data: AuditFormData) => {
      await saveAudit(data);
    },
    [saveAudit]
  );

  // ==========================================
  // STATUS MANAGEMENT FUNCTIONS
  // ==========================================
  // Function to open the dialog and store the pending status
  const openStatusChangeDialog = useCallback(
    (newStatus: JHAudits["status"]) => {
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
  // DATA FILTERING & QUERYING
  // ==========================================
  // Read selected values from form for memoized filters
  const selectedBusiness = watch("business");

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

  // ==========================================
  // STATUS CHANGE HANDLERS
  // ==========================================
  const handleStatusChange = useCallback(
    async (newStatus: JHAudits["status"]) => {
      if (!audit) return;

      try {
        const updatedAudit = {
          ...audit,
          status: newStatus,
          doctype: "JH Audit Master",
        };

        if (newStatus === "Completed") {
          updatedAudit.completion_date = format(
            changelogState.completionDate,
            "yyyy-MM-dd"
          );
        }

        await saveDoc.mutateAsync(updatedAudit);
        await addAuditRemark.mutateAsync({
          audit_id: audit.name,
          comment: changelogState.comment,
          creator: currentJhUser?.name || "",
          type: "Status Change",
          remark: `changed status from ${audit.status} to ${newStatus}`,
        });

        toast.success("Status updated successfully");
        await refetchAuditDetails();

        // Clear the remark after successful update
        setChangelogState((prev) => ({
          ...prev,
          comment: "",
          completionDate: format(new Date(), "yyyy-MM-dd"),
        }));

        await queryClient.invalidateQueries({
          queryKey: ["team-audits"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["task-change-logs", audit.name],
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to update status");
      }
    },
    [
      audit,
      changelogState.completionDate,
      changelogState.comment,
      saveDoc,
      addAuditRemark,
      currentJhUser?.name,
      refetchAuditDetails,
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
      if (!auditId) return;

      try {
        await fileRemove.mutateAsync({
          fid: file.name,
          dt: "JH Audit Master",
          dn: auditId,
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
              doctype: "JH Audit Master",
              name: auditId,
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
    [fileRemove, auditId]
  );

  // ==========================================
  // LOADING STATE HANDLING
  // ==========================================
  // Add loading state for initial task fetch
  if (
    isEdit &&
    isAuditLoading &&
    isBusinessesLoading &&
    isDivisionsLoading &&
    isCurrentJhUserLoading &&
    isCurrentUserLoading
  ) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-h-3xl px-5">
          <div className="flex items-center justify-center h-full">
            <p>Loading audit details...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const attachmentLogs = auditDetails?.docinfo?.attachment_logs || [];

  // get attachment owner from attachment logs by matching file name with content :check docInfo api response
  const getAttachmentOwner = (fileName: string) => {
    const log = attachmentLogs.find((log) => log.content.includes(fileName));
    return log?.owner;
  };

  const isAlreadyEdited = audit?.creation !== audit?.modified;

  // ==========================================
  // COMPONENT RENDER
  // ==========================================
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl px-5">
        <SheetHeader className="px-0 flex-row justify-between items-center">
          <SheetTitle className="text-2xl font-bold">
            {isEdit
              ? `Edit Audit: ${audit?.audit_name || auditId}`
              : "Create Audit"}
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
              {`This audit is ${
                isCompleted ? "completed" : "in the recycle bin"
              }. You cannot edit it.`}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-screen">
          <SheetDescription className="h-[calc(100vh-100px)]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center">
                {isEdit && isAuditLoading ? (
                  <Skeleton className="w-[180px] h-10" />
                ) : audit ? (
                  <AuditStatusSelector
                    audit={audit!}
                    handleStatusChange={(value) =>
                      openStatusChangeDialog(value as JHAudits["status"])
                    }
                  />
                ) : null}
              </div>
              <ChangelogRemarkDialog
                auditId={auditId!}
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
              />
              <div className="space-y-2">
                <Label
                  htmlFor="audit-name"
                  className="after:content-['*'] after:text-[#972e26] after:ml-0.5"
                >
                  Audit Name
                </Label>
                <Controller
                  name="audit_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      disabled={
                        isCompleted ||
                        (isEdit && !isOwner) ||
                        (isEdit && isAlreadyEdited)
                      }
                      id="audit-name"
                      placeholder="Enter audit name"
                      autoComplete="off"
                      aria-invalid={errors.audit_name ? "true" : "false"}
                      aria-describedby={
                        errors.audit_name ? "audit-name-error" : undefined
                      }
                      {...field}
                    />
                  )}
                />
                {errors.audit_name && (
                  <p className="text-red-500 text-sm" id="audit-name-error">
                    {errors.audit_name.message}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="visible_to_all"
                  control={control}
                  render={({ field }) => (
                    <Switch
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
                    ? "Task visible to all"
                    : "Task visible to creator/assignee"}
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business">Business</Label>
                  <Controller
                    name="business"
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
                        disabled={isCompleted}
                        className={errors.business ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.business && (
                    <p className="text-red-500 text-sm">
                      {errors.business.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Controller
                    name="division"
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
                          watch("business")
                            ? "No divisions found"
                            : "Select business first"
                        }
                        disabled={isCompleted}
                        className={errors.division ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.division && (
                    <p className="text-red-500 text-sm">
                      {errors.division.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="folder_name">Folder Name</Label>
                  <Controller
                    name="folder_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        disabled={isCompleted || (isEdit && !isOwner)}
                        id="folder_name"
                        placeholder="Enter folder name"
                        autoComplete="off"
                        aria-invalid={errors.folder_name ? "true" : "false"}
                        aria-describedby={
                          errors.folder_name ? "folder-name-error" : undefined
                        }
                        {...field}
                      />
                    )}
                  />
                  {errors.folder_name && (
                    <p className="text-red-500 text-sm">
                      {errors.folder_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file_name">File Name</Label>
                  <Controller
                    name="file_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        disabled={isCompleted || (isEdit && !isOwner)}
                        id="file_name"
                        placeholder="Enter file name"
                        autoComplete="off"
                        aria-invalid={errors.file_name ? "true" : "false"}
                        aria-describedby={
                          errors.file_name ? "file-name-error" : undefined
                        }
                        {...field}
                      />
                    )}
                  />
                  {errors.file_name && (
                    <p className="text-red-500 text-sm">
                      {errors.file_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pb-10">
                <Label htmlFor="description">Description</Label>
                <Controller
                  name="audit_description"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
                      readOnly={
                        isCompleted ||
                        (isEdit && !isOwner) ||
                        (isEdit && isAlreadyEdited)
                      }
                      id="audit_description"
                      className="h-[150px] max-h-[150px]"
                      placeholder="Enter audit description"
                      theme="snow"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.audit_description && (
                  <p className="text-red-500 text-sm">
                    {errors.audit_description.message}
                  </p>
                )}
              </div>
              {isEdit && (
                <div className="space-y-2 pb-10">
                  <Label htmlFor="additional_comments">
                    Additional Comments
                  </Label>
                  <Controller
                    name="additional_comments"
                    control={control}
                    render={({ field }) => (
                      <ReactQuill
                        readOnly={isCompleted || (isEdit && !isOwner)}
                        id="additional_comments"
                        className="h-[150px] max-h-[150px]"
                        placeholder="Enter additional comments"
                        theme="snow"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.additional_comments && (
                    <p className="text-red-500 text-sm">
                      {errors.additional_comments.message}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2 pb-28">
                <FileAttachmentHandler
                  existingFiles={fileState.existingFiles}
                  disabled={isCompleted}
                  onFilesChange={handleFilesChange}
                  onExistingFileRemove={handleRemoveExistingFile}
                  getAttachmentOwner={getAttachmentOwner}
                  currentUser={currentUser}
                  auditOwner={audit?.owner}
                />
                <div className="mt-6">
                  {/* {isEdit && <AuditTimeline auditId={auditId!} />} */}
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
