import React, { useState } from "react";
import { useAuth } from "../helpers/useAuth";
import { useOrgList, useOrgMembers } from "../helpers/useOrganizations";
import { useUpdateMember } from "../helpers/useOrgMemberMutations";
import { postUpdateOrg } from "../endpoints/org/update_POST.schema";
import { postInviteMember } from "../endpoints/org/invite_POST.schema";
import { Button } from "../components/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/Tabs";
import { Input } from "../components/Input";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Badge } from "../components/Badge";
import { useOrgInvitations, useResendInvitation, ORG_INVITATIONS_QUERY_KEY } from "../helpers/useOrgInvitations";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { z } from "zod";
import { schema as orgSchema } from "../endpoints/org/update_POST.schema";
import { schema as inviteSchema } from "../endpoints/org/invite_POST.schema";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { authState } = useAuth();
  
  if (authState.type !== "authenticated") return null;
  const isAdmin = authState.user.currentOrgRole === "admin";

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <Tabs defaultValue="profile" className={styles.tabsContainer}>
        <TabsList>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="org">Organization</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Profile Information</h2></div>
            <div className={styles.cardContent}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Name</span>
                <span className={styles.fieldValue}>{authState.user.displayName}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={styles.fieldValue}>{authState.user.email}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="org" className={styles.tabContent}>
              <OrgSettingsTab />
            </TabsContent>
            <TabsContent value="members" className={styles.tabContent}>
              <MembersTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function OrgSettingsTab() {
  const { data: orgsData } = useOrgList();
  const { authState } = useAuth();
  
  const currentOrg = orgsData?.orgs.find(o => o.id === (authState.type === "authenticated" ? authState.user.currentOrgId : null));

  const form = useForm({
    schema: orgSchema,
    defaultValues: { name: currentOrg?.name || "", email: currentOrg?.email || "" }
  });

  const onSubmit = async (values: z.infer<typeof orgSchema>) => {
    await postUpdateOrg(values);
    window.location.reload(); // Refresh to update context
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Organization Details</h2></div>
      <div className={styles.cardContent}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormItem name="name">
              <FormLabel>Organization Name</FormLabel>
              <FormControl><Input value={form.values.name} onChange={e => form.setValues(p => ({...p, name: e.target.value}))}/></FormControl>
            </FormItem>
            <Button type="submit">Save Changes</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

function MembersTab() {
  const qc = useQueryClient();
  const { data: membersData, refetch } = useOrgMembers();
  const { mutateAsync: updateMember } = useUpdateMember();
  const { data: invitationsData } = useOrgInvitations();
  const { mutateAsync: resendInvitation, isPending: isResending } = useResendInvitation();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const form = useForm({
    schema: inviteSchema,
    defaultValues: { email: "", role: "sales" as const }
  });

  const onSubmit = async (values: z.infer<typeof inviteSchema>) => {
    try {
      const res = await postInviteMember(values);
      if (res.emailSent) {
        toast.success("Invitation sent and email delivered!");
      } else {
        toast.success("Invitation created! Email failed to send. Copy the link to share manually.");
      }
      form.setValues({ email: "", role: "sales" });
      setIsInviteOpen(false);
      qc.invalidateQueries({ queryKey: ["orgMembers"] });
      qc.invalidateQueries({ queryKey: ORG_INVITATIONS_QUERY_KEY });
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Members</h2>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild><Button size="sm">Invite Member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                <FormItem name="email">
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" value={form.values.email} onChange={e => form.setValues(p => ({...p, email: e.target.value}))}/></FormControl>
                </FormItem>
                <FormItem name="role">
                  <FormLabel>Role</FormLabel>
                  <Select value={form.values.role} onValueChange={v => form.setValues(p => ({...p, role: v as any}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
                <DialogFooter><Button type="submit">Send Invite</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          {membersData?.members.map(m => (
            <tr key={m.id}>
              <td>{m.displayName}</td>
              <td>{m.email}</td>
              <td>
                <Select value={m.role} onValueChange={(role) => { updateMember({ memberId: m.id, role: role as any }).then(() => refetch()) }}>
                  <SelectTrigger className={styles.roleSelect}><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td>
                <Button variant="destructive" size="sm" onClick={() => { updateMember({ memberId: m.id, action: "remove" }).then(() => refetch()) }}>Remove</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "var(--spacing-8)" }}>
        <h3 className={styles.cardTitle} style={{ marginBottom: "var(--spacing-4)", fontSize: "1rem" }}>Pending Invitations</h3>
        <table className={styles.table}>
          <thead><tr><th>Email</th><th>Role</th><th>Invited</th><th>Expires</th><th>Actions</th></tr></thead>
          <tbody>
            {(!invitationsData?.invitations || invitationsData.invitations.length === 0) ? (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>No pending invitations.</td></tr>
            ) : (
              invitationsData.invitations.map(inv => {
                const isExpired = new Date(inv.expiresAt) < new Date();
                return (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td><Badge variant="outline">{inv.role}</Badge></td>
                    <td>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"}</td>
                    <td style={{ color: isExpired ? "var(--error)" : undefined }}>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={isResending}
                          onClick={async () => {
                            await resendInvitation(inv.id);
                          }}
                        >
                          <RefreshCw size={14} /> Resend
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                            toast.success("Invite link copied to clipboard!");
                          }}
                        >
                          <Copy size={14} /> Copy Link
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}