import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Building2,
  MapPin,
  Tag,
  CalendarDays,
  DollarSign,
  UserPlus,
  X,
  Footprints,
} from "lucide-react";
import { formatCurrency, formatDate } from "../_lib/format.ts";

type JobDetail = Doc<"jobs"> & {
  customer: Doc<"customers"> | null;
  property: Doc<"properties"> | null;
};

function initials(name?: string | null) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground flex-1 min-w-0">{value}</span>
    </div>
  );
}

export function OverviewTab({ orgId, job }: { orgId: Id<"organizations">; job: JobDetail }) {
  const assignments = useQuery(api.jobs.assignments.list, { jobId: job._id, orgId });
  const members = useQuery(api.orgs.memberships.listActiveMembers, { orgId });
  const assign = useMutation(api.jobs.assignments.assign);
  const unassign = useMutation(api.jobs.assignments.unassign);

  const assignedUserIds = new Set((assignments ?? []).map((a) => a.userId));
  const available = (members ?? []).filter((m) => !assignedUserIds.has(m.userId));

  const handleAssign = async (userId: Id<"users">) => {
    try {
      await assign({ jobId: job._id, orgId, userId });
      toast.success("Assigned");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to assign");
    }
  };

  const handleUnassign = async (assignmentId: Id<"jobAssignments">) => {
    try {
      await unassign({ assignmentId, orgId });
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <InfoRow
            icon={<Building2 className="size-3.5" />}
            label="Customer"
            value={job.customer ? job.customer.name : <span className="text-muted-foreground">—</span>}
          />
          <InfoRow
            icon={<MapPin className="size-3.5" />}
            label="Property"
            value={
              job.property
                ? job.property.name
                  ? `${job.property.name} — ${job.property.address}`
                  : job.property.address
                : <span className="text-muted-foreground">—</span>
            }
          />
          <InfoRow
            icon={<Tag className="size-3.5" />}
            label="Job type"
            value={job.jobType ?? <span className="text-muted-foreground">—</span>}
          />
          <InfoRow
            icon={<DollarSign className="size-3.5" />}
            label="Estimated value"
            value={formatCurrency(job.estimatedValue)}
          />
          <InfoRow
            icon={<CalendarDays className="size-3.5" />}
            label="Start date"
            value={formatDate(job.startDate)}
          />
          <InfoRow
            icon={<CalendarDays className="size-3.5" />}
            label="Target completion"
            value={formatDate(job.targetCompletionDate)}
          />
          <InfoRow
            icon={<Footprints className="size-3.5" />}
            label="Next step"
            value={job.nextStep ?? <span className="text-muted-foreground">—</span>}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Assigned team</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={available.length === 0}>
                  <UserPlus className="size-3.5" /> Assign
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {available.map((m) => (
                  <DropdownMenuItem key={m.userId} className="cursor-pointer" onClick={() => handleAssign(m.userId)}>
                    {m.userName ?? m.userEmail ?? "Member"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {assignments === undefined ? (
              <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : assignments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No one assigned yet</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a._id} className="flex items-center gap-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                        {initials(a.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{a.userName ?? a.userEmail ?? "Member"}</p>
                      {a.role && <p className="text-xs text-muted-foreground">{a.role}</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnassign(a._id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {job.notes && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-line">{job.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
