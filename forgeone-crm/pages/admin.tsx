import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "../endpoints/admin/overview_GET.schema";
import { Skeleton } from "../components/Skeleton";
import { Building2, Users } from "lucide-react";
import styles from "./admin.module.css";

export default function AdminPage() {
  const { data, isFetching, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getAdminOverview(),
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const numberFormatter = new Intl.NumberFormat("en-US");

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Failed to load admin overview</h2>
          <p>{error instanceof Error ? error.message : "Unknown error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform Administration</h1>
          <p className={styles.subtitle}>Overview of all organizations and users across the platform.</p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Total Organizations</h3>
            <Building2 className={styles.statIcon} size={20} />
          </div>
          {isFetching && !data ? (
            <Skeleton className={styles.statValueSkeleton} />
          ) : (
            <div className={styles.statValue}>{numberFormatter.format(data?.totalOrgs || 0)}</div>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Total Users</h3>
            <Users className={styles.statIcon} size={20} />
          </div>
          {isFetching && !data ? (
            <Skeleton className={styles.statValueSkeleton} />
          ) : (
            <div className={styles.statValue}>{numberFormatter.format(data?.totalUsers || 0)}</div>
          )}
        </div>
      </div>

      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Organizations</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Slug</th>
                <th className={styles.th}>Members</th>
                <th className={styles.th}>Jobs</th>
                <th className={styles.th}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    <td className={styles.td}><Skeleton style={{ width: "120px" }} /></td>
                    <td className={styles.td}><Skeleton style={{ width: "80px" }} /></td>
                    <td className={styles.td}><Skeleton style={{ width: "40px" }} /></td>
                    <td className={styles.td}><Skeleton style={{ width: "40px" }} /></td>
                    <td className={styles.td}><Skeleton style={{ width: "100px" }} /></td>
                  </tr>
                ))
              ) : data?.organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>No organizations found.</td>
                </tr>
              ) : (
                data?.organizations.map((org) => (
                  <tr key={org.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.orgName}>{org.name}</span>
                    </td>
                    <td className={styles.td}>
                      <code className={styles.slug}>{org.slug}</code>
                    </td>
                    <td className={styles.td}>{numberFormatter.format(org.memberCount)}</td>
                    <td className={styles.td}>{numberFormatter.format(org.jobCount)}</td>
                    <td className={styles.td}>
                      {org.createdAt ? dateFormatter.format(new Date(org.createdAt)) : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}