import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  useJobDetail, useSaveJob, useSaveTask, useSaveNote, useJobStatuses
} from "../helpers/useJobs";
import { useAuth } from "../helpers/useAuth";
import { Button } from "../components/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/Tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, useForm } from "../components/Form";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Switch } from "../components/Switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Checkbox } from "../components/Checkbox";
import { Badge } from "../components/Badge";
import { Avatar, AvatarFallback } from "../components/Avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/Tooltip";
import { z } from "zod";
import { schema as taskSchema } from "../endpoints/jobs/task/save_POST.schema";
import { schema as noteSchema } from "../endpoints/jobs/note/save_POST.schema";
import { EditJobDialog } from "../components/EditJobDialog";
import { ContactsTab, AppointmentsTab, PhotosTab, FilesTab, InsuranceTab } from "../components/JobDetailTabs";
import { JobDocumentsTab } from "../components/JobDocumentsTab";
import styles from "./jobs.$jobId.module.css";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const id = parseInt(jobId!);
  const { data, isFetching } = useJobDetail(id);
  const { data: statusesData } = useJobStatuses();
  const { mutate: saveJob } = useSaveJob();
  const { authState } = useAuth();
  
  const canEdit = authState.type === "authenticated" && authState.user.currentOrgRole !== "sales";

  if (isFetching && !data) return <div>Loading...</div>;
  if (!data) return <div>Job not found</div>;

  const job = data.job;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to="/jobs" className={styles.backLink}>← Back to Jobs</Link>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{job.name}</h1>
            <Badge variant="outline" className={styles.statusBadge}>{job.status}</Badge>
          </div>
          <p className={styles.subtitle}>{job.customer?.name} • {job.property?.address}</p>
          
          {job.assignments && job.assignments.length > 0 && (
            <div className={styles.avatarList}>
              {job.assignments.map(u => (
                <Tooltip key={u.id}>
                  <TooltipTrigger asChild>
                    <Avatar className={styles.avatarItem}>
                      <AvatarFallback>{u.displayName?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{u.displayName}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
        
        {canEdit && (
          <div className={styles.actions}>
            <EditJobDialog job={job} />
            <div className={styles.reviewToggle}>
              <label htmlFor="needsReview">Needs Review</label>
              <Switch 
                id="needsReview" 
                checked={job.needsReview || false} 
                onCheckedChange={(v) => saveJob({ id: job.id, name: job.name, needsReview: v })} 
              />
            </div>
            
            <Select 
              value={job.status || "_empty"} 
              onValueChange={(val) => saveJob({ id: job.id, name: job.name, status: val })}
            >
              <SelectTrigger className={styles.statusSelect}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusesData?.statuses.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className={styles.tabsContainer}>
        <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({job.contacts.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({job.tasks.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({job.appointments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({job.notes.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({job.photos.length})</TabsTrigger>
          <TabsTrigger value="files">Files ({job.files.length})</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Job Details</h2></div>
            <div className={styles.grid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Estimated Value</span>
                <span className={styles.fieldValue}>{job.estimatedValue ? `$${Number(job.estimatedValue).toLocaleString()}` : "-"}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Job Type</span>
                <span className={styles.fieldValue}>{job.jobType || "-"}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Next Step</span>
                <span className={styles.fieldValue}>{job.nextStep || "-"}</span>
              </div>
                            <div className={styles.field}>
                <span className={styles.fieldLabel}>Insurance Job</span>
                <span className={styles.fieldValue}>{job.isInsuranceJob ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </TabsContent>

                <TabsContent value="activity" className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.timeline}>
              {job.events.map(e => (
                <div key={e.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineDesc}>{e.description}</p>
                    <p className={styles.timelineTime}>{new Date(e.createdAt!).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {job.events.length === 0 && <p className={styles.emptyState}>No activity recorded.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className={styles.tabContent}>
          <JobDocumentsTab jobId={id} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="contacts" className={styles.tabContent}>
          <ContactsTab job={job} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="tasks" className={styles.tabContent}>
          <TasksTab jobId={id} tasks={job.tasks} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="appointments" className={styles.tabContent}>
          <AppointmentsTab jobId={id} appointments={job.appointments} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="notes" className={styles.tabContent}>
          <NotesTab jobId={id} notes={job.notes} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="photos" className={styles.tabContent}>
          <PhotosTab jobId={id} photos={job.photos} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="files" className={styles.tabContent}>
          <FilesTab jobId={id} files={job.files} canEdit={canEdit} />
        </TabsContent>

                <TabsContent value="insurance" className={styles.tabContent}>
          <InsuranceTab jobId={id} insurance={job.insurance} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TasksTab({ jobId, tasks, canEdit }: { jobId: number, tasks: any[], canEdit: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: saveTask } = useSaveTask();

  const form = useForm({
    schema: taskSchema,
    defaultValues: { jobId, title: "" }
  });

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    await saveTask(values);
    setIsOpen(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Tasks</h2>
        {canEdit && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm">Add Task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                  <FormItem name="title">
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input value={form.values.title} onChange={e => form.setValues(p => ({...p, title: e.target.value}))}/></FormControl>
                  </FormItem>
                  <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className={styles.list}>
        {tasks.map(t => (
          <div key={t.id} className={styles.listItem}>
            <Checkbox 
              checked={t.isCompleted} 
              disabled={!canEdit}
              onChange={(e) => saveTask({ jobId, id: t.id, isCompleted: e.target.checked })} 
            />
            <span className={t.isCompleted ? styles.completedText : ""}>{t.title}</span>
          </div>
        ))}
        {tasks.length === 0 && <p className={styles.emptyState}>No tasks.</p>}
      </div>
    </div>
  );
}

function NotesTab({ jobId, notes, canEdit }: { jobId: number, notes: any[], canEdit: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: saveNote } = useSaveNote();

  const form = useForm({
    schema: noteSchema,
    defaultValues: { jobId, content: "" }
  });

  const onSubmit = async (values: z.infer<typeof noteSchema>) => {
    await saveNote(values);
    setIsOpen(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Notes</h2>
        {canEdit && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm">Add Note</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                  <FormItem name="content">
                    <FormLabel>Note</FormLabel>
                    <FormControl><Textarea value={form.values.content} onChange={e => form.setValues(p => ({...p, content: e.target.value}))}/></FormControl>
                  </FormItem>
                  <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className={styles.list}>
        {notes.map(n => (
          <div key={n.id} className={styles.noteItem}>
            <p className={styles.noteContent}>{n.content}</p>
            <p className={styles.noteTime}>{new Date(n.createdAt!).toLocaleString()}</p>
          </div>
        ))}
        {notes.length === 0 && <p className={styles.emptyState}>No notes.</p>}
      </div>
    </div>
  );
}