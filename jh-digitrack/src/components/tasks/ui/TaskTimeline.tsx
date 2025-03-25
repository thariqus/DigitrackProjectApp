"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentJhUser, useJhUser } from "@/hooks/auth";
import { useAddComment, useDocDetail, useDocTypeMeta } from "@/hooks/doc";
import { useTaskChangeLog } from "@/hooks/task";
import type { JHTasksMaster } from "@/types/JHDigitrack/JHTasksMaster";
import { queryClient } from "@/utils/query-client";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: taskMeta, isLoading: isTaskMetaLoading } =
    useDocTypeMeta("JH Tasks Master");

  const { data: changelog = [], isLoading: isLoadingChangelog } =
    useTaskChangeLog(taskId);

  const commentLogs =
    taskDetailed?.docinfo?.comments?.map((log) => ({
      ...log,
      owner_user_id: log.owner,
    })) || [];

  const versionLogs = [];
  if (!isTaskMetaLoading && !isLoadingTaskInfo) {
    const docChanges =
      taskDetailed?.docinfo?.versions
        ?.map((log) => ({
          ...log,
          owner_user_id: log.owner,
          data: JSON.parse(log.data),
        }))
        .filter((log) => log.data.changed.length > 0) || [];

    //TODO Complete this
    for (const log of docChanges) {
      const changelog = log.data.changed;
      for (const clog of changelog) {
        const field = taskMeta?.fields?.find(
          (field: { fieldname: string }) => field.fieldname === clog[0]
        );
        versionLogs.push({
          ...log,
          comment_type: "Version Change",
          content: `changed <b>${field?.label}</b> from ${clog[1]} to ${clog[2]}`,
        });
      }
    }
  }

  const changelogs =
    changelog?.message?.map(
      (remark: {
        comment: string;
        creator: string;
        type: string;
        commented_at: string;
        remark: string;
      }) => ({
        owner: remark.creator,
        comment_type: remark.type,
        content: remark.comment,
        creation: remark.commented_at || "",
        remark: remark.remark || "",
      })
    ) || [];

  const timelineLogs = [...commentLogs, ...changelogs].sort(
    (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime()
  );

  const activityLogs = timelineLogs.filter((log) =>
    ["Status Change", "Reassign", "Version Change"].includes(log.comment_type)
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

  const TimelineItem = ({
    log,
  }: {
    log: {
      owner: string;
      creation: string;
      comment_type: string;
      content: string;
      remark: string;
      owner_user_id: string;
    };
  }) => {
    const { data: owner } = useJhUser(log.owner_user_id);

    return (
      <div className="relative pl-6 pb-6">
        {/* Bullet point */}
        <div className="absolute left-0 top-2 w-2 h-2 bg-red-200 rounded-full"></div>

        {/* Content */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-medium">
              {owner?.full_name ? owner?.full_name : log.owner}
            </span>
            <span className="text-sm text-gray-500">
              {["Status Change", "Reassign", "Version Change"].includes(
                log.comment_type
              )
                ? log.remark
                : "commented"}
            </span>
            <span className="text-xs text-gray-400">
              {log.creation
                ? (() => {
                    const creationDate = new Date(log.creation);
                    const now = new Date();
                    const diffInHours =
                      (now.getTime() - creationDate.getTime()) /
                      (1000 * 60 * 60);

                    if (diffInHours < 1) {
                      return formatDistanceToNow(creationDate, {
                        addSuffix: true,
                      });
                    } else if (diffInHours < 24 * 365) {
                      return creationDate.toLocaleString("en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      });
                    } else {
                      return creationDate.toLocaleString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      });
                    }
                  })()
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
            <p
              className="text-sm text-gray-600"
              dangerouslySetInnerHTML={{
                __html: log.content,
              }}
            ></p>
          </div>
        </div>
      </div>
    );
  };

  const renderSkeletonItem = (index: number) => (
    <div key={index} className="relative pl-6 pb-6">
      <Skeleton className="absolute left-0 top-1.5 w-3 h-3 rounded-full" />
      {index < 2 && (
        <div className="absolute left-1.5 top-4 bottom-0 w-0.5 bg-gray-200"></div>
      )}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-full mt-1" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="text-md font-bold">Timeline</div>
          <TabsList className="bg-rose-50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          {isLoadingTaskInfo || isLoadingChangelog || isTaskMetaLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => renderSkeletonItem(i))}
            </div>
          ) : (
            <div>
              {timelineLogs.length > 0 ? (
                timelineLogs.map((log, index) => (
                  <TimelineItem key={index} log={log} />
                ))
              ) : (
                <div className="text-center text-gray-500">No activity</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          {isLoadingTaskInfo || isLoadingChangelog || isTaskMetaLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => renderSkeletonItem(i))}
            </div>
          ) : (
            <div>
              {activityLogs.length > 0 ? (
                activityLogs.map((log, index) => (
                  <TimelineItem key={index} log={log} />
                ))
              ) : (
                <div className="text-center text-gray-500">No activity</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-0">
          {isLoadingTaskInfo || isLoadingChangelog || isTaskMetaLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => renderSkeletonItem(i))}
            </div>
          ) : (
            <div>
              {commentLogs.length > 0 ? (
                commentLogs.map((log, index) => (
                  <TimelineItem key={index} log={log} />
                ))
              ) : (
                <div className="text-center text-gray-500">No comments</div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Comment input */}
      <div className="flex gap-2 mt-6 pt-4 border-t">
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
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
