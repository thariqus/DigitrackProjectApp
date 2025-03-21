import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentJhUser } from "@/hooks/auth";
import { useAddComment, useDocDetail } from "@/hooks/doc";
import { useTaskRemarks } from "@/hooks/task";
import { JHTasksMaster } from "@/types/JHDigitrack/JHTasksMaster";
import { queryClient } from "@/utils/query-client";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { useState } from "react";

type TaskTimelineProps = {
  taskId: string;
};

export default function TaskTimeline({ taskId }: TaskTimelineProps) {
  const { data: currentJhUser } = useCurrentJhUser();
  const [comment, setComment] = useState("");
  const addCommentMutation = useAddComment();

  const { data: taskDetailed, isLoading: isLoadingTaskInfo } =
    useDocDetail<JHTasksMaster>({
      doctype: "JH Tasks Master",
      name: taskId || "",
      disabled: !taskId,
    });

  const { data: remarks = [], isLoading: isLoadingRemarks } =
    useTaskRemarks(taskId);

  const commentLogs = taskDetailed?.docinfo?.comments || [];
  const remarkLogs =
    remarks?.message?.map(
      (remark: {
        comment: string;
        creator: string;
        type: string;
        commented_at: string;
      }) => ({
        owner: remark.creator,
        comment_type: remark.type,
        content: remark.comment,
        creation: remark.commented_at || "",
      })
    ) || [];

  const timelineLogs = [...commentLogs, ...remarkLogs].sort(
    (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime()
  );

  const handleAddComment = () => {
    if (!comment.trim() || !taskId) return;

    addCommentMutation.mutate(
      {
        reference_doctype: "JH Tasks Master",
        reference_name: taskId,
        content: comment,
        comment_by: currentJhUser?.full_name,
        comment_email: currentJhUser?.email,
      },
      {
        onSuccess: () => {
          setComment("");
          // Refetch task details to update the comments
          if (taskId) {
            queryClient.invalidateQueries({
              queryKey: [
                "DocInfo",
                {
                  doctype: "JH Tasks Master",
                  name: taskId,
                },
              ],
            });
          }
        },
      }
    );
  };

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">Timeline</div>

      {isLoadingTaskInfo || isLoadingRemarks ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {timelineLogs.map((log, index) => (
            <div key={index} className="border rounded-md p-4">
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{log.owner}</span>
                  <span className="text-xs text-gray-500">
                    {log.creation
                      ? formatDistanceToNow(new Date(log.creation), {
                          addSuffix: true,
                        })
                      : "—"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  <span>{log.comment_type || "Action"}</span>
                </div>
              </div>
              <p
                className="text-sm text-gray-500"
                dangerouslySetInnerHTML={{
                  __html: log.content,
                }}
              ></p>
            </div>
          ))}
        </div>
      )}
      {/* Comment input - replace the disabled input with the enabled one */}
      <div className="flex gap-2 mt-4">
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter your comment"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <Button
          onClick={handleAddComment}
          size="icon"
          className="bg-red-700 hover:bg-red-800"
          disabled={addCommentMutation.isPending || !comment.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
