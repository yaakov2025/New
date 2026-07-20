import React, { useState } from "react";
import { useAuth } from "../helpers/useAuth";
import { useOpportunityList, usePipelineStages, useSaveOpportunity } from "../helpers/useCrmData";
import { useCustomerList } from "../helpers/useCustomers";
import { Button } from "../components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Plus, MoreVertical } from "lucide-react";
import { z } from "zod";
import { schema as oppSchema } from "../endpoints/opportunities/save_POST.schema";
import { useDocumentList, useCreateDocument } from "../helpers/useDocuments";
import { useTemplateList } from "../helpers/useTemplates";
import { getStatusBadge, formatDocType } from "../components/JobDocumentsShared";
import { Badge } from "../components/Badge";
import { toast } from "sonner";
import styles from "./leads.module.css"; // Reuse leads board styles

export default function OpportunitiesPage() {
  const { authState } = useAuth();
  const { data: stagesData } = usePipelineStages("opportunity");
  const { data: oppsData } = useOpportunityList();
  const stages = stagesData?.stages || [];
  const opportunities = oppsData?.opportunities || [];

  const canConvertToJob = authState.type === "authenticated" && authState.user.currentOrgRole !== "sales";

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Opportunities</h1>
        <OppDialog 
          stages={stages} 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
          trigger={<Button><Plus size={16}/> New Opportunity</Button>}
          canConvertToJob={canConvertToJob}
        />
      </div>

      <div className={styles.board}>
        {stages.map(stage => {
          const stageOpps = opportunities.filter(o => o.stageId === stage.id && !o.isWon);
          const stageTotal = stageOpps.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
          return (
            <div key={stage.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle} style={{ borderBottomColor: stage.color || 'var(--border)' }}>
                  {stage.name} <span className={styles.columnCount}>{stageOpps.length}</span>
                </h3>
                <p className={styles.cardMeta} style={{marginTop: 4}}>${stageTotal.toLocaleString()}</p>
              </div>
              <div className={styles.columnContent}>
                {stageOpps.map(opp => (
                  <OppCard key={opp.id} opp={opp} stages={stages} canConvertToJob={canConvertToJob} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OppCard({ opp, stages, canConvertToJob }: { opp: any, stages: any[], canConvertToJob: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: saveOpp } = useSaveOpportunity();

  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <h4 className={styles.cardTitle}>{opp.name}</h4>
        {opp.customerName && <p className={styles.cardSub}>{opp.customerName}</p>}
        {opp.value != null && <p className={styles.cardMeta}>${Number(opp.value).toLocaleString()}</p>}
      </div>
      <div className={styles.cardActions}>
        <Select 
          value={opp.stageId?.toString() || "_empty"} 
          onValueChange={(val) => saveOpp({ id: opp.id, name: opp.name, stageId: parseInt(val) })}
        >
          <SelectTrigger className={styles.stageSelect}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <OppDialog 
          opp={opp} 
          stages={stages} 
          open={isOpen} 
          onOpenChange={setIsOpen} 
          trigger={<Button variant="ghost" size="icon-sm"><MoreVertical size={14}/></Button>} 
          canConvertToJob={canConvertToJob}
        />
      </div>
    </div>
  );
}

function OppDialog({ opp, stages, open, onOpenChange, trigger, canConvertToJob }: { opp?: any, stages: any[], open: boolean, onOpenChange: (o: boolean) => void, trigger: React.ReactNode, canConvertToJob: boolean }) {
  const { mutateAsync: saveOpp } = useSaveOpportunity();
  const { data: customersData } = useCustomerList();
  const customers = customersData?.customers || [];

  const { data: docsData } = useDocumentList(opp ? { opportunityId: opp.id } : {});
  const { data: templatesData } = useTemplateList({ isActive: true });
  const createDocMut = useCreateDocument();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("_empty");

  const estimates = docsData?.documents?.filter((d: any) => d.documentType === 'estimate') || [];
  const estimateTemplates = templatesData?.templates?.filter((t: any) => t.documentType === 'estimate') || [];

  const handleCreateEstimate = async () => {
    if (selectedTemplateId === "_empty") {
      toast.error("Please select a template");
      return;
    }
    try {
      await createDocMut.mutateAsync({
        templateId: parseInt(selectedTemplateId),
        customerId: opp.customerId,
        opportunityId: opp.id,
      });
      toast.success("Estimate created successfully");
      setSelectedTemplateId("_empty");
    } catch (err: any) {
      toast.error(err.message || "Failed to create estimate");
    }
  };

  const form = useForm({
    schema: oppSchema,
    defaultValues: { 
      id: opp?.id, 
      name: opp?.name || "", 
      stageId: opp?.stageId || (stages.length > 0 ? stages[0].id : undefined),
      customerId: opp?.customerId,
      value: opp?.value ? Number(opp.value) : undefined
    }
  });

  const onSubmit = async (values: z.infer<typeof oppSchema>) => {
    await saveOpp(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{opp ? "Edit Opportunity" : "New Opportunity"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormItem name="name">
              <FormLabel>Opportunity Name</FormLabel>
              <FormControl><Input value={form.values.name} onChange={e => form.setValues(p => ({...p, name: e.target.value}))}/></FormControl>
              <FormMessage/>
            </FormItem>
            
            <FormItem name="customerId">
              <FormLabel>Customer (Optional)</FormLabel>
              <Select value={form.values.customerId?.toString() || "_empty"} onValueChange={v => form.setValues(p => ({...p, customerId: v === "_empty" ? undefined : parseInt(v)}))}>
                <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">None</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>

            <FormItem name="value">
              <FormLabel>Value ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  value={form.values.value || ""} 
                  onChange={e => form.setValues(p => ({...p, value: e.target.value ? parseFloat(e.target.value) : undefined}))}
                />
              </FormControl>
            </FormItem>

            {opp && (
              <div style={{ marginTop: "var(--spacing-6)", borderTop: "1px solid var(--border)", paddingTop: "var(--spacing-4)" }}>
                <h4 style={{ marginBottom: "var(--spacing-2)", fontSize: "0.9375rem" }}>Estimates</h4>
                {estimates.length === 0 ? (
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: "var(--spacing-4)" }}>No estimates yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)", marginBottom: "var(--spacing-4)" }}>
                    {estimates.map((est: any) => (
                      <div key={est.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{est.documentNumber}</span>
                          {getStatusBadge(est.status)}
                        </div>
                        <span style={{ fontSize: "0.875rem" }}>${Number(est.total || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger style={{ flex: 1 }}>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">Select a template...</SelectItem>
                      {estimateTemplates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleCreateEstimate} disabled={createDocMut.isPending}>
                    Create Estimate
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter style={{ flexDirection: "column", alignItems: "stretch", marginTop: "var(--spacing-6)" }}>
              {opp && canConvertToJob && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)", marginBottom: "var(--spacing-4)" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textAlign: "center" }}>
                    Linked estimates will be automatically transferred to the new Job.
                  </p>
                  <Button type="button" variant="secondary" onClick={() => saveOpp({ id: opp.id, name: opp.name, action: "convert" })}>
                    Convert to Job
                  </Button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit">Save</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}