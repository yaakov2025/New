import React, { useState } from "react";
import { z } from "zod";
import { useSaveJob, useSaveAssignment } from "../helpers/useJobs";
import { useCustomerList, useCustomerDetail } from "../helpers/useCustomers";
import { useOrgMembers } from "../helpers/useOrganizations";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "./Form";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Checkbox } from "./Checkbox";
import { Pencil } from "lucide-react";
import styles from "./EditJobDialog.module.css";

const editJobSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Title is required"),
  jobType: z.string().optional().nullable(),
  estimatedValue: z.number().optional().nullable(),
  nextStep: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.number().optional().nullable(),
  propertyId: z.number().optional().nullable(),
  userIds: z.array(z.number())
});

export function EditJobDialog({ job }: { job: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: saveJob } = useSaveJob();
  const { mutateAsync: saveAssignment } = useSaveAssignment();
  const { data: customersData } = useCustomerList();
  const { data: membersData } = useOrgMembers();

  const form = useForm({
    schema: editJobSchema,
    defaultValues: {
      id: job.id,
      name: job.name,
      jobType: job.jobType || "",
      estimatedValue: job.estimatedValue ? Number(job.estimatedValue) : undefined,
      nextStep: job.nextStep || "",
      notes: job.notes || "",
      customerId: job.customerId || undefined,
      propertyId: job.propertyId || undefined,
      userIds: job.assignments?.map((a: any) => a.id) || []
    }
  });

  const { data: customerDetail } = useCustomerDetail(form.values.customerId || null);

  const onSubmit = async (values: z.infer<typeof editJobSchema>) => {
    const { userIds, ...jobData } = values;
    await saveJob(jobData);
    await saveAssignment({ jobId: job.id, userIds });
    setIsOpen(false);
  };

  const members = membersData?.members || [];
  const customers = customersData?.customers || [];
  const properties = customerDetail?.properties || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon-md"><Pencil size={16} /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.dialogScrollable}>
              <FormItem name="name">
                <FormLabel>Title</FormLabel>
                <FormControl><Input value={form.values.name} onChange={e => form.setValues(p => ({...p, name: e.target.value}))}/></FormControl>
                <FormMessage />
              </FormItem>
              
              <FormItem name="jobType">
                <FormLabel>Job Type</FormLabel>
                <FormControl><Input value={form.values.jobType || ""} onChange={e => form.setValues(p => ({...p, jobType: e.target.value}))}/></FormControl>
              </FormItem>

              <FormItem name="estimatedValue">
                <FormLabel>Estimated Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    value={form.values.estimatedValue || ""} 
                    onChange={e => form.setValues(p => ({...p, estimatedValue: e.target.value ? Number(e.target.value) : null}))}
                  />
                </FormControl>
              </FormItem>

              <FormItem name="customerId">
                <FormLabel>Customer</FormLabel>
                <Select 
                  value={form.values.customerId?.toString() || "_empty"} 
                  onValueChange={(v) => form.setValues(p => ({...p, customerId: v === "_empty" ? null : Number(v), propertyId: null}))}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_empty">None</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormItem name="propertyId">
                <FormLabel>Property</FormLabel>
                <Select 
                  value={form.values.propertyId?.toString() || "_empty"} 
                  onValueChange={(v) => form.setValues(p => ({...p, propertyId: v === "_empty" ? null : Number(v)}))}
                  disabled={!form.values.customerId}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select Property" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_empty">None</SelectItem>
                    {properties.map(prop => <SelectItem key={prop.id} value={prop.id.toString()}>{prop.address}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormItem name="userIds">
                <FormLabel>Assigned Users</FormLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                      <Checkbox 
                        id={`user-${m.id}`} 
                        checked={form.values.userIds.includes(m.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          form.setValues(p => ({
                            ...p, 
                            userIds: checked ? [...p.userIds, m.id] : p.userIds.filter(id => id !== m.id)
                          }));
                        }}
                      />
                      <label htmlFor={`user-${m.id}`}>{m.displayName}</label>
                    </div>
                  ))}
                </div>
              </FormItem>

              <FormItem name="nextStep">
                <FormLabel>Next Step</FormLabel>
                <FormControl><Input value={form.values.nextStep || ""} onChange={e => form.setValues(p => ({...p, nextStep: e.target.value}))}/></FormControl>
              </FormItem>

              <FormItem name="notes">
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea value={form.values.notes || ""} onChange={e => form.setValues(p => ({...p, notes: e.target.value}))}/></FormControl>
              </FormItem>
            </div>
            
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}