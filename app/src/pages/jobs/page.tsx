import { useState, useEffect, useRef } from "react";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Briefcase,
  Plus,
  Search,
  ChevronRight,
  Users,
  AlertCircle,
  Building2,
} from "lucide-react";
import { StatusBadge } from "./_components/status-badge.tsx";
import { JobFormDialog } from "./_components/job-form-dialog.tsx";
import { formatCurrency } from "./_lib/format.ts";

const ALL = "all";

export default function JobsPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useMyOrgs();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const statuses = useQuery(api.jobs.statuses.list, activeOrgId ? { orgId: activeOrgId } : "skip");
  const members = useQuery(
    api.orgs.memberships.listActiveMembers,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  // Backfill: ensure default statuses exist for orgs created before the Jobs module.
  const ensureStatuses = useMutation(api.jobs.statuses.ensureDefaultStatuses);
  const backfillRan = useRef(false);
  useEffect(() => {
    if (activeOrgId && statuses !== undefined && statuses.length === 0 && !backfillRan.current) {
      backfillRan.current = true;
      ensureStatuses({ orgId: activeOrgId });
    }
  }, [activeOrgId, statuses, ensureStatuses]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.jobs.list,
    activeOrgId
      ? {
          orgId: activeOrgId,
          status: statusFilter !== ALL ? statusFilter : undefined,
          needsReview: needsReviewOnly ? true : undefined,
          assignedTo: assigneeFilter !== ALL ? (assigneeFilter as Id<"users">) : undefined,
        }
      : "skip",
    { initialNumItems: 25 },
  );

  const filtered = results.filter((job) =>
    debouncedSearch ? job.name.toLowerCase().includes(debouncedSearch.toLowerCase()) : true,
  );

  if (!activeOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {status === "LoadingFirstPage" ? "Loading..." : `${filtered.length} jobs`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 px-6 py-3 border-b border-border sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {(statuses ?? []).map((s) => (
              <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All assignees</SelectItem>
            {(members ?? []).map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.userName ?? m.userEmail ?? "Member"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="needs-review" checked={needsReviewOnly} onCheckedChange={setNeedsReviewOnly} />
          <Label htmlFor="needs-review" className="text-sm cursor-pointer">Needs review</Label>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {status === "LoadingFirstPage" ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Briefcase /></EmptyMedia>
              <EmptyTitle>
                {search || statusFilter !== ALL || assigneeFilter !== ALL || needsReviewOnly
                  ? "No matching jobs"
                  : "No jobs yet"}
              </EmptyTitle>
              <EmptyDescription>
                {search || statusFilter !== ALL || assigneeFilter !== ALL || needsReviewOnly
                  ? "Try adjusting your filters"
                  : "Create your first job to start tracking work"}
              </EmptyDescription>
            </EmptyHeader>
            {!(search || statusFilter !== ALL || assigneeFilter !== ALL || needsReviewOnly) && (
              <EmptyContent>
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="size-4" /> New Job
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <>
            <div className="divide-y divide-border">
              {filtered.map((job) => (
                <button
                  key={job._id}
                  onClick={() => navigate(`/jobs/${job._id}`)}
                  className="flex w-full items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center justify-center size-9 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                    <Briefcase className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{job.name}</span>
                      {job.needsReview && (
                        <Badge variant="secondary" className="gap-1 text-[10px] text-amber-700 dark:text-amber-400 shrink-0">
                          <AlertCircle className="size-3" /> Review
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {job.customer && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="size-3 shrink-0" />
                          {job.customer.name}
                        </span>
                      )}
                      {job.jobType && <span className="shrink-0">{job.jobType}</span>}
                      {job.estimatedValue !== undefined && (
                        <span className="shrink-0">{formatCurrency(job.estimatedValue)}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={job.status} statuses={statuses} className="hidden sm:inline-flex" />
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
            {status === "CanLoadMore" && (
              <div className="flex justify-center py-4">
                <Button variant="ghost" size="sm" onClick={() => loadMore(25)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </div>

      <JobFormDialog
        orgId={activeOrgId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(jobId) => navigate(`/jobs/${jobId}`)}
      />
    </div>
  );
}
