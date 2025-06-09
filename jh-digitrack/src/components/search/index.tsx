import * as z from "zod";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody } from "@/components/ui/table";
import {
  useGlobalSearch,
  useStatusSearch,
  useUserSearch,
} from "@/hooks/search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import SearchTableHeader from "./ui/SearchTableHeader";
import { SearchRow, SearchTaskRow } from "./ui/SearchRow";
import { useNavigate } from "react-router";
import { SeatchResults } from "@/types/search";
import { useCurrentJhUser } from "@/hooks/auth";
import { TaskDetailSheet } from "../tasks/task-detail-sheet";
import { toast } from "sonner";
import { Loader } from "lucide-react";

function Search() {
  const [searchState, setSearchState] = useState({
    assigneeSearch: "",
    assignorSearch: "",
    statusSearch: "",
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    undefined
  );
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const searchSchema = z.object({
    task_name: z.string().optional(),
    audit_name: z.string().optional(),
    meeting_name: z.string().optional(),
    assigned_to: z.string().optional(),
    assigned_by: z.string().optional(),
    due_date_from: z.string().optional(),
    due_date_to: z.string().optional(),
    status: z.string().optional(),
    created_date_from: z.string().optional(),
    created_date_to: z.string().optional(),
  });

  type SearchFormData = z.infer<typeof searchSchema>;
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      task_name: "",
      audit_name: "",
      meeting_name: "",
      assigned_to: "",
      assigned_by: "",
      due_date_from: "",
      due_date_to: "",
      status: "",
      created_date_from: "",
      created_date_to: "",
    },
  });

  const updateSearchState = (
    field: keyof typeof searchState,
    value: string
  ) => {
    setSearchState((prev) => ({ ...prev, [field]: value }));
  };

  const { users: assigneeUsers } = useUserSearch(searchState.assigneeSearch);
  const { users: assignorUsers } = useUserSearch(searchState.assignorSearch);
  const { status: statusOptions } = useStatusSearch(searchState.statusSearch);

  const { data: currentJHUser } = useCurrentJhUser();
  const { mutateAsync, isPending } = useGlobalSearch();
  const [results, setResults] = useState<SeatchResults>([]);
  const { control, handleSubmit, reset } = form;

  const onSubmit = async (data: SearchFormData) => {
    await mutateAsync(
      {
        reporting_to: currentJHUser?.name,
        ...data,
      },
      {
        onSuccess: (data) => {
          if (data?.message?.message) {
            toast.warning(data?.message?.message);
          }
          setResults(data?.message?.data as SeatchResults);
        },
      }
    );
  };
  const navigate = useNavigate();

  const handleRowClick = useCallback((id: string, type: string) => {
    console.log(id);
    if (type === "tasks") {
      setSelectedTaskId(id);
      setIsTaskDetailOpen(true);
    } else {
      navigate(`/jh-digitrack/${type}/${id}/expanded`);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Global Search</h1>
        <p className="text-sm text-muted-foreground">
          Search all tasks, meetings, and audits.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4">
          <div className="space-y-2">
            <Label htmlFor="task_name">Task Name</Label>
            <Controller
              name="task_name"
              control={control}
              render={({ field }) => (
                <Input
                  id="task_name"
                  placeholder="Enter task name"
                  autoComplete="off"
                  {...field}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting_name">Meeting Name</Label>
            <Controller
              name="meeting_name"
              control={control}
              render={({ field }) => (
                <Input
                  id="meeting_name"
                  placeholder="Enter meeting name"
                  autoComplete="off"
                  {...field}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit_name">Audit Name</Label>
            <Controller
              name="audit_name"
              control={control}
              render={({ field }) => (
                <Input
                  id="audit_name"
                  placeholder="Enter audit name"
                  autoComplete="off"
                  {...field}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assignee</Label>
            <Controller
              name="assigned_to"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={assigneeUsers.map((user) => ({
                    value: user.value!,
                    label: user.label!,
                  }))}
                  value={field.value || ""}
                  onChange={(value) => field.onChange(value)}
                  onSearch={(value) =>
                    updateSearchState("assigneeSearch", value)
                  }
                  searchKeyword={searchState.assigneeSearch}
                  placeholder="Select assignee"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_by">Assignor</Label>
            <Controller
              name="assigned_by"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={assignorUsers.map((user) => ({
                    value: user.value!,
                    label: user.label!,
                  }))}
                  value={field.value || ""}
                  onChange={(value) => field.onChange(value)}
                  onSearch={(value) =>
                    updateSearchState("assignorSearch", value)
                  }
                  searchKeyword={searchState.assignorSearch}
                  placeholder="Select assignor"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={statusOptions}
                  value={field.value || ""}
                  onChange={(value) => field.onChange(value)}
                  onSearch={(value) => updateSearchState("statusSearch", value)}
                  searchKeyword={searchState.statusSearch}
                  placeholder="Select Status"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date_from">Due Date From</Label>
            <Controller
              name="due_date_from"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  id="due_date_from"
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
                    "p-3 text-left font-normal w-full h-9 border rounded-sm",
                    !field.value && "text-muted-foreground"
                  )}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date_to">Due Date To</Label>
            <Controller
              name="due_date_to"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  id="due_date_to"
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
                    "p-3 text-left font-normal w-full h-9 border rounded-sm",
                    !field.value && "text-muted-foreground"
                  )}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="created_date_from">Created Date From</Label>
            <Controller
              name="created_date_from"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  id="created_date_from"
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
                    "p-3 text-left font-normal w-full h-9 border rounded-sm",
                    !field.value && "text-muted-foreground"
                  )}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="created_date_to">Created Date To</Label>
            <Controller
              name="created_date_to"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  id="created_date_to"
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
                    "p-3 text-left font-normal w-full h-9 border rounded-sm",
                    !field.value && "text-muted-foreground"
                  )}
                />
              )}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="reset"
            variant={"outline"}
            onClick={() => {
              reset();
              setResults([]);
            }}
          >
            Reset
          </Button>
          <Button type="submit">Search</Button>
        </div>
      </form>
      {results?.length > 0 ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
          <div className="rounded-md border mt-4">
            <Table className="w-full table-fixed">
              <SearchTableHeader />
              <TableBody>
                {results.map((result, i) => {
                  if (result.type === "tasks") {
                    return (
                      <SearchTaskRow
                        key={result.id}
                        result={result}
                        index={i}
                        onRowClick={handleRowClick}
                      />
                    );
                  } else {
                    return (
                      <SearchRow
                        key={result.id}
                        result={result}
                        index={i}
                        onRowClick={handleRowClick}
                      />
                    );
                  }
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : !isPending ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
          <p>No results found</p>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <Loader className="animate-spin text-gray-600" />
        </div>
      )}

      {/* Task detail sheet */}
      <TaskDetailSheet
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        taskId={selectedTaskId}
      />
    </div>
  );
}

export default Search;
