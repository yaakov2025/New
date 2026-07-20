import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { z } from "zod";
import { FileText, CheckCircle, XCircle, Download, FileSignature } from "lucide-react";

import {
  fetchPublicDocumentReview,
  submitApproval,
  submitDecline,
  submitSignature } from
"../helpers/useDocuments";
import { TemplatePreview } from "../components/TemplatePreview";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Separator } from "../components/Separator";
import { Spinner } from "../components/Spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { SignatureCanvas } from "../components/SignatureCanvas";
import { toast } from "sonner";
import styles from "./review.$token.module.css";

// Form schemas
const approveSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  comment: z.string().optional()
});

const declineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  reason: z.string().optional()
});

const signSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  signatureData: z.string().min(1, "Signature is required")
});

export default function PublicDocumentReview() {
  const { token } = useParams<{token: string;}>();
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<"approve" | "decline" | "sign" | null>(null);

  // Fetch document data
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ["public-document-review", token],
    queryFn: () => fetchPublicDocumentReview(token!),
    enabled: !!token,
    retry: false
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (data: z.infer<typeof approveSchema>) =>
    submitApproval({
      token: token!,
      approverName: data.name,
      approverEmail: data.email,
      comment: data.comment
    }),
    onSuccess: () => {
      toast.success("Document approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["public-document-review", token] });
      setActiveDialog(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to approve document.")
  });

  const declineMutation = useMutation({
    mutationFn: (data: z.infer<typeof declineSchema>) =>
    submitDecline({
      token: token!,
      name: data.name,
      email: data.email,
      reason: data.reason
    }),
    onSuccess: () => {
      toast.success("Document declined.");
      queryClient.invalidateQueries({ queryKey: ["public-document-review", token] });
      setActiveDialog(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to decline document.")
  });

  const signMutation = useMutation({
    mutationFn: (data: z.infer<typeof signSchema>) =>
    submitSignature({
      token: token!,
      signerName: data.name,
      signerEmail: data.email,
      signatureData: data.signatureData
    }),
    onSuccess: () => {
      toast.success("Document signed successfully.");
      queryClient.invalidateQueries({ queryKey: ["public-document-review", token] });
      setActiveDialog(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to sign document.")
  });

  // Form Hooks
  const approveForm = useForm({
    schema: approveSchema,
    defaultValues: { name: "", email: "", comment: "" }
  });

  const declineForm = useForm({
    schema: declineSchema,
    defaultValues: { name: "", email: "", reason: "" }
  });

  const signForm = useForm({
    schema: signSchema,
    defaultValues: { name: "", email: "", signatureData: "" }
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Loading document...</p>
      </div>);

  }

  if (isError || !response || !response.document) {
    return (
      <div className={styles.errorContainer}>
        <Helmet><title>Document Not Found</title></Helmet>
        <div className={styles.errorCard}>
          <XCircle className={styles.errorIcon} />
          <h2>Document Unavailable</h2>
          <p>The document you are looking for cannot be found or the link has expired.</p>
        </div>
      </div>);

  }

  const { document, org, customer, property, lineItems, signatures, allowPdfDownload, pdfUrl } = response;
  const customerName = customer?.name;

  const resolvedBlocks = React.useMemo(() => {
    if (!document?.blocksSnapshot) return [];
    let blocks: any[] = [];
    try {
      blocks = typeof document.blocksSnapshot === "string" 
        ? JSON.parse(document.blocksSnapshot) 
        : document.blocksSnapshot;
    } catch {
      return [];
    }

    return blocks.map((b: any) => {
      let newBlock = { ...b };
      
      if (newBlock.type === "estimateLineItems") {
        newBlock.resolvedData = {
          ...newBlock.resolvedData,
          items: (lineItems || []).map((li: any) => ({
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: formatCurrency(li.unitPrice),
            total: formatCurrency(li.lineTotal || (Number(li.quantity) * Number(li.unitPrice)))
          }))
        };
      } else if (newBlock.type === "totals") {
        newBlock.resolvedData = {
          ...newBlock.resolvedData,
          subtotal: formatCurrency(document.subtotal),
          tax: formatCurrency(document.tax),
          discount: formatCurrency(document.discount),
          total: formatCurrency(document.total)
        };
      } else if (newBlock.type === "customerInfo" && customer) {
        newBlock.resolvedData = {
          ...newBlock.resolvedData,
          name: customer.name,
          phone: customer.phone,
          email: customer.email
        };
      } else if (newBlock.type === "propertyInfo" && property) {
        newBlock.resolvedData = {
          ...newBlock.resolvedData,
          address: [property.address, property.city, property.state, property.zip].filter(Boolean).join(", ")
        };
      }

      if (newBlock.resolvedContent) {
        newBlock.resolvedContent = newBlock.resolvedContent.replace(
          /\[Missing:\s*(Estimate|Contract|Work Order)\s*Number\]/gi,
          document.documentNumber || ""
        );
      }

      return newBlock;
    });
  }, [document, lineItems, customer, property]);
  const propertyAddress = property?.address;
  const isEstimate = document.documentType === "estimate";
  const isContract = document.documentType === "contract";
  const canAct = document.status === "sent" || document.status === "viewed";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "signed":
        return <Badge variant="success" className={styles.statusBadge}>{status.toUpperCase()}</Badge>;
      case "declined":
      case "voided":
        return <Badge variant="destructive" className={styles.statusBadge}>{status.toUpperCase()}</Badge>;
      case "sent":
      case "viewed":
        return <Badge variant="primary" className={styles.statusBadge}>{status.toUpperCase()}</Badge>;
      default:
        return <Badge variant="secondary" className={styles.statusBadge}>{status.toUpperCase()}</Badge>;
    }
  };

  const formatCurrency = (val: string | number | undefined | null) => {
    if (val === null || val === undefined) return "$0.00";
    const num = Number(val);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(dateStr));

  return (
    <div className={styles.pageBackground}>
      <Helmet><title>{`${org?.name || "Document"} | ${document.documentType}`}</title></Helmet>

      <main className={styles.container}>
        {/* Header Section */}
        <header className={styles.header}>
          <div className={styles.orgInfo}>
            {org?.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.orgLogo} />}
            <div>
              <h1 className={styles.orgName}>{org?.name || "Organization"}</h1>
              <p className={styles.subtitle}>Document Review</p>
            </div>
          </div>
          {allowPdfDownload && pdfUrl &&
          <Button variant="outline" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download size={16} /> Download PDF
              </a>
            </Button>
          }
        </header>

        {/* Document Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Document Number</span>
              <span className={styles.infoValue}>{document.documentNumber}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Type</span>
              <span className={styles.infoValue} style={{ textTransform: "capitalize" }}>
                {document.documentType.replace(/_/g, " ")}
              </span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Status</span>
              {getStatusBadge(document.status)}
            </div>
          </div>
          
          {(customerName || propertyAddress) &&
          <>
              <Separator className={styles.infoSeparator} />
              <div className={styles.infoRow}>
                {customerName &&
              <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Prepared For</span>
                    <span className={styles.infoValue}>{customerName}</span>
                  </div>
              }
                {propertyAddress &&
              <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Property</span>
                    <span className={styles.infoValue}>{propertyAddress}</span>
                  </div>
              }
              </div>
            </>
          }
        </div>

        {/* Resolution Message Banner (if action was taken) */}
        {!canAct && document.status !== "draft" &&
        <div className={`${styles.resolutionBanner} ${styles[document.status]}`}>
            {document.status === "approved" &&
          <>
                <CheckCircle size={20} />
                <span>This document was approved on {document.approvedAt ? formatDate(document.approvedAt) : "a prior date"} by {document.approverName || "the customer"}.</span>
              </>
          }
            {document.status === "signed" &&
          <>
                <FileSignature size={20} />
                <span>This document was signed on {document.signedAt ? formatDate(document.signedAt) : "a prior date"}.</span>
              </>
          }
            {document.status === "declined" &&
          <>
                <XCircle size={20} />
                <span>This document was declined on {document.declinedAt ? formatDate(document.declinedAt) : "a prior date"}{document.declinedByName ? ` by ${document.declinedByName}` : ""}.</span>
              </>
          }
            {document.status === "voided" &&
          <>
                <XCircle size={20} />
                <span>This document has been voided by the organization and is no longer active.</span>
              </>
          }
          </div>
        }

        {/* Financial Summary if available */}
        {(document.subtotal || document.total) &&
        <div className={styles.financialSummary}>
            <h3 className={styles.summaryTitle}>Financial Summary</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span>Subtotal</span>
                <span>{formatCurrency(document.subtotal)}</span>
              </div>
              {document.discount > 0 &&
            <div className={styles.summaryItem}>
                  <span>Discount</span>
                  <span>-{formatCurrency(document.discount)}</span>
                </div>
            }
              {document.tax > 0 &&
            <div className={styles.summaryItem}>
                  <span>Tax</span>
                  <span>{formatCurrency(document.tax)}</span>
                </div>
            }
              <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
                <span>Total</span>
                <span>{formatCurrency(document.total)}</span>
              </div>
            </div>
          </div>
        }

        {/* The Document Preview */}
        <div className={styles.documentPreviewWrapper}>
          <TemplatePreview
            mode="document"
            resolvedBlocks={resolvedBlocks as any}
            settings={document.settingsSnapshot || { margins: { top: 40, right: 40, bottom: 40, left: 40 } }} />

        </div>

       {/* Signature Display (If Signed) */}
       {document.status === "signed" && signatures && signatures.length > 0 && signatures[0].signatureData &&
       <div className={styles.signatureDisplay}>
           <h4>Customer Signature</h4>
           <div className={styles.signatureImageWrapper}>
             <img src={signatures[0].signatureData} alt="Signature" />
           </div>
           <p className={styles.signatureMeta}>Signed by {signatures[0].signerName} ({signatures[0].signerEmail})</p>
</div>
}

{/* Action Bar (If Sent or Viewed) */}
        {canAct &&
        <div className={styles.actionBar}>
            <div className={styles.actionPrompt}>
              <h3>Please review the document</h3>
              <p>After reviewing the document details above, choose an action below.</p>
            </div>
            <div className={styles.actionButtons}>
              <Button
              variant="outline"
              size="lg"
              onClick={() => setActiveDialog("decline")}>

                Decline
              </Button>
              
              {isEstimate ?
            <Button
              variant="primary"
              size="lg"
              onClick={() => setActiveDialog("approve")}>

                  <CheckCircle size={18} />
                  Approve Estimate
                </Button> :
            isContract ?
            <Button
              variant="primary"
              size="lg"
              onClick={() => setActiveDialog("sign")}>

                  <FileSignature size={18} />
                  Sign Document
                </Button> :
            null}
            </div>
          </div>
        }

        {/* Footer */}
        <footer className={styles.footer}>
          {org?.email || org?.phone ?
          <div className={styles.footerContact}>
              Questions? Contact us at {org.email} {org.email && org.phone && "|"} {org.phone}
            </div> :
          null}
          <div className={styles.footerBranding}>
            <FileText size={14} /> Powered by ForgeOne
          </div>
        </footer>
      </main>

      {/* Dialogs */}
      <Dialog open={activeDialog === "approve"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Estimate</DialogTitle>
            <DialogDescription>
              Please provide your details to formally approve this estimate.
            </DialogDescription>
          </DialogHeader>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit((data) => approveMutation.mutate(data))}>
              <FormItem name="name">
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    value={approveForm.values.name}
                    onChange={(e) => approveForm.setValues((prev) => ({ ...prev, name: e.target.value }))} />

                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem name="email">
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={approveForm.values.email}
                    onChange={(e) => approveForm.setValues((prev) => ({ ...prev, email: e.target.value }))} />

                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem name="comment">
                <FormLabel>Comment (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any notes for the team..."
                    value={approveForm.values.comment}
                    onChange={(e) => approveForm.setValues((prev) => ({ ...prev, comment: e.target.value }))} />

                </FormControl>
                <FormMessage />
              </FormItem>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? "Submitting..." : "Submit Approval"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "decline"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Document</DialogTitle>
            <DialogDescription>
              Please let us know why you are declining this document so we can assist you further.
            </DialogDescription>
          </DialogHeader>
          <Form {...declineForm}>
            <form onSubmit={declineForm.handleSubmit((data) => declineMutation.mutate(data))}>
              <FormItem name="name">
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    value={declineForm.values.name}
                    onChange={(e) => declineForm.setValues((prev) => ({ ...prev, name: e.target.value }))} />

                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem name="email">
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={declineForm.values.email}
                    onChange={(e) => declineForm.setValues((prev) => ({ ...prev, email: e.target.value }))} />

                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem name="reason">
                <FormLabel>Reason for Declining (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please specify why you are declining..."
                    value={declineForm.values.reason}
                    onChange={(e) => declineForm.setValues((prev) => ({ ...prev, reason: e.target.value }))} />

                </FormControl>
                <FormMessage />
              </FormItem>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={declineMutation.isPending}>
                  {declineMutation.isPending ? "Submitting..." : "Submit Decline"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "sign"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className={styles.wideDialog}>
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Sign below to formally agree to the terms of this document.
            </DialogDescription>
          </DialogHeader>
          <Form {...signForm}>
            <form onSubmit={signForm.handleSubmit((data) => signMutation.mutate(data))}>
              <div className={styles.signGrid}>
                <FormItem name="name">
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      value={signForm.values.name}
                      onChange={(e) => signForm.setValues((prev) => ({ ...prev, name: e.target.value }))} />

                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem name="email">
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={signForm.values.email}
                      onChange={(e) => signForm.setValues((prev) => ({ ...prev, email: e.target.value }))} />

                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>
              
              <FormItem name="signatureData">
                <FormLabel>Signature</FormLabel>
                <FormControl>
                  <SignatureCanvas
                    width={450}
                    height={160}
                    onSignatureChange={(data) => {
                      signForm.setValues((prev) => ({ ...prev, signatureData: data }));
                      if (data) signForm.validateField("signatureData", { shallow: true });
                    }} />

                </FormControl>
                <FormMessage />
              </FormItem>
              
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={signMutation.isPending}>
                  {signMutation.isPending ? "Submitting..." : "Sign Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>);

}