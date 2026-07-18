import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { OverviewTab } from "./_components/overview-tab.tsx";
import { ActivityTab } from "./_components/activity-tab.tsx";
import { ContactsTab } from "./_components/contacts-tab.tsx";
import { TasksTab } from "./_components/tasks-tab.tsx";
import { AppointmentsTab } from "./_components/appointments-tab.tsx";
import NotesTab from "./_components/notes-tab.tsx";
import PhotosTab from "./_components/photos-tab.tsx";
import FilesTab from "./_components/files-tab.tsx";
import InsuranceTab from "./_components/insurance-tab.tsx";
import { JobFormDialog } from "./_components/job-form-dialog.tsx";

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { activeOrgId } = useMyOrgs();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteJob = useMutation(api.jobs.jobs.remove);

  const job = useQuery(
    api.jobs.jobs.get,
    activeOrgId && jobId ? { jobId: jobId as Id<"jobs">, orgId: activeOrgId } : "skip",
  );

  const statuses = useQuery(
    api.jobs.statuses.list,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const handleDelete = async () => {
    if (!job || !activeOrgId) return;
    try {
      await deleteJob({ jobId: job._id, orgId: activeOrgId });
      toast.success("Job deleted");
      navigate("/jobs");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  if (!activeOrgId) return null;

  if (job === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statusConfig = statuses?.find((s) => s.name === job.status);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary shrink-0">
            <Briefcase className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{job.name}</h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: statusConfig?.color ? `${statusConfig.color}20` : undefined,
                  color: statusConfig?.color ?? undefined,
                }}
                className="text-[10px]"
              >
                {job.status}
              </Badge>
              {job.needsReview && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="size-3" /> Needs Review
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="border-b border-border px-6 shrink-0">
            <TabsList className="h-10 bg-transparent gap-4 p-0">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Overview</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Activity</TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Contacts</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Tasks</TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Appointments</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Notes</TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Photos</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Files</TabsTrigger>
              {job.isInsuranceJob && (
                <TabsTrigger value="insurance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">Insurance</TabsTrigger>
              )}
            </TabsList>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="p-6 mt-0">
              <OverviewTab job={job} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="activity" className="p-6 mt-0">
              <ActivityTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="contacts" className="p-6 mt-0">
              <ContactsTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="tasks" className="p-6 mt-0">
              <TasksTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="appointments" className="p-6 mt-0">
              <AppointmentsTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="notes" className="p-6 mt-0">
              <NotesTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="photos" className="p-6 mt-0">
              <PhotosTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            <TabsContent value="files" className="p-6 mt-0">
              <FilesTab jobId={job._id} orgId={activeOrgId} />
            </TabsContent>
            {job.isInsuranceJob && (
              <TabsContent value="insurance" className="p-6 mt-0">
                <InsuranceTab jobId={job._id} orgId={activeOrgId} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this job and all associated data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <JobFormDialog
        orgId={activeOrgId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        job={job}
      />
    </div>
  );
}
