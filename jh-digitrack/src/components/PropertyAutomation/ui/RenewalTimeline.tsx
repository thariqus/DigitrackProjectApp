import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, MessageSquare, User, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useJhUser, useCurrentJhUser } from "@/hooks/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { PropertyAuditTrail } from "@/types/JHDigitrack/JHPropertyAutomation";

interface RenewalTimelineProps {
  renewalId: string;
  defaultOpen?: boolean;
}

export default function RenewalTimeline({
  renewalId,
  defaultOpen = false,
}: RenewalTimelineProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [auditTrail, setAuditTrail] = useState<PropertyAuditTrail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [comment, setComment] = useState("");
  const { data: currentJhUser } = useCurrentJhUser();

  //  Fetch audit trail
  const fetchAuditTrail = () => {
    if (!renewalId) return;

    setIsLoading(true);

    fetch(
      `/api/method/jh_digitrack.api.property_management.get_renewal_audit_trail?renewal_id=${renewalId}`,
      { credentials: "include" }
    )
      .then((res) => res.json())
      .then((data) => {
        setAuditTrail(data.message?.audit_trail || []);
      })
      .catch((err) => {
        console.error(err);
        setAuditTrail([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAuditTrail();
  }, [renewalId]);

  // Sort latest first
  const sortedAuditTrail = [...auditTrail].sort(
    (a, b) =>
      new Date(b.action_time).getTime() -
      new Date(a.action_time).getTime()
  );

  const activityLogs = sortedAuditTrail.filter(
    (log) => log.action !== "Comment"
  );

  const commentLogs = sortedAuditTrail.filter(
    (log) => log.comments && log.comments.trim()
  );
console.log(auditTrail,"audit")

  // const handleAddComment = () => {
  //   if (!comment.trim()) return;

  //   fetch(
  //     "/api/method/jh_digitrack.api.property_management.apply_workflow_action",
  //     {
  //       method: "POST",
  //       credentials: "include",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         renewal_id: renewalId,
  //         action: "comment", 
  //         comment: comment,
  //       }),
  //     }
  //   )
  //     .then(() => {
  //       setComment("");
  //       fetchAuditTrail(); // refresh timeline
  //     })
  //     .catch((err) => console.error(err));
  // };

  const TimelineItem = ({ log }: { log: PropertyAuditTrail }) => {
    const { data: user } = useJhUser(log.user);

    return (
      <div className="relative pl-6 pb-6">
        {/* Dot */}
        <div className="absolute left-0 top-2 w-2 h-2 bg-red-400 rounded-full"></div>

        <div className="flex flex-col space-y-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-sm">
                {user?.full_name || log.user}
              </span>
              {/* <Badge variant="secondary" className="text-xs">
                {log.role?.toUpperCase() || "USER"}
              </Badge> */}
            </div>

            <span className="text-xs text-gray-500">
              {log.action_time
                ? formatDistanceToNow(new Date(log.action_time), {
                    addSuffix: true,
                  })
                : "—"}
            </span>
          </div>

          {/* Action */}
          <div className="text-sm font-medium text-gray-900">
            {log.action}
          </div>

          {/* State */}
          {log.current_state && log.changed_state && (
            <div className="text-sm text-gray-600">
              {log.current_state}{" "}
              <span className="text-gray-400">→</span>{" "}
              {log.changed_state}
            </div>
          )}

          {/* Comment */}
          {log.comments && log.comments.trim() && (
            <div className="flex items-start gap-2 mt-1">
              <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5" />
              <p
                className="text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: log.comments }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="pl-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-48 mb-1" />
        </div>
      ))}
    </div>
  );

  if (!sortedAuditTrail.length && !isLoading) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full mt-6 pt-4 border-t pb-20"
    >
      {/* Header */}
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full  px-0">
          <div className="flex justify-between w-full bg-rose-100 items-center gap-2 p-2">
            <span className="text-md font-semibold font-gray-400">TimeLine</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
            {/* <Badge>{sortedAuditTrail.length}</Badge> */}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4">
        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-end items-center">
          {/* <div className="text-md font-bold">Timeline</div> */}
          <TabsList className="bg-rose-50">
            <TabsTrigger value="all">All</TabsTrigger>
            {/* <TabsTrigger value="activity">Activity</TabsTrigger> */}
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
        </div>

          {/* ALL */}
          <TabsContent value="all" className="mt-1">
            {isLoading ? renderSkeleton() : (
              <div className="">
                {sortedAuditTrail.map((log, i) => (
                  <TimelineItem key={i} log={log} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ACTIVITY */}
          <TabsContent value="activity" className="mt-4">
            {isLoading ? renderSkeleton() : (
              <div className="">
                {activityLogs.map((log, i) => (
                  <TimelineItem key={i} log={log} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* COMMENTS */}
          <TabsContent value="comments" className="mt-4">
            {isLoading ? renderSkeleton() : (
              <div className="">
                {commentLogs.map((log, i) => (
                  <TimelineItem key={i} log={log} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/*  Comment Input (added like TaskTimeline) */}
        {/* <div className="flex gap-2 pt-3 border-t">
          <Textarea
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
            disabled={!comment.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div> */}
      </CollapsibleContent>
    </Collapsible>
  );
}