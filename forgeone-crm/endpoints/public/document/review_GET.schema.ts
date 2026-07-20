import { z } from "zod";

export const schema = z.object({
  token: z.string(),
});

export type DocumentReviewData = {
  document: {
    id: number;
    documentNumber: string;
    documentType: string;
    status: string;
    versionNumber: number;
    blocksSnapshot: any;
    settingsSnapshot: any;
    subtotal: number | string | null;
    tax: number | string | null;
    discount: number | string | null;
    total: number | string | null;
    notes: string | null;
    sentAt: string | null;
    approvedAt: string | null;
   approverName: string | null;
   approverEmail: string | null;
   approvalComment: string | null;
   declinedByName: string | null;
   declinedByEmail: string | null;
   declineReason: string | null;
   declinedAt: string | null;
    signedAt: string | null;
  };
  org: {
    name: string;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  property: {
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  lineItems: Array<{
    description: string;
    quantity: number | string | null;
    unit: string | null;
    unitPrice: number | string | null;
    lineTotal: number | string | null;
    notes: string | null;
  }>;
  allowPdfDownload: boolean;
  pdfUrl: string | null;
  signatures: Array<{
    signerName: string;
    signerEmail: string | null;
    signerRole: string;
    signatureData: string;
    signedAt: string | null;
  }>;
};

export type OutputType = DocumentReviewData;

export const getReviewDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/public/document/review?token=${body.token}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const text = await result.text();
    let err = text;
    try { err = JSON.parse(text).error; } catch {}
    throw new Error(err);
  }
  return await result.json();
};