import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ArrowLeft, Building2, UserRound, Mail, Phone, Globe, MapPin,
  Plus, Pencil, Trash2, Star,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.js";

// ── Contact sub-section ──────────────────────────────────────────────────────

function ContactsSection({ orgId, customerId }: { orgId: Id<"organizations">; customerId: Id<"customers"> }) {
  const contacts = useQuery(api.crm.contacts.list, { orgId, customerId });
  const createContact = useMutation(api.crm.contacts.create);
  const updateContact = useMutation(api.crm.contacts.update);
  const deleteContact = useMutation(api.crm.contacts.remove);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof contacts extends (infer T)[] | undefined ? T : never) | null>(null);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", isPrimary: false });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContact({ orgId, customerId, ...form, isPrimary: form.isPrimary });
      toast.success("Contact added");
      setCreateOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", title: "", isPrimary: false });
    } catch (err) {
      toast.error("Failed to add contact");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Contacts</h3>
        <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)} className="h-7 gap-1 text-xs">
          <Plus className="size-3" /> Add
        </Button>
      </div>

      {contacts === undefined ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No contacts yet</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c._id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-center size-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                <UserRound className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{c.firstName} {c.lastName}</span>
                  {c.isPrimary && <Star className="size-3 text-amber-500 fill-amber-500" />}
                </div>
                {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                <div className="flex gap-3 mt-0.5">
                  {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  try {
                    await deleteContact({ contactId: c._id, orgId });
                    toast.success("Contact removed");
                  } catch {
                    toast.error("Failed to remove contact");
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name *</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="John" required />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Operations Manager" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.firstName.trim()}>Add Contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Properties sub-section ───────────────────────────────────────────────────

function PropertiesSection({ orgId, customerId }: { orgId: Id<"organizations">; customerId: Id<"customers"> }) {
  const properties = useQuery(api.crm.properties.list, { orgId, customerId });
  const createProperty = useMutation(api.crm.properties.create);
  const deleteProperty = useMutation(api.crm.properties.remove);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", zip: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProperty({ orgId, customerId, ...form, name: form.name || undefined });
      toast.success("Property added");
      setCreateOpen(false);
      setForm({ name: "", address: "", city: "", state: "", zip: "" });
    } catch {
      toast.error("Failed to add property");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Properties</h3>
        <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)} className="h-7 gap-1 text-xs">
          <Plus className="size-3" /> Add
        </Button>
      </div>

      {properties === undefined ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : properties.length === 0 ? (
        <p className="text-xs text-muted-foreground">No service properties yet</p>
      ) : (
        <div className="space-y-2">
          {properties.map((p) => (
            <div key={p._id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {p.name && <p className="text-sm font-medium text-foreground">{p.name}</p>}
                <p className="text-sm text-foreground">{p.address}</p>
                {(p.city || p.state) && (
                  <p className="text-xs text-muted-foreground">{[p.city, p.state, p.zip].filter(Boolean).join(", ")}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  try {
                    await deleteProperty({ propertyId: p._id, orgId });
                    toast.success("Property removed");
                  } catch {
                    toast.error("Failed to remove property");
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Name (optional)</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Main Office" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address *</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Main St" required />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="San Francisco" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="CA" />
              </div>
              <div className="space-y-1.5">
                <Label>Zip</Label>
                <Input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} placeholder="94102" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.address.trim()}>Add Property</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main customer detail page ────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { activeOrgId } = useMyOrgs();
  const updateCustomer = useMutation(api.crm.customers.update);
  const deleteCustomer = useMutation(api.crm.customers.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const customer = useQuery(
    api.crm.customers.get,
    activeOrgId && customerId
      ? { customerId: customerId as Id<"customers">, orgId: activeOrgId }
      : "skip",
  );

  const [form, setForm] = useState({
    name: "",
    type: "company" as "company" | "individual",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  const openEdit = () => {
    if (!customer) return;
    setForm({
      name: customer.name,
      type: customer.type,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      website: customer.website ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zip: customer.zip ?? "",
      notes: customer.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !activeOrgId) return;
    try {
      await updateCustomer({
        customerId: customer._id,
        orgId: activeOrgId,
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zip: form.zip.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Customer updated");
      setEditOpen(false);
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to update customer");
      }
    }
  };

  const handleDelete = async () => {
    if (!customer || !activeOrgId) return;
    try {
      await deleteCustomer({ customerId: customer._id, orgId: activeOrgId });
      toast.success("Customer deleted");
      navigate("/customers");
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  if (!activeOrgId) return null;

  if (customer === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate("/customers")} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex items-center justify-center size-9 rounded-full shrink-0 ${customer.type === "company" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"}`}>
            {customer.type === "company" ? <Building2 className="size-4" /> : <UserRound className="size-4" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{customer.name}</h1>
            <Badge variant="secondary" className="text-[10px] capitalize">{customer.type}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="overview" className="h-full">
          <div className="px-6 border-b border-border">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              {(["overview", "contacts", "properties"] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="capitalize h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Contact Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${customer.email}`} className="hover:underline truncate">{customer.email}</a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone className="size-3.5 text-muted-foreground shrink-0" />
                      <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                    </div>
                  )}
                  {customer.website && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Globe className="size-3.5 text-muted-foreground shrink-0" />
                      <a href={customer.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{customer.website}</a>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-start gap-2 text-foreground">
                      <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-foreground">
                        {customer.address && <span className="block">{customer.address}</span>}
                        {(customer.city || customer.state) && (
                          <span className="block">{[customer.city, customer.state, customer.zip].filter(Boolean).join(", ")}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {!customer.email && !customer.phone && !customer.website && !customer.address && (
                    <p className="text-muted-foreground">No contact info</p>
                  )}
                </CardContent>
              </Card>
              {customer.notes && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-line">{customer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="p-6">
            <ContactsSection orgId={activeOrgId} customerId={customer._id} />
          </TabsContent>

          <TabsContent value="properties" className="p-6">
            <PropertiesSection orgId={activeOrgId} customerId={customer._id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "company" | "individual" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{customer.name}</strong> and cannot be undone. Their contacts and properties will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
