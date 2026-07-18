import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "convex/react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Shield, Users, Building2, ExternalLink } from "lucide-react";

function PlatformAdminInner() {
  const orgs = useQuery(api.platform.admin.listAllOrgs, {});
  const users = useQuery(api.platform.admin.listAllUsers, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="size-6 text-accent" />
        <div>
          <h1 className="text-2xl font-display font-bold">Platform Admin</h1>
          <p className="text-muted-foreground text-sm">ForgeOne platform management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Building2 className="size-4" />
            <span>Total organizations</span>
          </div>
          <p className="text-3xl font-display font-bold">{orgs?.length ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="size-4" />
            <span>Total users</span>
          </div>
          <p className="text-3xl font-display font-bold">{users?.length ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">All organizations</h2>
        </div>
        <div className="divide-y divide-border">
          {orgs?.map((org) => (
            <div key={org._id} className="flex items-center justify-between px-5 py-3 gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{org.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={org.status === "active" ? "default" : "destructive"} className="text-xs">
                  {org.status}
                </Badge>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                  <Link to={`/platform/organizations/${org._id}`}>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
          {orgs?.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">No organizations yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return (
    <Authenticated>
      <PlatformAdminInner />
    </Authenticated>
  );
}
