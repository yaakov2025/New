import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { UserRound, Plus, Trash2, Mail, Phone } from "lucide-react";

const NONE = "none";

export function ContactsTab({ orgId, jobId }: { orgId: Id<"organizations">; jobId: Id<"jobs"> }) {
  const jobContacts = useQuery(api.jobs.contacts.list, { jobId, orgId });
  const orgContacts = useQuery(api.crm.contacts.list, { orgId });
  const addContact = useMutation(api.jobs.contacts.add);
  const removeContact = useMutation(api.jobs.contacts.remove);

  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>(NONE);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  const linkedIds = new Set((jobContacts ?? []).map((c) => c.contactId));
  const available = (orgContacts ?? []).filter((c) => !linkedIds.has(c._id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactId === NONE) return;
    setSaving(true);
    try {
      await addContact({ jobId, orgId, contactId: contactId as Id<"contacts">, role: role.trim() || undefined });
      toast.success("Contact added");
      setOpen(false);
      setContactId(NONE);
      setRole("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (jobContactId: Id<"jobContacts">) => {
    try {
      await removeContact({ jobContactId, orgId });
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Linked contacts</h3>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="h-7 gap-1 text-xs">
          <Plus className="size-3" /> Add
        </Button>
      </div>

      {jobContacts === undefined ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : jobContacts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><UserRound /></EmptyMedia>
            <EmptyTitle>No contacts linked</EmptyTitle>
            <EmptyDescription>Link contacts involved with this job</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Add Contact
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-2">
          {jobContacts.map((link) => (
            <div key={link._id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-center size-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                <UserRound className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {link.contact ? `${link.contact.firstName} ${link.contact.lastName ?? ""}`.trim() : "Unknown contact"}
                  </span>
                  {link.role && <span className="text-xs text-muted-foreground">· {link.role}</span>}
                </div>
                <div className="flex gap-3 mt-0.5">
                  {link.contact?.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <Mail className="size-3 shrink-0" /> {link.contact.email}
                    </span>
                  )}
                  {link.contact?.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Phone className="size-3" /> {link.contact.phone}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(link._id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select a contact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} disabled>Select a contact</SelectItem>
                  {available.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {`${c.firstName} ${c.lastName ?? ""}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {available.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  All contacts are linked, or none exist yet. Add contacts from the Customers section.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role (optional)</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Property owner, tenant..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || contactId === NONE}>Add Contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
