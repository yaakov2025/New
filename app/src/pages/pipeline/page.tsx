import { useState } from "react";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
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
import { Textarea } from "@/components/ui/textarea.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { TrendingUp, Plus, ChevronRight, DollarSign, ArrowRight, Lightbulb } from "lucide-react";
import type { Id, Doc } from "@/convex/_generated/dataModel.js";
import { cn } from "@/lib/utils.ts";

// Format dollar value from cents
function formatValue(cents?: number) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

// ── Create Lead Dialog ────────────────────────────────────────────────────────

function CreateLeadDialog({
  orgId, stages, open, onClose,
}: {
  orgId: Id<"organizations">;
  stages: Doc<"pipelineStages">[];
  open: boolean;
  onClose: () => void;
}) {
  const createLead = useMutation(api.crm.leads.create);
  const customers = useQuery(api.crm.customers.list, { orgId, paginationOpts: { numItems: 100, cursor: null } });
  const [form, setForm] = useState({ title: "", stageId: "", customerId: "", value: "", source: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const defaultStage = stages.find((s) => s.isDefault) ?? stages[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createLead({
        orgId,
        title: form.title.trim(),
        stageId: (form.stageId || defaultStage?._id) as Id<"pipelineStages">,
        customerId: form.customerId ? form.customerId as Id<"customers"> : undefined,
        value: form.value ? Math.round(parseFloat(form.value) * 100) : undefined,
        source: form.source.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Lead created");
      onClose();
      setForm({ title: "", stageId: "", customerId: "", value: "", source: "", notes: "" });
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to create lead");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Roof replacement - Main St" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stageId || defaultStage?._id} onValueChange={(v) => setForm((f) => ({ ...f, stageId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {stages.filter((s) => !s.isArchived).map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="5000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Unlinked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {customers?.page.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Referral, Google, etc." />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !defaultStage}>
              {saving ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Opportunity Dialog ─────────────────────────────────────────────────

function CreateOpportunityDialog({
  orgId, stages, open, onClose,
}: {
  orgId: Id<"organizations">;
  stages: Doc<"pipelineStages">[];
  open: boolean;
  onClose: () => void;
}) {
  const createOpp = useMutation(api.crm.opportunities.create);
  const customers = useQuery(api.crm.customers.list, { orgId, paginationOpts: { numItems: 100, cursor: null } });
  const [form, setForm] = useState({ title: "", stageId: "", customerId: "", value: "", source: "", notes: "", closeDate: "" });
  const [saving, setSaving] = useState(false);

  const defaultStage = stages.find((s) => s.isDefault) ?? stages[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createOpp({
        orgId,
        title: form.title.trim(),
        stageId: (form.stageId || defaultStage?._id) as Id<"pipelineStages">,
        customerId: form.customerId && form.customerId !== "none" ? form.customerId as Id<"customers"> : undefined,
        value: form.value ? Math.round(parseFloat(form.value) * 100) : undefined,
        source: form.source.trim() || undefined,
        notes: form.notes.trim() || undefined,
        closeDate: form.closeDate || undefined,
      });
      toast.success("Opportunity created");
      onClose();
      setForm({ title: "", stageId: "", customerId: "", value: "", source: "", notes: "", closeDate: "" });
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to create opportunity");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Roof replacement - Main St" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stageId || defaultStage?._id} onValueChange={(v) => setForm((f) => ({ ...f, stageId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.filter((s) => !s.isArchived).map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="5000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers?.page.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Close date</Label>
              <Input type="date" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !defaultStage}>
              {saving ? "Creating..." : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Pipeline record card ──────────────────────────────────────────────────────

type PipelineRecord = {
  _id: string;
  title: string;
  value?: number;
  customer?: { name: string } | null;
  stage?: { name: string; color?: string } | null;
  convertedToOpportunityId?: string;
  convertedAt?: number;
};

function RecordCard({ record, onClick, isConverted }: { record: PipelineRecord; onClick: () => void; isConverted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer",
        isConverted && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-tight">{record.title}</p>
        <ChevronRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {record.customer && (
          <span className="text-xs text-muted-foreground truncate">{record.customer.name}</span>
        )}
        {record.value && (
          <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <DollarSign className="size-3" />
            {formatValue(record.value)?.replace("$", "")}
          </span>
        )}
        {isConverted && (
          <Badge variant="secondary" className="text-[10px]">Converted</Badge>
        )}
      </div>
    </button>
  );
}

// ── Stage column ──────────────────────────────────────────────────────────────

function StageColumn({
  stage, records, onRecordClick,
}: {
  stage: Doc<"pipelineStages">;
  records: PipelineRecord[];
  onRecordClick: (id: string) => void;
}) {
  const total = records.reduce((sum, r) => sum + (r.value ?? 0), 0);

  return (
    <div className="flex flex-col min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 px-1 pb-2 mb-2">
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: stage.color ?? "#94a3b8" }}
        />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{stage.name}</span>
        <span className="ml-auto text-xs text-muted-foreground">{records.length}</span>
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground px-1 mb-2">{formatValue(total)}</p>
      )}
      <div className="flex-1 space-y-2">
        {records.map((r) => (
          <RecordCard
            key={r._id}
            record={r}
            onClick={() => onRecordClick(r._id)}
            isConverted={!!r.convertedAt}
          />
        ))}
      </div>
    </div>
  );
}

// ── Leads kanban ──────────────────────────────────────────────────────────────

function LeadsKanban({ orgId, onCreate }: { orgId: Id<"organizations">; onCreate: () => void }) {
  const navigate = useNavigate();
  const stages = useQuery(api.crm.pipelineStages.list, { orgId, pipelineType: "lead" });
  const { results: leads } = usePaginatedQuery(
    api.crm.leads.list,
    { orgId },
    { initialNumItems: 200 },
  );

  if (!stages) {
    return <div className="flex gap-4 p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-[220px]" />)}</div>;
  }

  if (stages.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Lightbulb /></EmptyMedia>
          <EmptyTitle>No pipeline stages</EmptyTitle>
          <EmptyDescription>Configure your lead stages in Settings first</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-4 p-6 min-w-max">
        {stages.map((stage) => {
          const stageLeads = (leads ?? []).filter((l) => l.stageId === stage._id);
          return (
            <StageColumn
              key={stage._id}
              stage={stage}
              records={stageLeads}
              onRecordClick={(id) => navigate(`/pipeline/leads/${id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Opportunities kanban ──────────────────────────────────────────────────────

function OpportunitiesKanban({ orgId, onCreate }: { orgId: Id<"organizations">; onCreate: () => void }) {
  const navigate = useNavigate();
  const stages = useQuery(api.crm.pipelineStages.list, { orgId, pipelineType: "opportunity" });
  const { results: opps } = usePaginatedQuery(
    api.crm.opportunities.list,
    { orgId },
    { initialNumItems: 200 },
  );

  if (!stages) {
    return <div className="flex gap-4 p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-[220px]" />)}</div>;
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-4 p-6 min-w-max">
        {stages.map((stage) => {
          const stageOpps = (opps ?? []).filter((o) => o.stageId === stage._id);
          return (
            <StageColumn
              key={stage._id}
              stage={stage}
              records={stageOpps}
              onRecordClick={(id) => navigate(`/pipeline/opportunities/${id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { activeOrgId } = useMyOrgs();
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createOppOpen, setCreateOppOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");

  const leadStages = useQuery(
    api.crm.pipelineStages.list,
    activeOrgId ? { orgId: activeOrgId, pipelineType: "lead" } : "skip",
  );
  const oppStages = useQuery(
    api.crm.pipelineStages.list,
    activeOrgId ? { orgId: activeOrgId, pipelineType: "opportunity" } : "skip",
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
          <h1 className="text-lg font-semibold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Manage leads and opportunities</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => activeTab === "leads" ? setCreateLeadOpen(true) : setCreateOppOpen(true)}
        >
          <Plus className="size-4" />
          {activeTab === "leads" ? "New Lead" : "New Opportunity"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 border-b border-border">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="leads"
              className="flex items-center gap-1.5 h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0"
            >
              <Lightbulb className="size-3.5" /> Leads
            </TabsTrigger>
            <TabsTrigger
              value="opportunities"
              className="flex items-center gap-1.5 h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0"
            >
              <TrendingUp className="size-3.5" /> Opportunities
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="leads" className="flex flex-col flex-1 overflow-hidden mt-0">
          <LeadsKanban orgId={activeOrgId} onCreate={() => setCreateLeadOpen(true)} />
        </TabsContent>
        <TabsContent value="opportunities" className="flex flex-col flex-1 overflow-hidden mt-0">
          <OpportunitiesKanban orgId={activeOrgId} onCreate={() => setCreateOppOpen(true)} />
        </TabsContent>
      </Tabs>

      {leadStages && (
        <CreateLeadDialog
          orgId={activeOrgId}
          stages={leadStages}
          open={createLeadOpen}
          onClose={() => setCreateLeadOpen(false)}
        />
      )}
      {oppStages && (
        <CreateOpportunityDialog
          orgId={activeOrgId}
          stages={oppStages}
          open={createOppOpen}
          onClose={() => setCreateOppOpen(false)}
        />
      )}
    </div>
  );
}
