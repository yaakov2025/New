import React, { useState } from "react";
import { toast } from "sonner";
import { Download, FilePlus, Ban, Mail } from "lucide-react";

import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

import {
  useDocumentList,
  useGenerateDocumentPdf,
  useVoidDocument,
} from "../helpers/useDocuments";

import { JobDocumentsCreateDialog } from "./JobDocumentsCreateDialog";
import { JobDocumentsDetailSheet } from "./JobDocumentsDetailSheet";
import { JobDocumentsSendDialog } from "./JobDocumentsSendDialog";
import { getDocIcon, getStatusBadge, formatDocType } from "./JobDocumentsShared";
import styles from "./JobDocumentsTab.module.css";

// ----------------------------------------------------------------------
// Main Tab Component
// ----------------------------------------------------------------------

export function JobDocumentsTab({ jobId, canEdit }: { jobId: number; canEdit: boolean }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [sendDocId, setSendDocId] = useState<number | null>(null);

  const { data, isLoading } = useDocumentList({ jobId });
  const { mutateAsync: generatePdf } = useGenerateDocumentPdf();
  const { mutateAsync: voidDoc } = useVoidDocument();

  const handlePdfAction = async (docId: number) => {
    try {
      const res = await generatePdf({ documentId: docId });
      window.open(res.url, "_blank");
    } catch (err) {
      toast.error("Failed to fetch PDF URL");
    }
  };

  const handleVoid = async (docId: number) => {
    if (confirm("Are you sure you want to void this document? This action cannot be undone.")) {
      try {
        await voidDoc({ id: docId });
        toast.success("Document voided");
      } catch (err) {
        toast.error("Failed to void document");
      }
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Documents</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <FilePlus size={16} /> Create Document
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <div style={{ padding: "var(--spacing-6)", display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
            <Skeleton className={styles.skeletonLine} />
            <Skeleton className={styles.skeletonLine} />
            <Skeleton className={styles.skeletonLine} />
          </div>
        ) : !data || data.documents.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No documents yet. Create one from a template.</p>
          </div>
        ) : (
          data.documents.map((doc) => (
            <div key={doc.id} className={styles.documentItem}>
              <div className={styles.docLeft} onClick={() => setSelectedDocId(doc.id)}>
                <div className={styles.iconContainer}>{getDocIcon(doc.documentType)}</div>
                <div className={styles.docInfo}>
                  <div className={styles.docInfoTop}>
                    <span className={styles.docNumber}>{doc.documentNumber}</span>
                    <span className={styles.docType}>{formatDocType(doc.documentType)}</span>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className={styles.docInfoBottom}>
                    Created {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(doc.createdAt))}
                    {doc.templateName && ` • Template: ${doc.templateName}`}
                    {doc.total != null && ` • Total: $${Number(doc.total).toFixed(2)}`}
                  </div>
                </div>
              </div>

              <div className={styles.docActions}>
                {canEdit && doc.status !== "voided" && (
                  <Button variant="ghost" size="icon-md" onClick={() => setSendDocId(doc.id)} title="Send Document">
                    <Mail size={16} />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handlePdfAction(doc.id)}>
                  <Download size={16} />
                  <span className={styles.actionText}>{doc.pdfStorageKey ? "View PDF" : "Generate"}</span>
                </Button>
                {canEdit && doc.status !== "voided" && (
                  <Button variant="ghost" size="icon-md" onClick={() => handleVoid(doc.id)} title="Void Document" className={styles.destructiveIconBtn}>
                    <Ban size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <JobDocumentsCreateDialog isOpen={isCreateOpen} setIsOpen={setIsCreateOpen} jobId={jobId} />

      <JobDocumentsSendDialog isOpen={!!sendDocId} setIsOpen={(open) => !open && setSendDocId(null)} documentId={sendDocId} />

      <JobDocumentsDetailSheet
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        canEdit={canEdit}
      />
    </div>
  );
}