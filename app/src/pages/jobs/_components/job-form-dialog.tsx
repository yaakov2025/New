import { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
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
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { centsToDollars, dollarsToCents } from "../_lib/format.ts";

type JobDoc = {
  _id: Id<"jobs">;
  name: string;
  customerId?: Id<"customers">;
  contactId?: Id<"contacts">;
  propertyId?: Id<"properties">;
  jobType?: string;
  status: string;
  needsReview: boolean;
  nextStep?: string;
  startDate?: string;
  targetCompletionDate?: string;
  estimatedValue?: number;
  isInsuranceJob: boolean;
  notes?: string;
};

const NONE = "none";

type FormState = {
  name: string;
  customerId: string;
  contactId: string;
  propertyId: string;
  jobType: string;
  status: string;
  needsReview: boolean;
  nextStep: string;
  startDate: string;
  targetCompletionDate: string;
  estimatedValue: string;
  isInsuranceJob: boolean;
  notes: string;
};

function emptyForm(defaultStatus: string): FormState {
  return {
    name: "",
    customerId: NONE,
    contactId: NONE,
    propertyId: NONE,
    jobType: "",
    status: defaultStatus,
    needsReview: false,
    nextStep: "",
    startDate: "",
    targetCompletionDate: "",
    estimatedValue: "",
    isInsuranceJob: false,
    notes: "",
  };
}

export function JobFormDialog({
  orgId,
  open,
  onClose,
  job,
  onCreated,
}: {
  orgId: Id<"organizations">;
  open: boolean;
  onClose: () => void;
  job?: JobDoc;
  onCreated?: (jobId: Id<"jobs">) => void;
}) {
  const isEdit = !!job;
  const statuses = useQuery(api.jobs.statuses.list, open ? { orgId } : "skip");
  const members = useQuery(api.orgs.memberships.listActiveMembers, open ? { orgId } : "skip");
  const { results: customers } = usePaginatedQuery(
    api.crm.customers.list,
    open ? { orgId } : "skip",
    { initialNumItems: 100 },
  );

  const createJob = useMutation(api.jobs.jobs.create);
  const updateJob = useMutation(api.jobs.jobs.update);

  const [form, setForm] = useState<FormState>(() =>
    job
      ? {
          name: job.name,
          customerId: job.customerId ?? NONE,
          contactId: job.contactId ?? NONE,
          propertyId: job.propertyId ?? NONE,
          jobType: job.jobType ?? "",
          status: job.status,
          needsReview: job.needsReview,
          nextStep: job.nextStep ?? "",
          startDate: job.startDate ?? "",
          targetCompletionDate: job.targetCompletionDate ?? "",
          estimatedValue: centsToDollars(job.estimatedValue),
          isInsuranceJob: job.isInsuranceJob,
          notes: job.notes ?? "",
        }
      : emptyForm(""),
  );
  const [assigneeIds, setAssigneeIds] = useState<Id<"users">[]>([]);
  const [saving, setSaving] = useState(false);

  // Properties depend on the selected customer.
  const properties = useQuery(
    api.crm.properties.list,
    open && form.customerId !== NONE
      ? { orgId, customerId: form.customerId as Id<"customers"> }
      : "skip",
  );

  const toggleAssignee = (userId: Id<"users">) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const shared = {
        name: form.name.trim(),
        customerId: form.customerId !== NONE ? (form.customerId as Id<"customers">) : undefined,
        contactId: form.contactId !== NONE ? (form.contactId as Id<"contacts">) : undefined,
        propertyId: form.propertyId !== NONE ? (form.propertyId as Id<"properties">) : undefined,
        jobType: form.jobType.trim() || undefined,
        status: form.status || undefined,
        needsReview: form.needsReview,
        nextStep: form.nextStep.trim() || undefined,
        startDate: form.startDate || undefined,
        targetCompletionDate: form.targetCompletionDate || undefined,
        estimatedValue: dollarsToCents(form.estimatedValue),
        isInsuranceJob: form.isInsuranceJob,
        notes: form.notes.trim() || undefined,
      };

      if (isEdit && job) {
        await updateJob({ jobId: job._id, orgId, ...shared });
        toast.success("Job updated");
      } else {
        const jobId = await createJob({
          orgId,
          ...shared,
          assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
        });
        toast.success("Job created");
        onCreated?.(jobId);
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error(isEdit ? "Failed to update job" : "Failed to create job");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Job" : "New Job"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Roof replacement - 123 Main St"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm((f) => ({ ...f, customerId: v, propertyId: NONE }))}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select
                value={form.propertyId}
                onValueChange={(v) => setForm((f) => ({ ...f, propertyId: v }))}
                disabled={form.customerId === NONE}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.customerId === NONE ? "Select a customer first" : "Select property"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No property</SelectItem>
                  {(properties ?? []).map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name ? `${p.name} — ${p.address}` : p.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status || NONE} onValueChange={(v) => setForm((f) => ({ ...f, status: v === NONE ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Default status" /></SelectTrigger>
                <SelectContent>
                  {!isEdit && <SelectItem value={NONE}>Default</SelectItem>}
                  {(statuses ?? []).map((s) => (
                    <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Job type</Label>
              <Input
                value={form.jobType}
                onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
                placeholder="Roofing, Remodel..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Target completion</Label>
              <Input
                type="date"
                value={form.targetCompletionDate}
                onChange={(e) => setForm((f) => ({ ...f, targetCompletionDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estimated value ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedValue}
                onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Next step</Label>
              <Input
                value={form.nextStep}
                onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))}
                placeholder="Schedule site inspection"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Needs review</Label>
                <p className="text-xs text-muted-foreground">Flag this job for follow-up</p>
              </div>
              <Switch
                checked={form.needsReview}
                onCheckedChange={(v) => setForm((f) => ({ ...f, needsReview: v }))}
              />
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Insurance job</Label>
                <p className="text-xs text-muted-foreground">Track carrier &amp; claim details</p>
              </div>
              <Switch
                checked={form.isInsuranceJob}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isInsuranceJob: v }))}
              />
            </div>

            {!isEdit && (
              <div className="col-span-2 space-y-1.5">
                <Label>Assign team members</Label>
                <div className="flex flex-wrap gap-2">
                  {(members ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No team members available</p>
                  ) : (
                    (members ?? []).map((m) => {
                      const selected = assigneeIds.includes(m.userId);
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggleAssignee(m.userId)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                        >
                          {m.userName ?? m.userEmail ?? "Member"}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
