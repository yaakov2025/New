import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { JobDocuments, DocumentLineItems } from "../../helpers/schema";

export const schema = z.object({
  id: z.number(),
});

export type ReviewLinkItem = {
  id: number;
  versionNumber: number;
  expiresAt: Date | null;
  isRevoked: boolean;
  viewedAt: Date | null;
  allowPdfDownload: boolean;
  createdAt: Date;
  createdByName: string | null;
  revokedAt: Date | null;
};

export type EmailLogItem = {
  id: number;
  versionNumber: number;
  recipientEmail: string;
  subject: string | null;
  sentAt: Date;
  sentByName: string | null;
  emailMessageId: string | null;
};

export type SignatureItem = {
  id: number;
  versionNumber: number;
  signerRole: string;
  signerName: string;
  signerEmail: string | null;
  signedAt: Date;
  ipAddress: string | null;
};

export type DocumentDetail = Selectable<JobDocuments> & {
  createdByName: string | null;
  templateName: string | null;
  customerName: string | null;
  propertyAddress: string | null;
    lineItems: Selectable<DocumentLineItems>[];
  reviewLinks: ReviewLinkItem[];
  emailLog: EmailLogItem[];
  signatures: SignatureItem[];
};

export type OutputType = { document: DocumentDetail };

export const getDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/get?id=${body.id}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};