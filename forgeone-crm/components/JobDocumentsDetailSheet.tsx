import React, { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Mail, FileSignature, Link as LinkIcon, ExternalLink } from "lucide-react";

import { Button } from "./Button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "./Sheet";
import { Badge } from "./Badge";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "./Form";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "./Select";
import { Skeleton } from "./Skeleton";
import { TemplatePreview } from "./TemplatePreview";

import {
  useDocument,
  useSaveDocument,
  useGenerateDocumentPdf,
  useSaveDocumentVersion,
  useDocumentReviewLinks,
  useCreateReviewLink,
  useRevokeReviewLink,
} from "../helpers/useDocuments";
import { ResolvedBlock, TemplateSettings, DEFAULT_TEMPLATE_SETTINGS } from "../helpers/templateBlockTypes";
import { formatDocType, getStatusBadge } from "./JobDocumentsShared";

import styles from "./JobDocumentsDetailSheet.module.css";

const formatCurrency = (val: string | number | null | undefined) => {
  if (val === null || val === undefined) return "$0.00";
  const num = Number(val);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const editDocSchema = z.object({
  notes: z.string().optional().nullable(),
  lineItems: z.array(
    z.object({
      id: z.number().optional(),
      description: z.string().min(1, "Required"),
      quantity: z.number(),
      unit: z.string().optional().nullable(),
      unitPrice: z.number(),
      category: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      sortOrder: z.number(),
    })
  ),
  subtotal: z.number().optional().nullable(),
  tax: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  total: z.number().optional().nullable(),
});

export function JobDocumentsDetailSheet({
  documentId,
  onClose,
  canEdit,
}: {
  documentId: number | null;
  onClose: () => void;
  canEdit: boolean;
}) {
  const { data, isLoading } = useDocument(documentId || 0);
  const { mutateAsync: saveDoc, isPending: isSaving } = useSaveDocument();
  const { mutateAsync: generatePdf, isPending: isGenerating } = useGenerateDocumentPdf();
  const { mutateAsync: saveVersion, isPending: isVersioning } = useSaveDocumentVersion();

  const { data: reviewLinksData } = useDocumentReviewLinks(documentId || 0);
  const { mutateAsync: createReviewLink, isPending: isCreatingLink } = useCreateReviewLink();
  const { mutateAsync: revokeReviewLink, isPending: isRevokingLink } = useRevokeReviewLink();

  const [latestLinkUrl, setLatestLinkUrl] = useState<string | null>(null);

  const doc = data?.document;
  const isDraft = doc?.status === "draft";
  const showEditControls = canEdit && isDraft;

  const form = useForm({
    schema: editDocSchema,
    defaultValues: {
      notes: "",
      lineItems: [],
      subtotal: null,
      tax: null,
      discount: null,
      total: null,
    },
  });

  // Auto-compute subtotal and total
  useEffect(() => {
    if (form.values.lineItems.length > 0) {
      const subtotal = form.values.lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      const tax = form.values.tax || 0;
      const discount = form.values.discount || 0;
      const total = subtotal + tax - discount;

      if (form.values.subtotal !== subtotal || form.values.total !== total) {
        form.setValues((prev) => ({
          ...prev,
          subtotal,
          total
        }));
      }
    }
  }, [form.values.lineItems, form.values.tax, form.values.discount, form.setValues]);

  // Sync loaded data to form
  useEffect(() => {
    if (doc) {
      form.setValues({
        notes: doc.notes || "",
        lineItems: (doc.lineItems || []).map((li) => ({
          id: li.id,
          description: li.description,
          quantity: Number(li.quantity),
          unit: li.unit || "",
          unitPrice: Number(li.unitPrice),
          category: li.category || "",
          notes: li.notes || "",
          sortOrder: li.sortOrder,
        })),
        subtotal: doc.subtotal ? Number(doc.subtotal) : null,
        tax: doc.tax ? Number(doc.tax) : null,
        discount: doc.discount ? Number(doc.discount) : null,
        total: doc.total ? Number(doc.total) : null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const onSubmit = async (values: z.infer<typeof editDocSchema>) => {
    if (!doc) return;
    try {
      await saveDoc({
        id: doc.id,
        notes: values.notes,
        subtotal: values.subtotal,
        tax: values.tax,
        discount: values.discount,
        total: values.total,
        lineItems: values.lineItems.map((li, idx) => ({ ...li, sortOrder: idx })),
      });
      toast.success("Document saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save document");
    }
  };

  const handleGeneratePdf = async () => {
    if (!doc) return;
    try {
      const res = await generatePdf({ documentId: doc.id });
      window.open(res.url, "_blank");
      toast.success("PDF generated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  };

  const handleCreateVersion = async () => {
    if (!doc) return;
    try {
      const res = await saveVersion({ documentId: doc.id, notes: "Manual snapshot" });
      toast.success(`Version ${res.versionNumber} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create version");
    }
  };

  const handleCreateLink = async () => {
    if (!doc) return;
    try {
      const res = await createReviewLink({ documentId: doc.id });
      setLatestLinkUrl(res.url);
      toast.success("Review link created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create link");
    }
  };

  const handleRevokeLink = async (linkId: number) => {
    try {
      await revokeReviewLink({ linkId });
      toast.success("Link revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke link");
    }
  };

  // Line item helpers
  const addLineItem = () => {
    form.setValues((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { description: "", quantity: 1, unit: "EA", unitPrice: 0, category: "", notes: "", sortOrder: prev.lineItems.length },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    form.setValues((prev) => {
      const updated = [...prev.lineItems];
      updated.splice(index, 1);
      return { ...prev, lineItems: updated };
    });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    form.setValues((prev) => {
      const updated = [...prev.lineItems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, lineItems: updated };
    });
  };

  // Safe parsing for preview
  const resolvedBlocks = useMemo(() => {
    if (!doc?.blocksSnapshot) return [];
    let blocks: any[] = [];
    try {
      blocks = typeof doc.blocksSnapshot === "string" ? JSON.parse(doc.blocksSnapshot) : doc.blocksSnapshot;
    } catch {
      return [];
    }

    const formLineItems = form.values.lineItems || [];
    const itemsToUse = formLineItems.length > 0 ? formLineItems : (doc.lineItems || []);

    return blocks.map((b: any) => {
      let newBlock = { ...b };
      
      if (newBlock.type === "estimateLineItems") {
        newBlock.resolvedData = {
          ...newBlock.resolvedData,
          items: itemsToUse.map((li: any) => ({
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: formatCurrency(li.unitPrice),
            total: formatCurrency(li.quantity * li.unitPrice)
          }))
        };
      } else if (newBlock.type === "totals") {
        newBlock.resolvedData = {
          ...newBlock.resolvedData,
          subtotal: formatCurrency(form.values.subtotal),
          tax: formatCurrency(form.values.tax),
          discount: formatCurrency(form.values.discount),
          total: formatCurrency(form.values.total)
        };
      }

      if (newBlock.resolvedContent) {
        newBlock.resolvedContent = newBlock.resolvedContent.replace(
          /\[Missing:\s*(Estimate|Contract|Work Order)\s*Number\]/gi,
          doc.documentNumber || ""
        );
      }

      return newBlock;
    });
  }, [doc, form.values.lineItems, form.values.subtotal, form.values.tax, form.values.discount, form.values.total]);

  const templateSettings = useMemo(() => {
    if (!doc?.settingsSnapshot) return DEFAULT_TEMPLATE_SETTINGS;
    try {
      return typeof doc.settingsSnapshot === "string" ? JSON.parse(doc.settingsSnapshot) : doc.settingsSnapshot;
    } catch {
      return DEFAULT_TEMPLATE_SETTINGS;
    }
  }, [doc]);

  const hasFinancials = doc?.documentType === "estimate" || doc?.documentType === "work_order" || doc?.documentType === "change_order";

  return (
    <Sheet open={!!documentId} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setLatestLinkUrl(null);
      }
    }}>
      <SheetContent side="right" className={styles.sheetContentWide}>
        {isLoading || !doc ? (
          <div className={styles.loadingContainer}>
            <Skeleton className={styles.skeletonLine} style={{ height: "40px", width: "50%" }} />
            <Skeleton className={styles.skeletonLine} style={{ height: "400px", width: "100%", marginTop: "2rem" }} />
          </div>
        ) : (
          <>
            <SheetHeader className={styles.sheetHeader}>
              <div>
                <SheetTitle className={styles.sheetTitle}>
                  {doc.documentNumber}
                  <span style={{ marginLeft: "var(--spacing-3)" }}>{getStatusBadge(doc.status)}</span>
                </SheetTitle>
                <SheetDescription>{formatDocType(doc.documentType)}</SheetDescription>
              </div>
              <div className={styles.sheetHeaderActions}>
                <Button variant="outline" size="sm" onClick={handleCreateVersion} disabled={isVersioning}>
                  Save Snapshot
                </Button>
                <Button variant="primary" size="sm" onClick={handleGeneratePdf} disabled={isGenerating}>
                  {doc.pdfStorageKey ? "View PDF" : "Generate PDF"}
                </Button>
              </div>
            </SheetHeader>

            <div className={styles.sheetBodyGrid}>
              <div className={styles.previewPanel}>
                <TemplatePreview resolvedBlocks={resolvedBlocks as ResolvedBlock[]} settings={templateSettings as TemplateSettings} />
              </div>

              <div className={styles.detailsPanel}>
                <Form {...form}>
                  <form id="doc-edit-form" onSubmit={form.handleSubmit(onSubmit)} className={styles.detailsForm}>
                    {hasFinancials && (
                      <div className={styles.detailsSection}>
                        <div className={styles.sectionHeader}>
                          <h3 className={styles.sectionTitle}>Line Items</h3>
                          {showEditControls && (
                            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                              <Plus size={14} /> Add Item
                            </Button>
                          )}
                        </div>
                        {form.values.lineItems.length === 0 ? (
                          <p className={styles.emptyText}>No line items specified.</p>
                        ) : (
                          <div className={styles.tableWrapper}>
                            <table className={styles.lineItemsTable}>
                              <thead>
                                <tr>
                                  <th style={{ width: "auto" }}>Description</th>
                                  <th style={{ width: "70px" }}>Qty</th>
                                  <th style={{ width: "90px" }}>Unit</th>
                                  <th style={{ width: "110px" }}>Price</th>
                                  <th style={{ width: "110px" }}>Total</th>
                                  {showEditControls && <th style={{ width: "40px" }}></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {form.values.lineItems.map((item, i) => (
                                  <tr key={i}>
                                    <td>
                                      {showEditControls ? (
                                        <Input
                                          value={item.description}
                                          onChange={(e) => updateLineItem(i, "description", e.target.value)}
                                        />
                                      ) : (
                                        item.description
                                      )}
                                    </td>
                                    <td>
                                      {showEditControls ? (
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                                        />
                                      ) : (
                                        item.quantity
                                      )}
                                    </td>
                                    <td>
                                      {showEditControls ? (
                                        <Select
                                          value={item.unit || "__empty"}
                                          onValueChange={(val) => updateLineItem(i, "unit", val === "__empty" ? "" : val)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__empty">None</SelectItem>
                                            <SelectItem value="EA">EA</SelectItem>
                                            <SelectItem value="SQ">SQ</SelectItem>
                                            <SelectItem value="SF">SF</SelectItem>
                                            <SelectItem value="LF">LF</SelectItem>
                                            <SelectItem value="HR">HR</SelectItem>
                                            <SelectItem value="DAY">DAY</SelectItem>
                                            <SelectItem value="LS">LS</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        item.unit || "-"
                                      )}
                                    </td>
                                    <td>
                                      {showEditControls ? (
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={item.unitPrice}
                                          onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))}
                                        />
                                      ) : (
                                        formatCurrency(item.unitPrice)
                                      )}
                                    </td>
                                    <td>{formatCurrency(item.quantity * item.unitPrice)}</td>
                                    {showEditControls && (
                                      <td>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => removeLineItem(i)}
                                          className={styles.destructiveIconBtn}
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className={styles.financialSummary}>
                          <div className={styles.finRow}>
                            <span>Subtotal</span>
                            {showEditControls && form.values.lineItems.length === 0 ? (
                              <Input
                                type="number"
                                step="0.01"
                                className={styles.finInput}
                                value={form.values.subtotal === null ? "" : form.values.subtotal}
                                onChange={(e) => form.setValues((p) => ({ ...p, subtotal: e.target.value ? Number(e.target.value) : null }))}
                              />
                            ) : (
                              <span>{formatCurrency(form.values.subtotal)}</span>
                            )}
                          </div>
                          <div className={styles.finRow}>
                            <span>Tax Amount ($)</span>
                            {showEditControls ? (
                              <Input
                                type="number"
                                step="0.01"
                                className={styles.finInput}
                                value={form.values.tax === null ? "" : form.values.tax}
                                onChange={(e) => form.setValues((p) => ({ ...p, tax: e.target.value ? Number(e.target.value) : null }))}
                              />
                            ) : (
                              <span>{formatCurrency(form.values.tax)}</span>
                            )}
                          </div>
                          <div className={styles.finRow}>
                            <span>Discount ($)</span>
                            {showEditControls ? (
                              <Input
                                type="number"
                                step="0.01"
                                className={styles.finInput}
                                value={form.values.discount === null ? "" : form.values.discount}
                                onChange={(e) => form.setValues((p) => ({ ...p, discount: e.target.value ? Number(e.target.value) : null }))}
                              />
                            ) : (
                              <span>{formatCurrency(form.values.discount)}</span>
                            )}
                          </div>
                          <div className={`${styles.finRow} ${styles.finTotal}`}>
                            <span>Total</span>
                            {showEditControls && form.values.lineItems.length === 0 ? (
                              <Input
                                type="number"
                                step="0.01"
                                className={styles.finInput}
                                value={form.values.total === null ? "" : form.values.total}
                                onChange={(e) => form.setValues((p) => ({ ...p, total: e.target.value ? Number(e.target.value) : null }))}
                              />
                            ) : (
                              <span>{formatCurrency(form.values.total)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={styles.detailsSection}>
                      <h3 className={styles.sectionTitle}>Notes</h3>
                      <FormItem name="notes">
                        <FormControl>
                          {showEditControls ? (
                            <Textarea
                              placeholder="Internal document notes..."
                              value={form.values.notes || ""}
                              onChange={(e) => form.setValues((p) => ({ ...p, notes: e.target.value }))}
                            />
                          ) : (
                            <div className={styles.readOnlyTextarea}>{form.values.notes || "No notes provided."}</div>
                          )}
                        </FormControl>
                      </FormItem>
                    </div>
                  </form>
                </Form>
                
                {/* Review Links Section */}
                <div className={styles.detailsSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Review Links</h3>
                    {canEdit && (
                      <Button type="button" variant="outline" size="sm" onClick={handleCreateLink} disabled={isCreatingLink}>
                        <LinkIcon size={14} /> Create Link
                      </Button>
                    )}
                  </div>
                  
                  {latestLinkUrl && (
                    <div className={styles.latestLinkContainer}>
                      <span className={styles.latestLinkText}>{latestLinkUrl}</span>
                      <div style={{ display: "flex", gap: "var(--spacing-1)" }}>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => {
                          window.open(latestLinkUrl, "_blank");
                        }}>
                          <ExternalLink size={14} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => {
                          navigator.clipboard.writeText(latestLinkUrl);
                          toast.success("Copied to clipboard");
                        }}>
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {reviewLinksData?.links && reviewLinksData.links.length > 0 ? (
                    <div className={styles.linksList}>
                      {reviewLinksData.links.map(link => (
                        <div key={link.id} className={styles.linkItem}>
                          <div className={styles.linkInfo}>
                            <span className={styles.linkVersion}>v{link.versionNumber}</span>
                            <span className={styles.linkDate}>
                              Created {link.createdAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "short" }).format(new Date(link.createdAt)) : ""}
                            </span>
                            {link.isRevoked ? (
                              <Badge variant="destructive">Revoked</Badge>
                            ) : link.expiresAt && new Date(link.expiresAt) < new Date() ? (
                              <Badge variant="outline">Expired</Badge>
                            ) : (
                              <Badge variant="success">Active</Badge>
                            )}
                            {link.viewedAt && (
                              <span className={styles.linkViewed}>
                                Viewed {new Intl.DateTimeFormat("en-US", { dateStyle: "short" }).format(new Date(link.viewedAt))}
                              </span>
                            )}
                          </div>
                          {canEdit && !link.isRevoked && (!link.expiresAt || new Date(link.expiresAt) > new Date()) && (
                            <Button type="button" variant="ghost" size="sm" className={styles.destructiveTextBtn} onClick={() => handleRevokeLink(link.id)} disabled={isRevokingLink}>
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyText}>No review links created.</p>
                  )}
                </div>

                {/* Email History Section */}
                <div className={styles.detailsSection}>
                  <h3 className={styles.sectionTitle}>Email History</h3>
                  {doc.emailLog && doc.emailLog.length > 0 ? (
                    <div className={styles.historyList}>
                      {doc.emailLog.map((log: any) => (
                        <div key={log.id} className={styles.historyItem}>
                          <div className={styles.historyMain}>
                            <Mail size={14} className={styles.historyIcon} />
                            <span>Sent to <strong>{log.recipientEmail}</strong></span>
                          </div>
                          <div className={styles.historyMeta}>
                            By {log.sentByName || "System"} on {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.sentAt))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyText}>No email history.</p>
                  )}
                </div>

                {/* Signatures Section */}
                <div className={styles.detailsSection}>
                  <h3 className={styles.sectionTitle}>Signatures</h3>
                  {doc.signatures && doc.signatures.length > 0 ? (
                    <div className={styles.historyList}>
                      {doc.signatures.map((sig: any) => (
                        <div key={sig.id} className={styles.historyItem}>
                          <div className={styles.historyMain}>
                            <FileSignature size={14} className={styles.historyIcon} />
                            <span>Signed by <strong>{sig.signerName}</strong> ({sig.signerRole})</span>
                          </div>
                          <div className={styles.historyMeta}>
                            On {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(sig.signedAt))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyText}>No signatures yet.</p>
                  )}
                </div>
              </div>
            </div>

            {showEditControls && (
              <SheetFooter className={styles.sheetFooter}>
                <Button type="submit" form="doc-edit-form" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}