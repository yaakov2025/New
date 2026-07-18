import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "convex/react";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge.tsx";
import type { Id } from "@/convex/_generated/dataModel.js";

function OrgDetailInner({ orgId }: { orgId: Id<"organizations"> }) {
  const org = useQuery(api.orgs.organizations.getById, { orgId });
  const auditLog = useQuery(api.platform.admin.getOrgAuditLog, { orgId });

  if (!org) return <p className="p-6 text-muted-foreground text-sm">Loading...</p>;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/platform" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold">{org.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
        </div>
        <Badge variant={org.status === "active" ? "default" : "destructive"}>{org.status}</Badge>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Shield className="size-4 text-accent" />
          <h2 className="font-semibold text-sm">Platform access log (last 200 entries)</h2>
        </div>
        <div className="divide-y divide-border">
          {auditLog?.map((entry) => (
            <div key={entry._id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-mono font-medium text-foreground">{entry.action}</p>
                  {entry.recordType && (
                    <p className="text-xs text-muted-foreground">
                      {entry.recordType}: {entry.recordId}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {new Date(entry._creationTime).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {auditLog?.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">No access log entries yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlatformOrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  return (
    <Authenticated>
      <OrgDetailInner orgId={orgId as Id<"organizations">} />
    </Authenticated>
  );
}
