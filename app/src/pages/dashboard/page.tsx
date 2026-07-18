import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Navigate, Link } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { formatDateTime } from "@/pages/jobs/_lib/format.ts";

function DashboardInner() {
  const { activeOrgId, activeMembership, myOrgs } = useMyOrgs();

  if (myOrgs.length === 0) return <Navigate to="/onboarding" replace />;
  if (!activeOrgId) return <div className="flex items-center justify-center h-full"><Spinner className="size-6" /></div>;

  const org = activeMembership?.org;

  const stats = useQuery(api.crm.stats.pipelineCounts, { orgId: activeOrgId });

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{org?.name}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Jobs", value: stats ? String(stats.activeJobCount) : "…", note: stats ? `${stats.needsReviewCount} need review` : "Loading" },
          { label: "Needs Review", value: stats ? String(stats.needsReviewCount) : "…", note: "Flagged for follow-up" },
          { label: "Open Tasks", value: stats ? String(stats.openTasksCount) : "…", note: "Across all jobs" },
          { label: "Open Leads", value: stats ? String(stats.openLeads) : "…", note: stats ? `${stats.openOpportunities} opportunities` : "Loading" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{card.label}</p>
            <p className="text-3xl font-display font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.note}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">Recent Jobs</h2>
          {!stats ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : stats.recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet. <Link to="/jobs" className="text-primary hover:underline cursor-pointer">Create one</Link></p>
          ) : (
            <div className="space-y-2">
              {stats.recentJobs.map((job) => (
                <Link
                  key={job._id}
                  to={`/jobs/${job._id}`}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{job.name}</p>
                    {job.customerName && <p className="text-xs text-muted-foreground">{job.customerName}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">{job.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">Upcoming Appointments</h2>
          {!stats ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : stats.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <div className="space-y-2">
              {stats.upcomingAppointments.map((appt) => (
                <div key={appt._id} className="flex items-center justify-between p-2.5 rounded-md border border-border/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{appt.title}</p>
                    <p className="text-xs text-muted-foreground">{appt.jobName ?? "Job"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">{formatDateTime(appt.scheduledAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center h-full">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>
      <Authenticated>
        <DashboardInner />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Please sign in to continue.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
