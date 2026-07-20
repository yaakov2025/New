import React from "react";
import { Link } from "react-router-dom";
import { useDashboardSummary } from "../helpers/useDashboard";
import { Skeleton } from "../components/Skeleton";
import { Badge } from "../components/Badge";
import { Briefcase, AlertCircle, CheckSquare, Calendar as CalendarIcon } from "lucide-react";
import styles from "./_index.module.css";

export default function DashboardPage() {
  const { data, isFetching } = useDashboardSummary();

  if (isFetching && !data) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <div className={styles.statsGrid}>
          <Skeleton className={styles.statCardSkeleton} />
          <Skeleton className={styles.statCardSkeleton} />
          <Skeleton className={styles.statCardSkeleton} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Open Jobs</span>
            <Briefcase size={20} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>{data.openJobsCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Needs Review</span>
            <AlertCircle size={20} className={`${styles.statIcon} ${styles.iconWarning}`} />
          </div>
          <div className={styles.statValue}>{data.needsReviewCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Open Tasks</span>
            <CheckSquare size={20} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>{data.openTasksCount}</div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Jobs</h2>
            <Link to="/jobs" className={styles.panelLink}>View all</Link>
          </div>
          <div className={styles.panelContent}>
            {data.recentJobs.length === 0 ? (
              <p className={styles.emptyState}>No recent jobs.</p>
            ) : (
              <ul className={styles.list}>
                {data.recentJobs.map(job => (
                  <li key={job.id} className={styles.listItem}>
                    <Link to={`/jobs/${job.id}`} className={styles.itemLink}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{job.name}</span>
                        {job.needsReview && <Badge variant="warning">Review</Badge>}
                      </div>
                      <span className={styles.itemMeta}>{job.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Upcoming Appointments</h2>
          </div>
          <div className={styles.panelContent}>
            {data.upcomingAppointments.length === 0 ? (
              <p className={styles.emptyState}>No upcoming appointments.</p>
            ) : (
              <ul className={styles.list}>
                {data.upcomingAppointments.map(apt => (
                  <li key={apt.id} className={styles.listItem}>
                    <Link to={`/jobs/${apt.jobId}`} className={styles.itemLink}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{apt.title}</span>
                      </div>
                      <span className={styles.itemMeta}>
                        <CalendarIcon size={14} className={styles.metaIcon} />
                        {new Date(apt.scheduledAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Open Tasks</h2>
          </div>
          <div className={styles.panelContent}>
            {data.openTasks.length === 0 ? (
              <p className={styles.emptyState}>No open tasks.</p>
            ) : (
              <ul className={styles.list}>
                {data.openTasks.map(task => (
                  <li key={task.id} className={styles.listItem}>
                    <div className={styles.itemLink}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{task.title}</span>
                      </div>
                      {task.dueDate && (
                        <span className={styles.itemMeta}>
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}