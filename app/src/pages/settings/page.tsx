import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Authenticated } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Camera, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.js";

function OrgProfileSettings({ orgId }: { orgId: Id<"organizations"> }) {
  const org = useQuery(api.orgs.organizations.getById, { orgId });
  const updateOrg = useMutation(api.orgs.organizations.update);
  const generateLogoUrl = useMutation(api.orgs.organizations.generateLogoUploadUrl);
  const saveLogo = useMutation(api.orgs.organizations.saveLogo);
  const logoUrl = useQuery(api.orgs.organizations.getLogoUrl, { orgId });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: org?.name ?? "",
    phone: org?.phone ?? "",
    email: org?.email ?? "",
    website: org?.website ?? "",
    address: org?.address ?? "",
    city: org?.city ?? "",
    state: org?.state ?? "",
    zip: org?.zip ?? "",
    primaryColor: org?.primaryColor ?? "#1e293b",
    secondaryColor: org?.secondaryColor ?? "#f59e0b",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrg({ orgId, ...form });
      toast.success("Organization settings saved");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateLogoUrl({ orgId });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json() as { storageId: Id<"_storage"> };
      await saveLogo({ orgId, storageId });
      toast.success("Logo updated");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company identity</CardTitle>
          <CardDescription>How your company appears across ForgeOne.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Company logo</Label>
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="size-full object-contain" />
                ) : (
                  <Camera className="size-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : null}
                  {uploading ? "Uploading..." : "Upload logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2MB</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-name">Company name</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="primary-color"
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="secondary-color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} placeholder="(555) 000-0000" onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} placeholder="info@company.com" onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} placeholder="https://yourcompany.com" onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Street address</Label>
              <Input id="address" value={form.address} placeholder="123 Main St" onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} placeholder="Springfield" onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} placeholder="IL" onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" value={form.zip} placeholder="62701" onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { activeOrgId, activeMembership } = useMyOrgs();
  if (!activeOrgId) return null;

  return (
    <Authenticated>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your organization.</p>
        </div>
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="pipeline" disabled>Pipeline</TabsTrigger>
            <TabsTrigger value="categories" disabled>Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            <OrgProfileSettings orgId={activeOrgId} />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersSettings orgId={activeOrgId} isAdmin={activeMembership?.role === "admin"} />
          </TabsContent>
        </Tabs>
      </div>
    </Authenticated>
  );
}

function UsersSettings({ orgId, isAdmin }: { orgId: Id<"organizations">; isAdmin: boolean }) {
  const members = useQuery(api.orgs.memberships.listByOrg, { orgId });
  const invitations = useQuery(api.orgs.memberships.listInvitations, { orgId });
  const invite = useMutation(api.orgs.memberships.invite);
  const revokeInvitation = useMutation(api.orgs.memberships.revokeInvitation);
  const deactivateMember = useMutation(api.orgs.memberships.deactivateMember);
  const updateRole = useMutation(api.orgs.memberships.updateRole);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "sales">("sales");
  const [sending, setSending] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await invite({ orgId, email, role });
      setEmail("");
      toast.success(`Invitation sent to ${email}`);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to send invitation");
      }
    } finally {
      setSending(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = { admin: "Admin", manager: "Manager", sales: "Sales" };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a team member</CardTitle>
            <CardDescription>They will receive an email with a link to join. People without a ForgeOne account can sign up when they accept.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="sales">Sales</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : "Send invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {members?.filter((m) => m.status === "active").map((m) => (
              <div key={m._id} className="flex items-center justify-between py-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.userName ?? m.userEmail}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin ? (
                    <select
                      value={m.role}
                      onChange={async (e) => {
                        try {
                          await updateRole({ membershipId: m._id, role: e.target.value as "admin" | "manager" | "sales" });
                          toast.success("Role updated");
                        } catch {
                          toast.error("Failed to update role");
                        }
                      }}
                      className="h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="sales">Sales</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {ROLE_LABELS[m.role]}
                    </span>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await deactivateMember({ membershipId: m._id });
                          toast.success("Member deactivated");
                        } catch (err) {
                          if (err instanceof ConvexError) {
                            toast.error((err.data as { message: string }).message);
                          } else {
                            toast.error("Failed to deactivate");
                          }
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {invitations.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between py-3 gap-2">
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[inv.role]} — expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await revokeInvitation({ invitationId: inv._id });
                          toast.success("Invitation revoked");
                        } catch {
                          toast.error("Failed to revoke invitation");
                        }
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
