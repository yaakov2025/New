import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp, DollarSign, Pencil, Trash2, Calendar, Users, Lightbulb } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.js";

export default function OpportunityDetailPage() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const navigate = useNavigate();
  const { activeOrgId } = useMyOrgs();
  const updateOpp = useMutation(api.crm.opportunities.update);
  const deleteOpp = useMutation(api.crm.opportunities.remove);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const opp = useQuery(
    api.crm.opportunities.get,
    activeOrgId && opportunityId
      ? { opportunityId: opportunityId as Id<"opportunities">, orgId: activeOrgId }
      : "skip",
  );

  const oppStages = useQuery(
    api.crm.pipelineStages.list,
    activeOrgId ? { orgId: activeOrgId, pipelineType: "opportunity" } : "skip",
  );

  const customers = useQuery(
    api.crm.customers.list,
    activeOrgId ? { orgId: activeOrgId, paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );

  const [editForm, setEditForm] = useState({
    title: "", stageId: "", customerId: "", value: "", source: "", notes: "", closeDate: "",
  });

  const openEdit = () => {
    if (!opp) return;
    setEditForm({
      title: opp.title,
      stageId: opp.stageId,
      customerId: opp.customerId ?? "",
      value: opp.value ? (opp.value / 100).toString() : "",
      source: opp.source ?? "",
      notes: opp.notes ?? "",
      closeDate: opp.closeDate ?? "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opp || !activeOrgId) return;
    try {
      await updateOpp({
        opportunityId: opp._id,
        orgId: activeOrgId,
        title: editForm.title.trim(),
        stageId: editForm.stageId as Id<"pipelineStages">,
        customerId: editForm.customerId && editForm.customerId !== "none" ? editForm.customerId as Id<"customers"> : undefined,
        value: editForm.value ? Math.round(parseFloat(editForm.value) * 100) : undefined,
        source: editForm.source.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        closeDate: editForm.closeDate || undefined,
      });
      toast.success("Opportunity updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update opportunity");
    }
  };

  const handleDelete = async () => {
    if (!opp || !activeOrgId) return;
    try {
      await deleteOpp({ opportunityId: opp._id, orgId: activeOrgId });
      toast.success("Opportunity deleted");
      navigate("/pipeline?tab=opportunities");
    } catch {
      toast.error("Failed to delete opportunity");
    }
  };

  if (!activeOrgId) return null;

  if (opp === undefined) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pipeline")} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center size-9 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
            <TrendingUp className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{opp.title}</h1>
            <div className="flex items-center gap-2">
              {opp.stage && (
                <Badge variant="secondary" style={{ backgroundColor: opp.stage.color ? `${opp.stage.color}20` : undefined, color: opp.stage.color ?? undefined }} className="text-[10px]">
                  {opp.stage.name}
                </Badge>
              )}
              {opp.convertedFromLeadId && (
                <button
                  onClick={() => navigate(`/pipeline/leads/${opp.convertedFromLeadId}`)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <Lightbulb className="size-3" /> From lead
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {opp.value && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Value</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="size-3.5 text-emerald-500" />
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(opp.value / 100)}
                </p>
              </div>
            )}
            {opp.customer && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Customer</p>
                <button
                  onClick={() => navigate(`/customers/${opp.customerId}`)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer"
                >
                  <Users className="size-3.5" />
                  {opp.customer.name}
                </button>
              </div>
            )}
            {opp.closeDate && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Close date</p>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {new Date(opp.closeDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {opp.source && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Source</p>
                <p className="text-sm text-foreground">{opp.source}</p>
              </div>
            )}
          </div>

          {opp.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-line">{opp.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Opportunity</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={editForm.stageId} onValueChange={(v) => setEditForm((f) => ({ ...f, stageId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {oppStages?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value ($)</Label>
                <Input type="number" value={editForm.value} onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={editForm.customerId || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, customerId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {customers?.page.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Close date</Label>
                <Input type="date" value={editForm.closeDate} onChange={(e) => setEditForm((f) => ({ ...f, closeDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input value={editForm.source} onChange={(e) => setEditForm((f) => ({ ...f, source: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this opportunity.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
