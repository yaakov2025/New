import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useSaveJobContact, 
  useSaveAppointment, 
  useUploadPhoto, 
  useDeletePhoto, 
  useUploadFile, 
  useDeleteFile, 
  useDownloadFile, 
  useSaveInsurance 
} from "../helpers/useJobs";
import { useCustomerDetail } from "../helpers/useCustomers";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "./Form";
import { Input } from "./Input";
import { z } from "zod";
import { Textarea } from "./Textarea";
import { UserPlus, Trash2, Pencil, Calendar as CalendarIcon, Image as ImageIcon, Upload, Download, FileText } from "lucide-react";
import styles from "./JobDetailTabs.module.css";

// ----------------------
// ContactsTab
// ----------------------

export function ContactsTab({ job, canEdit }: { job: any, canEdit: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: saveContact } = useSaveJobContact();
  const { data: customerDetail } = useCustomerDetail(job.customerId || null);

  const availableContacts = customerDetail?.contacts?.filter(c => !job.contacts.find((jc: any) => jc.id === c.id)) || [];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Contacts</h2>
        {canEdit && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm"><UserPlus size={16} /> Add Contact</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Contact to Job</DialogTitle></DialogHeader>
              <div className={styles.list}>
                {!job.customerId ? (
                  <p className={styles.emptyState}>Link a customer to this job first to add contacts.</p>
                ) : availableContacts.length === 0 ? (
                  <p className={styles.emptyState}>No available contacts to add.</p>
                ) : (
                  availableContacts.map(c => (
                    <div key={c.id} className={styles.contactItem}>
                      <div className={styles.contactInfo}>
                        <p className={styles.contactName}>{c.firstName} {c.lastName}</p>
                        <p className={styles.contactDetail}>{c.title || "No title"} • {c.email || "No email"}</p>
                      </div>
                      <Button size="sm" onClick={() => saveContact({ jobId: job.id, contactId: c.id, action: "add" })}>Add</Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className={styles.list}>
        {job.contacts.map((c: any) => (
          <div key={c.jobContactId} className={styles.contactItem}>
            <div className={styles.contactInfo}>
              <p className={styles.contactName}>{c.firstName} {c.lastName}</p>
              <p className={styles.contactDetail}>{c.title || "-"} • {c.email || "-"} • {c.phone || "-"}</p>
            </div>
            {canEdit && (
              <Button variant="ghost" size="icon-md" onClick={() => saveContact({ jobId: job.id, contactId: c.id, action: "remove" })}>
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
        {job.contacts.length === 0 && <p className={styles.emptyState}>No contacts linked to this job.</p>}
      </div>
    </div>
  );
}

// ----------------------
// AppointmentsTab
// ----------------------

const appointmentFormSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  scheduledAt: z.string().min(1, "Date is required"),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export function AppointmentsTab({ jobId, appointments, canEdit }: { jobId: number, appointments: any[], canEdit: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { mutateAsync: saveAppointment } = useSaveAppointment();

  const form = useForm({
    schema: appointmentFormSchema,
    defaultValues: {
      id: undefined,
      title: "",
      scheduledAt: "",
      location: "",
      notes: ""
    }
  });

  const openNew = () => {
    form.setValues({ id: undefined, title: "", scheduledAt: "", location: "", notes: "" });
    setEditId(null);
    setIsOpen(true);
  };

  const openEdit = (appt: any) => {
    const d = new Date(appt.scheduledAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const formattedDate = d.toISOString().slice(0, 16);

    form.setValues({
      id: appt.id,
      title: appt.title,
      scheduledAt: formattedDate,
      location: appt.location || "",
      notes: appt.notes || ""
    });
    setEditId(appt.id);
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof appointmentFormSchema>) => {
    await saveAppointment({
      id: values.id,
      jobId,
      title: values.title,
      scheduledAt: new Date(values.scheduledAt),
      location: values.location,
      notes: values.notes
    });
    setIsOpen(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Appointments</h2>
        {canEdit && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={openNew}><CalendarIcon size={16} /> Add Appointment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Appointment</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                  <FormItem name="title">
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input value={form.values.title} onChange={e => form.setValues(p => ({...p, title: e.target.value}))}/></FormControl>
                    <FormMessage />
                  </FormItem>
                  <FormItem name="scheduledAt">
                    <FormLabel>Scheduled At</FormLabel>
                    <FormControl><Input type="datetime-local" value={form.values.scheduledAt} onChange={e => form.setValues(p => ({...p, scheduledAt: e.target.value}))}/></FormControl>
                    <FormMessage />
                  </FormItem>
                  <FormItem name="location">
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input value={form.values.location || ""} onChange={e => form.setValues(p => ({...p, location: e.target.value}))}/></FormControl>
                  </FormItem>
                  <FormItem name="notes">
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea value={form.values.notes || ""} onChange={e => form.setValues(p => ({...p, notes: e.target.value}))}/></FormControl>
                  </FormItem>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className={styles.list}>
        {appointments.map(a => (
          <div key={a.id} className={styles.appointmentItem}>
            <div className={styles.appointmentInfo}>
              <p className={styles.appointmentTitle}>{a.title}</p>
              <p className={styles.appointmentDetail}>{new Date(a.scheduledAt!).toLocaleString()} {a.location ? `• ${a.location}` : ""}</p>
              {a.notes && <p className={styles.appointmentDetail}>{a.notes}</p>}
            </div>
            {canEdit && (
              <div className={styles.actions}>
                <Button variant="ghost" size="icon-md" onClick={() => openEdit(a)}><Pencil size={16} /></Button>
                <Button variant="ghost" size="icon-md" onClick={() => saveAppointment({ jobId, id: a.id, action: "delete" })}><Trash2 size={16} /></Button>
              </div>
            )}
          </div>
        ))}
        {appointments.length === 0 && <p className={styles.emptyState}>No appointments.</p>}
      </div>
    </div>
  );
}

// ----------------------
// PhotosTab
// ----------------------

export function PhotosTab({ jobId, photos, canEdit }: { jobId: number, photos: any[], canEdit: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { mutateAsync: uploadPhoto } = useUploadPhoto();
  const { mutateAsync: deletePhoto } = useDeletePhoto();
  const qc = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await uploadPhoto({ jobId, fileName: file.name, fileSize: file.size, contentType: file.type });
      await fetch(res.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      qc.invalidateQueries({ queryKey: ["job"] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Photos</h2>
        {canEdit && (
          <>
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" style={{ display: "none" }} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <ImageIcon size={16} /> {isUploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </>
        )}
      </div>
      <div className={styles.photoGrid}>
        {photos.map(p => (
          <div key={p.id} className={styles.photoCard}>
            <img src={p.url} alt={p.caption || "Job photo"} className={styles.photoImage} />
            <div className={styles.photoMeta}>
              <span className={styles.noteTime}>{new Date(p.createdAt!).toLocaleDateString()}</span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => deletePhoto({ photoId: p.id })}>
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            {p.caption && <p style={{ padding: "0 var(--spacing-2) var(--spacing-2)", margin: 0, fontSize: "0.875rem" }}>{p.caption}</p>}
          </div>
        ))}
      </div>
      {photos.length === 0 && <p className={styles.emptyState}>No photos.</p>}
    </div>
  );
}

// ----------------------
// FilesTab
// ----------------------

export function FilesTab({ jobId, files, canEdit }: { jobId: number, files: any[], canEdit: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { mutateAsync: uploadFile } = useUploadFile();
  const { mutateAsync: deleteFile } = useDeleteFile();
  const { mutateAsync: downloadFile } = useDownloadFile();
  const qc = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await uploadFile({ jobId, fileName: file.name, fileSize: file.size, contentType: file.type });
      await fetch(res.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      qc.invalidateQueries({ queryKey: ["job"] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (fileId: number) => {
    try {
      const res = await downloadFile({ fileId });
      window.open(res.url, "_blank");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Files</h2>
        {canEdit && (
          <>
            <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: "none" }} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload size={16} /> {isUploading ? "Uploading..." : "Upload File"}
            </Button>
          </>
        )}
      </div>
      <div className={styles.list}>
        {files.map(f => (
          <div key={f.id} className={styles.fileItem}>
            <div className={styles.fileInfo}>
              <p className={styles.fileName}><FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/>{f.fileName}</p>
              <p className={styles.fileMeta}>{(Number(f.fileSize) / 1024).toFixed(1)} KB • {new Date(f.createdAt!).toLocaleString()}</p>
            </div>
            <div className={styles.fileActions}>
              <Button variant="outline" size="sm" onClick={() => handleDownload(f.id)}>
                <Download size={16} /> Download
              </Button>
              {canEdit && (
                <Button variant="ghost" size="icon-md" onClick={() => deleteFile({ fileId: f.id })}>
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        ))}
        {files.length === 0 && <p className={styles.emptyState}>No files.</p>}
      </div>
    </div>
  );
}

// ----------------------
// InsuranceTab
// ----------------------

const insuranceFormSchema = z.object({
  jobId: z.number(),
  carrier: z.string().optional().nullable(),
  carrierPhone: z.string().optional().nullable(),
  carrierEmail: z.string().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
  claimNumber: z.string().optional().nullable(),
  deductible: z.number().optional().nullable(),
  coverageType: z.string().optional().nullable(),
  dateOfLoss: z.string().optional().nullable(),
  adjusterName: z.string().optional().nullable(),
  adjusterPhone: z.string().optional().nullable(),
  adjusterEmail: z.string().optional().nullable(),
});

export function InsuranceTab({ jobId, insurance, canEdit }: { jobId: number, insurance: any, canEdit: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const { mutateAsync: saveInsurance } = useSaveInsurance();

  const form = useForm({
    schema: insuranceFormSchema,
    defaultValues: {
      jobId,
      carrier: insurance?.carrier || "",
      carrierPhone: insurance?.carrierPhone || "",
      carrierEmail: insurance?.carrierEmail || "",
      policyNumber: insurance?.policyNumber || "",
      claimNumber: insurance?.claimNumber || "",
      deductible: insurance?.deductible ? Number(insurance.deductible) : undefined,
      coverageType: insurance?.coverageType || "",
      dateOfLoss: insurance?.dateOfLoss ? new Date(insurance.dateOfLoss).toISOString().slice(0, 10) : "",
      adjusterName: insurance?.adjusterName || "",
      adjusterPhone: insurance?.adjusterPhone || "",
      adjusterEmail: insurance?.adjusterEmail || ""
    }
  });

  const onSubmit = async (values: z.infer<typeof insuranceFormSchema>) => {
    const payload: any = { ...values };
    if (payload.dateOfLoss) {
      payload.dateOfLoss = new Date(payload.dateOfLoss);
    } else {
      payload.dateOfLoss = null;
    }
    await saveInsurance(payload);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Edit Insurance</h2>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className={styles.grid}>
              <FormItem name="carrier"><FormLabel>Carrier</FormLabel><FormControl><Input value={form.values.carrier || ""} onChange={e => form.setValues(p => ({...p, carrier: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="carrierPhone"><FormLabel>Carrier Phone</FormLabel><FormControl><Input value={form.values.carrierPhone || ""} onChange={e => form.setValues(p => ({...p, carrierPhone: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="carrierEmail"><FormLabel>Carrier Email</FormLabel><FormControl><Input value={form.values.carrierEmail || ""} onChange={e => form.setValues(p => ({...p, carrierEmail: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="policyNumber"><FormLabel>Policy Number</FormLabel><FormControl><Input value={form.values.policyNumber || ""} onChange={e => form.setValues(p => ({...p, policyNumber: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="claimNumber"><FormLabel>Claim Number</FormLabel><FormControl><Input value={form.values.claimNumber || ""} onChange={e => form.setValues(p => ({...p, claimNumber: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="deductible"><FormLabel>Deductible</FormLabel><FormControl><Input type="number" value={form.values.deductible || ""} onChange={e => form.setValues(p => ({...p, deductible: e.target.value ? Number(e.target.value) : null}))}/></FormControl></FormItem>
              <FormItem name="coverageType"><FormLabel>Coverage Type</FormLabel><FormControl><Input value={form.values.coverageType || ""} onChange={e => form.setValues(p => ({...p, coverageType: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="dateOfLoss"><FormLabel>Date of Loss</FormLabel><FormControl><Input type="date" value={form.values.dateOfLoss || ""} onChange={e => form.setValues(p => ({...p, dateOfLoss: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="adjusterName"><FormLabel>Adjuster Name</FormLabel><FormControl><Input value={form.values.adjusterName || ""} onChange={e => form.setValues(p => ({...p, adjusterName: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="adjusterPhone"><FormLabel>Adjuster Phone</FormLabel><FormControl><Input value={form.values.adjusterPhone || ""} onChange={e => form.setValues(p => ({...p, adjusterPhone: e.target.value}))}/></FormControl></FormItem>
              <FormItem name="adjusterEmail"><FormLabel>Adjuster Email</FormLabel><FormControl><Input value={form.values.adjusterEmail || ""} onChange={e => form.setValues(p => ({...p, adjusterEmail: e.target.value}))}/></FormControl></FormItem>
            </div>
            <div style={{ padding: "var(--spacing-6)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "var(--spacing-2)" }}>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Insurance Information</h2>
        {canEdit && <Button size="sm" onClick={() => setIsEditing(true)}>Edit Insurance</Button>}
      </div>
      <div className={styles.grid}>
        {insurance ? (
          <>
            <div className={styles.field}><span className={styles.fieldLabel}>Carrier</span><span className={styles.fieldValue}>{insurance.carrier || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Carrier Phone</span><span className={styles.fieldValue}>{insurance.carrierPhone || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Carrier Email</span><span className={styles.fieldValue}>{insurance.carrierEmail || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Policy Number</span><span className={styles.fieldValue}>{insurance.policyNumber || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Claim Number</span><span className={styles.fieldValue}>{insurance.claimNumber || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Deductible</span><span className={styles.fieldValue}>{insurance.deductible ? `$${Number(insurance.deductible).toLocaleString()}` : "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Coverage Type</span><span className={styles.fieldValue}>{insurance.coverageType || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Date of Loss</span><span className={styles.fieldValue}>{insurance.dateOfLoss ? new Date(insurance.dateOfLoss).toLocaleDateString() : "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Adjuster Name</span><span className={styles.fieldValue}>{insurance.adjusterName || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Adjuster Phone</span><span className={styles.fieldValue}>{insurance.adjusterPhone || "-"}</span></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Adjuster Email</span><span className={styles.fieldValue}>{insurance.adjusterEmail || "-"}</span></div>
          </>
        ) : (
          <p className={styles.emptyState} style={{ gridColumn: "1 / -1" }}>No insurance details recorded.</p>
        )}
      </div>
    </div>
  );
}