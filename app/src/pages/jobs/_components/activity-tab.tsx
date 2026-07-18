import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Activity } from "lucide-react";
import { formatRelativeTime } from "../_lib/format.ts";

export function ActivityTab({ orgId, jobId }: { orgId: Id<"organizations">; jobId: Id<"jobs"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.activity.list,
    { orgId, jobId },
    { initialNumItems: 25 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-4 max-w-2xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-2 rounded-full mt-2" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Activity /></EmptyMedia>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>Changes to this job will appear here</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="relative space-y-0 border-l border-border pl-6">
        {results.map((event) => (
          <div key={event._id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[27px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-background" />
            <p className="text-sm text-foreground">{event.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {event.userName ? `${event.userName} · ` : ""}
              {formatRelativeTime(event._creationTime)}
              <span className="text-muted-foreground/60"> · {event.eventType.replace(/_/g, " ")}</span>
            </p>
          </div>
        ))}
      </div>
      {status === "CanLoadMore" && (
        <div className="flex justify-center py-4">
          <Button variant="ghost" size="sm" onClick={() => loadMore(25)}>Load more</Button>
        </div>
      )}
    </div>
  );
}
