import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCustomerDetail, useSaveContact, useSaveProperty } from "../helpers/useCustomers";
import { useDocumentList, useCreateDocument } from "../helpers/useDocuments";
import { useTemplateList } from "../helpers/useTemplates";
import { getStatusBadge } from "../components/JobDocumentsShared";
import { Button } from "../components/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/Tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "../components/Select";
import { Input } from "../components/Input";
import { Plus, User, Mail, Phone, MapPin, Receipt } from "lucide-react";
import { z } from "zod";
import { schema as contactSchema } from "../endpoints/contacts/save_POST.schema";
import { schema as propertySchema } from "../endpoints/properties/save_POST.schema";
import { toast } from "sonner";
import styles from "./customers.$customerId.module.css";

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const id = parseInt(customerId!);
  const { data, isFetching } = useCustomerDetail(id);

  if (isFetching && !data) return <div>Loading...</div>;
  if (!data) return <div>Customer not found</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to="/customers" className={styles.backLink}>← Back to Customers</Link>
          <h1 className={styles.title}>{data.name}</h1>
          <div className={styles.meta}>
            {data.email && <span className={styles.metaItem}><Mail size={14}/> {data.email}</span>}
            {data.phone && <span className={styles.metaItem}><Phone size={14}/> {data.phone}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="contacts" className={styles.tabsContainer}>
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({data.contactCount})</TabsTrigger>
          <TabsTrigger value="properties">Properties ({data.propertyCount})</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className={styles.tabContent}>
          <ContactsTab customerId={id} contacts={data.contacts || []} />
        </TabsContent>
        <TabsContent value="properties" className={styles.tabContent}>
          <PropertiesTab customerId={id} properties={data.properties || []} />
        </TabsContent>
        <TabsContent value="estimates" className={styles.tabContent}>
          <EstimatesTab customerId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactsTab({ customerId, contacts }: { customerId: number, contacts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: saveContact } = useSaveContact();

  const form = useForm({
    schema: contactSchema,
    defaultValues: { customerId, firstName: "", lastName: "", email: "", phone: "", title: "" }
  });

  const onSubmit = async (values: z.infer<typeof contactSchema>) => {
    await saveContact(values);
    setIsOpen(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Contacts</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} /> Add Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                <FormItem name="firstName">
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input value={form.values.firstName} onChange={e => form.setValues(p => ({...p, firstName: e.target.value}))}/></FormControl>
                  <FormMessage/>
                </FormItem>
                <FormItem name="lastName">
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input value={form.values.lastName || ""} onChange={e => form.setValues(p => ({...p, lastName: e.target.value}))}/></FormControl>
                </FormItem>
                <FormItem name="email">
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" value={form.values.email || ""} onChange={e => form.setValues(p => ({...p, email: e.target.value}))}/></FormControl>
                </FormItem>
                <FormItem name="phone">
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input value={form.values.phone || ""} onChange={e => form.setValues(p => ({...p, phone: e.target.value}))}/></FormControl>
                </FormItem>
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className={styles.grid}>
        {contacts.map(c => (
          <div key={c.id} className={styles.gridItem}>
            <div className={styles.gridItemIcon}><User size={20}/></div>
            <div className={styles.gridItemDetails}>
              <p className={styles.gridItemTitle}>{c.firstName} {c.lastName}</p>
              {c.title && <p className={styles.gridItemSub}>{c.title}</p>}
              <p className={styles.gridItemMeta}>{c.email}</p>
              <p className={styles.gridItemMeta}>{c.phone}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertiesTab({ customerId, properties }: { customerId: number, properties: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: saveProperty } = useSaveProperty();

  const form = useForm({
    schema: propertySchema,
    defaultValues: { customerId, address: "", city: "", state: "", zip: "" }
  });

  const onSubmit = async (values: z.infer<typeof propertySchema>) => {
    await saveProperty(values);
    setIsOpen(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Properties</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} /> Add Property</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                <FormItem name="address">
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input value={form.values.address} onChange={e => form.setValues(p => ({...p, address: e.target.value}))}/></FormControl>
                  <FormMessage/>
                </FormItem>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <FormItem name="city" style={{flex: 1}}>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input value={form.values.city || ""} onChange={e => form.setValues(p => ({...p, city: e.target.value}))}/></FormControl>
                  </FormItem>
                  <FormItem name="state" style={{flex: 1}}>
                    <FormLabel>State</FormLabel>
                    <FormControl><Input value={form.values.state || ""} onChange={e => form.setValues(p => ({...p, state: e.target.value}))}/></FormControl>
                  </FormItem>
                  <FormItem name="zip" style={{flex: 1}}>
                    <FormLabel>ZIP</FormLabel>
                    <FormControl><Input value={form.values.zip || ""} onChange={e => form.setValues(p => ({...p, zip: e.target.value}))}/></FormControl>
                  </FormItem>
                </div>
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className={styles.grid}>
        {properties.map(p => (
          <div key={p.id} className={styles.gridItem}>
            <div className={styles.gridItemIcon}><MapPin size={20}/></div>
            <div className={styles.gridItemDetails}>
              <p className={styles.gridItemTitle}>{p.address}</p>
              <p className={styles.gridItemMeta}>{p.city}, {p.state} {p.zip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstimatesTab({ customerId }: { customerId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data, isFetching } = useDocumentList({ customerId, documentType: "estimate" });
  const estimates = data?.documents || [];

  const { data: templateData } = useTemplateList({ documentType: "estimate", isActive: true });
  const templates = templateData?.templates || [];

  const { mutateAsync: createDocument } = useCreateDocument();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    try {
      const res = await createDocument({ templateId: parseInt(selectedTemplateId), customerId });
      toast.success(`Estimate ${res.documentNumber} created`);
      setIsOpen(false);
      setSelectedTemplateId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create estimate");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Estimates</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} /> Create Estimate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Estimate</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className={styles.form}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Select Template</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!selectedTemplateId}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className={styles.grid}>
        {isFetching && estimates.length === 0 && <p className={styles.emptyText}>Loading...</p>}
        {!isFetching && estimates.length === 0 && <p className={styles.emptyText}>No estimates yet.</p>}
        {estimates.map(e => (
          <div key={e.id} className={styles.gridItem}>
            <div className={styles.gridItemIcon}><Receipt size={20}/></div>
            <div className={styles.gridItemDetails} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-2)' }}>
                <p className={styles.gridItemTitle}>{e.documentNumber}</p>
                {getStatusBadge(e.status)}
              </div>
              <p className={styles.gridItemSub}>
                {e.total != null ? `$${Number(e.total).toFixed(2)}` : "--"}
              </p>
              <p className={styles.gridItemMeta}>
                Created: {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ""}
              </p>
              {e.jobId && (
                <Link to={`/jobs/${e.jobId}?tab=documents`} className={styles.jobLink}>
                  View in Job
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}