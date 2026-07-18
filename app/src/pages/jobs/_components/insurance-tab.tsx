import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { Shield } from "lucide-react";

type Props = { jobId: Id<"jobs">; orgId: Id<"organizations"> };

export default function InsuranceTab({ jobId, orgId }: Props) {
  const insurance = useQuery(api.jobs.insurance.get, { jobId, orgId });
  const upsert = useMutation(api.jobs.insurance.upsert);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    carrier: "",
    policyNumber: "",
    claimNumber: "",
    deductible: "",
    adjusterName: "",
    adjusterPhone: "",
    adjusterEmail: "",
    dateOfLoss: "",
    notes: "",
  });
  const [initialized, setInitialized] = useState(false);

  if (insurance === undefined) return <Skeleton className="h-48 w-full" />;

  // Initialize form from existing data
  if (!initialized && insurance !== undefined) {
    setForm({
      carrier: insurance?.carrier ?? "",
      policyNumber: insurance?.policyNumber ?? "",
      claimNumber: insurance?.claimNumber ?? "",
      deductible: insurance?.deductible ? (insurance.deductible / 100).toString() : "",
      adjusterName: insurance?.adjusterName ?? "",
      adjusterPhone: insurance?.adjusterPhone ?? "",
      adjusterEmail: insurance?.adjusterEmail ?? "",
      dateOfLoss: insurance?.dateOfLoss ?? "",
      notes: insurance?.notes ?? "",
    });
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({
        jobId,
        orgId,
        carrier: form.carrier || undefined,
        policyNumber: form.policyNumber || undefined,
        claimNumber: form.claimNumber || undefined,
        deductible: form.deductible ? Math.round(parseFloat(form.deductible) * 100) : undefined,
        adjusterName: form.adjusterName || undefined,
        adjusterPhone: form.adjusterPhone || undefined,
        adjusterEmail: form.adjusterEmail || undefined,
        dateOfLoss: form.dateOfLoss || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Insurance info saved");
    } catch {
      toast.error("Failed to save insurance info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="size-4" />
        <span>Insurance claim details for this job</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Carrier</Label>
          <Input value={form.carrier} onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} placeholder="State Farm" />
        </div>
        <div className="space-y-1.5">
          <Label>Policy Number</Label>
          <Input value={form.policyNumber} onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Claim Number</Label>
          <Input value={form.claimNumber} onChange={(e) => setForm((f) => ({ ...f, claimNumber: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Deductible ($)</Label>
          <Input type="number" value={form.deductible} onChange={(e) => setForm((f) => ({ ...f, deductible: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Date of Loss</Label>
          <Input type="date" value={form.dateOfLoss} onChange={(e) => setForm((f) => ({ ...f, dateOfLoss: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Adjuster Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.adjusterName} onChange={(e) => setForm((f) => ({ ...f, adjusterName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.adjusterPhone} onChange={(e) => setForm((f) => ({ ...f, adjusterPhone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.adjusterEmail} onChange={(e) => setForm((f) => ({ ...f, adjusterEmail: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Insurance Info"}
      </Button>
    </div>
  );
}
