import type { Doc } from "@/convex/_generated/dataModel.js";

type JobStatus = Doc<"jobStatuses">;

// Renders a colored dot + label for a job status.
// Falls back to a neutral badge when the status name isn't in the list
// (e.g. the status was archived after the job was set).
export function StatusBadge({
  status,
  statuses,
  className,
}: {
  status: string;
  statuses: JobStatus[] | undefined;
  className?: string;
}) {
  const match = statuses?.find((s) => s.name === status);
  const color = match?.color ?? "#6B7280";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground ${className ?? ""}`}
    >
      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}
