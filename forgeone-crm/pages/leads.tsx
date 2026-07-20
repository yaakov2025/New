import React, { useState } from "react";
import { useLeadList, usePipelineStages, useSaveLead } from "../helpers/useCrmData";
import { useCustomerList } from "../helpers/useCustomers";
import { Button } from "../components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Plus, MoreVertical } from "lucide-react";
import { z } from "zod";
import { schema as leadSchema } from "../endpoints/leads/save_POST.schema";
import styles from "./leads.module.css";

export default function LeadsPage() {
  const { data: stagesData } = usePipelineStages("lead");
  const { data: leadsData } = useLeadList();
  const stages = stagesData?.stages || [];
  const leads = leadsData?.leads || [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Leads Pipeline</h1>
        <LeadDialog 
          stages={stages} 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
          trigger={<Button><Plus size={16}/> New Lead</Button>}
        />
      </div>

      <div className={styles.board}>
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stageId === stage.id && !l.isConverted);
          return (
            <div key={stage.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle} style={{ borderBottomColor: stage.color || 'var(--border)' }}>
                  {stage.name} <span className={styles.columnCount}>{stageLeads.length}</span>
                </h3>
              </div>
              <div className={styles.columnContent}>
                {stageLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} stages={stages} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({ lead, stages }: { lead: any, stages: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: saveLead } = useSaveLead();

  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <h4 className={styles.cardTitle}>{lead.name}</h4>
        {lead.customerName && <p className={styles.cardSub}>{lead.customerName}</p>}
        {lead.estimatedValue != null && <p className={styles.cardMeta}>${Number(lead.estimatedValue).toLocaleString()}</p>}
      </div>
      <div className={styles.cardActions}>
        <Select 
          value={lead.stageId?.toString() || "_empty"} 
          onValueChange={(val) => saveLead({ id: lead.id, name: lead.name, stageId: parseInt(val) })}
        >
          <SelectTrigger className={styles.stageSelect}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <LeadDialog 
          lead={lead} 
          stages={stages} 
          open={isOpen} 
          onOpenChange={setIsOpen} 
          trigger={<Button variant="ghost" size="icon-sm"><MoreVertical size={14}/></Button>} 
        />
      </div>
    </div>
  );
}

function LeadDialog({ lead, stages, open, onOpenChange, trigger }: { lead?: any, stages: any[], open: boolean, onOpenChange: (o: boolean) => void, trigger: React.ReactNode }) {
  const { mutateAsync: saveLead } = useSaveLead();
  const { data: customersData } = useCustomerList();
  const customers = customersData?.customers || [];

  const form = useForm({
    schema: leadSchema,
    defaultValues: { 
      id: lead?.id, 
      name: lead?.name || "", 
      stageId: lead?.stageId || (stages.length > 0 ? stages[0].id : undefined),
      customerId: lead?.customerId,
      estimatedValue: lead?.estimatedValue ? Number(lead.estimatedValue) : undefined
    }
  });

  const onSubmit = async (values: z.infer<typeof leadSchema>) => {
    await saveLead(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{lead ? "Edit Lead" : "New Lead"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormItem name="name">
              <FormLabel>Lead Name</FormLabel>
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

            <FormItem name="estimatedValue">
              <FormLabel>Estimated Value ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  value={form.values.estimatedValue || ""} 
                  onChange={e => form.setValues(p => ({...p, estimatedValue: e.target.value ? parseFloat(e.target.value) : undefined}))}
                />
              </FormControl>
            </FormItem>

            <DialogFooter>
              {lead && (
                <Button type="button" variant="outline" onClick={() => saveLead({ id: lead.id, name: lead.name, action: "convert" })}>
                  Convert to Opportunity
                </Button>
              )}
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}