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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { ArrowLeft, Lightbulb, DollarSign, Pencil, Trash2, ArrowRight, Users } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.js";

export default function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { activeOrgId } = useMyOrgs();
  const updateLead = useMutation(api.crm.leads.update);
  const deleteLead = useMutation(api.crm.leads.remove);
  const convertLead = useMutation(api.crm.leads.convertToOpportunity);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertStageId, setConvertStageId] = useState("");
  const [converting, setSaving] = useState(false);

  const lead = useQuery(
    api.crm.leads.get,
    activeOrgId && leadId ? { leadId: leadId as Id<"leads">, orgId: activeOrgId } : "skip",
  );

  const leadStages = useQuery(
    api.crm.pipelineStages.list,
    activeOrgId ? { orgId: activeOrgId, pipelineType: "lead" } : "skip",
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
    title: "", stageId: "", customerId: "", value: "", source: "", notes: "",
  });

  const openEdit = () => {
    if (!lead) return;
    setEditForm({
      title: lead.title,
      stageId: lead.stageId,
      customerId: lead.customerId ?? "",
      value: lead.value ? (lead.value / 100).toString() : "",
      source: lead.source ?? "",
      notes: lead.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !activeOrgId) return;
    try {
      await updateLead({
        leadId: lead._id,
        orgId: activeOrgId,
        title: editForm.title.trim(),
        stageId: editForm.stageId as Id<"pipelineStages">,
        customerId: editForm.customerId && editForm.customerId !== "none" ? editForm.customerId as Id<"customers"> : undefined,
        value: editForm.value ? Math.round(parseFloat(editForm.value) * 100) : undefined,
        source: editForm.source.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      });
      toast.success("Lead updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update lead");
    }
  };

  const handleDelete = async () => {
    if (!lead || !activeOrgId) return;
    try {
      await deleteLead({ leadId: lead._id, orgId: activeOrgId });
      toast.success("Lead deleted");
      navigate("/pipeline");
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const handleConvert = async () => {
    if (!lead || !activeOrgId || !convertStageId) return;
    setSaving(true);
    try {
      const opportunityId = await convertLead({
        leadId: lead._id,
        orgId: activeOrgId,
        opportunityStageId: convertStageId as Id<"pipelineStages">,
      });
      toast.success("Lead converted to opportunity");
      setConvertOpen(false);
      navigate(`/pipeline/opportunities/${opportunityId}`);
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to convert lead");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!activeOrgId) return null;

  if (lead === undefined) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  const isConverted = !!lead.convertedToOpportunityId;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pipeline")} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center size-9 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
            <Lightbulb className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{lead.title}</h1>
            <div className="flex items-center gap-2">
              {lead.stage && (
                <Badge variant="secondary" style={{ backgroundColor: lead.stage.color ? `${lead.stage.color}20` : undefined, color: lead.stage.color ?? undefined }} className="text-[10px]">
                  {lead.stage.name}
                </Badge>
              )}
              {isConverted && <Badge variant="secondary" className="text-[10px]">Converted</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isConverted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setConvertStageId(oppStages?.[0]?._id ?? ""); setConvertOpen(true); }}
              className="gap-1.5 text-green-600 hover:text-green-600"
            >
              <ArrowRight className="size-3.5" /> Convert
            </Button>
          )}
          {isConverted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/pipeline/opportunities/${lead.convertedToOpportunityId}`)}
              className="gap-1.5"
            >
              <ArrowRight className="size-3.5" /> View Opportunity
            </Button>
          )}
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
            {lead.value && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Value</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="size-3.5 text-emerald-500" />
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(lead.value / 100)}
                </p>
              </div>
            )}
            {lead.customer && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Customer</p>
                <button
                  onClick={() => navigate(`/customers/${lead.customerId}`)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer"
                >
                  <Users className="size-3.5" />
                  {lead.customer.name}
                </button>
              </div>
            )}
            {lead.source && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Source</p>
                <p className="text-sm text-foreground">{lead.source}</p>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-line">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
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
                    {leadStages?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value ($)</Label>
                <Input type="number" value={editForm.value} onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
            </div>
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

      {/* Convert dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Select the opportunity stage to move this lead into.</p>
            <div className="space-y-1.5">
              <Label>Opportunity stage</Label>
              <Select value={convertStageId} onValueChange={setConvertStageId}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {oppStages?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={handleConvert} disabled={converting || !convertStageId} className="gap-1.5">
              <ArrowRight className="size-3.5" />
              {converting ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this lead.</AlertDialogDescription>
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
