import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { CalendarClock, Plus, Trash2, Clock, UserRound } from "lucide-react";
import { formatDateTime } from "../_lib/format.ts";

const NONE = "none";

// Convert an ISO string to the value format expected by datetime-local inputs.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function AppointmentsTab({ orgId, jobId }: { orgId: Id<"organizations">; jobId: Id<"jobs"> }) {
  const appointments = useQuery(api.jobs.appointments.list, { jobId, orgId });
  const members = useQuery(api.orgs.memberships.listActiveMembers, { orgId });
  const createAppt = useMutation(api.jobs.appointments.create);
  const removeAppt = useMutation(api.jobs.appointments.remove);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduledAt: "", duration: "", assignedTo: NONE });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) return;
    setSaving(true);
    try {
      await createAppt({
        jobId,
        orgId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        duration: form.duration ? Number(form.duration) : undefined,
        assignedTo: form.assignedTo !== NONE ? (form.assignedTo as Id<"users">) : undefined,
      });
      toast.success("Appointment scheduled");
      setOpen(false);
      setForm({ title: "", description: "", scheduledAt: "", duration: "", assignedTo: NONE });
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to schedule appointment");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (appointmentId: Id<"jobAppointments">) => {
    try {
      await removeAppt({ appointmentId, orgId });
      toast.success("Appointment removed");
    } catch {
      toast.error("Failed to remove appointment");
    }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Appointments</h3>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="h-7 gap-1 text-xs">
          <Plus className="size-3" /> Add
        </Button>
      </div>

      {appointments === undefined ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : appointments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
            <EmptyTitle>No appointments</EmptyTitle>
            <EmptyDescription>Schedule site visits and meetings</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Schedule
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <div key={appt._id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-center size-9 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                <CalendarClock className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{appt.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(appt.scheduledAt)}</p>
                {appt.description && <p className="text-xs text-muted-foreground mt-0.5">{appt.description}</p>}
                <div className="flex flex-wrap gap-3 mt-1">
                  {appt.duration !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {appt.duration} min
                    </span>
                  )}
                  {appt.assignee && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3" /> {appt.assignee.name ?? "Assigned"}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(appt._id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Site inspection"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date &amp; time *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.userName ?? m.userEmail ?? "Member"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim() || !form.scheduledAt}>Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
