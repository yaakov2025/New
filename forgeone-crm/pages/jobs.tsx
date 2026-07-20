import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../helpers/useAuth";
import { useJobList, useJobStatuses, useSaveJob } from "../helpers/useJobs";
import { useCustomerList } from "../helpers/useCustomers";
import { useDebounce } from "../helpers/useDebounce";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Badge } from "../components/Badge";
import { Search, Plus, AlertCircle } from "lucide-react";
import { z } from "zod";
import { schema as jobSchema } from "../endpoints/jobs/save_POST.schema";
import styles from "./jobs.module.css";

export default function JobsPage() {
  const { authState } = useAuth();
  const canCreateJob = authState.type === "authenticated" && authState.user.currentOrgRole !== "sales";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("_empty");
  
  const { data: jobsData, isFetching } = useJobList({ search: debouncedSearch, status: statusFilter !== "_empty" ? statusFilter : undefined });
  const { data: statusesData } = useJobStatuses();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Jobs</h1>
        {canCreateJob && (
          <JobDialog 
            open={isCreateOpen} 
            onOpenChange={setIsCreateOpen} 
            trigger={<Button><Plus size={16}/> New Job</Button>}
            statuses={statusesData?.statuses || []}
          />
        )}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <Input 
            placeholder="Search jobs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={styles.statusSelect}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_empty">All Statuses</SelectItem>
            {statusesData?.statuses.map(s => (
              <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Job ID / Title</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Value</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && !jobsData ? (
              <tr><td colSpan={5} className={styles.loadingCell}>Loading...</td></tr>
            ) : jobsData?.jobs.length === 0 ? (
              <tr><td colSpan={5} className={styles.emptyCell}>No jobs found.</td></tr>
            ) : (
              jobsData?.jobs.map(job => (
                <tr key={job.id}>
                  <td>
                    <div className={styles.jobInfo}>
                      <span className={styles.jobId}>#{job.id}</span>
                      <Link to={`/jobs/${job.id}`} className={styles.nameLink}>
                        {job.name}
                      </Link>
                    </div>
                  </td>
                  <td className={styles.metaCell}>{job.customerName || "-"}</td>
                  <td>
                    <Badge variant="outline">{job.status}</Badge>
                  </td>
                  <td className={styles.metaCell}>{job.estimatedValue ? `$${Number(job.estimatedValue).toLocaleString()}` : "-"}</td>
                  <td>
                    {job.needsReview ? <AlertCircle size={16} className={styles.reviewIcon} /> : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobDialog({ open, onOpenChange, trigger, statuses }: { open: boolean, onOpenChange: (o: boolean) => void, trigger: React.ReactNode, statuses: any[] }) {
  const { mutateAsync: saveJob } = useSaveJob();
  const { data: customersData } = useCustomerList();

  const form = useForm({
    schema: jobSchema,
    defaultValues: { name: "", status: statuses.find(s => s.isDefault)?.name }
  });

  const onSubmit = async (values: z.infer<typeof jobSchema>) => {
    await saveJob(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Job</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormItem name="name">
              <FormLabel>Job Title</FormLabel>
              <FormControl><Input value={form.values.name} onChange={e => form.setValues(p => ({...p, name: e.target.value}))}/></FormControl>
              <FormMessage/>
            </FormItem>
            
            <FormItem name="customerId">
              <FormLabel>Customer (Optional)</FormLabel>
              <Select value={form.values.customerId?.toString() || "_empty"} onValueChange={v => form.setValues(p => ({...p, customerId: v === "_empty" ? undefined : parseInt(v)}))}>
                <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">None</SelectItem>
                  {customersData?.customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>

            <FormItem name="status">
              <FormLabel>Status</FormLabel>
              <Select value={form.values.status || "_empty"} onValueChange={v => form.setValues(p => ({...p, status: v === "_empty" ? undefined : v}))}>
                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}