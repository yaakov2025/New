import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
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
import { ListTodo, Plus, Trash2, CalendarDays, UserRound } from "lucide-react";
import { formatDate } from "../_lib/format.ts";

const NONE = "none";

export function TasksTab({ orgId, jobId }: { orgId: Id<"organizations">; jobId: Id<"jobs"> }) {
  const tasks = useQuery(api.jobs.tasks.list, { jobId, orgId });
  const members = useQuery(api.orgs.memberships.listActiveMembers, { orgId });
  const createTask = useMutation(api.jobs.tasks.create);
  const completeTask = useMutation(api.jobs.tasks.complete);
  const removeTask = useMutation(api.jobs.tasks.remove);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: NONE, dueDate: "" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        jobId,
        orgId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assignedTo: form.assignedTo !== NONE ? (form.assignedTo as Id<"users">) : undefined,
        dueDate: form.dueDate || undefined,
      });
      toast.success("Task added");
      setOpen(false);
      setForm({ title: "", description: "", assignedTo: NONE, dueDate: "" });
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (taskId: Id<"jobTasks">, isCompleted: boolean) => {
    try {
      await completeTask({ taskId, orgId, isCompleted });
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleRemove = async (taskId: Id<"jobTasks">) => {
    try {
      await removeTask({ taskId, orgId });
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Tasks</h3>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="h-7 gap-1 text-xs">
          <Plus className="size-3" /> Add
        </Button>
      </div>

      {tasks === undefined ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : tasks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ListTodo /></EmptyMedia>
            <EmptyTitle>No tasks yet</EmptyTitle>
            <EmptyDescription>Break this job into actionable steps</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Add Task
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task._id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={(v) => handleToggle(task._id, v === true)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                <div className="flex flex-wrap gap-3 mt-1">
                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" /> {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.assignee && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3" /> {task.assignee.name ?? "Assigned"}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(task._id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Order materials"
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
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim()}>Add Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
