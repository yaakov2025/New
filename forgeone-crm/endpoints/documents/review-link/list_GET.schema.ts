import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  documentId: z.number(),
});

export type OutputType = {
  links: {
    id: number;
    versionNumber: number;
    expiresAt: Date | null;
    isRevoked: boolean | null;
    viewedAt: Date | null;
    allowPdfDownload: boolean | null;
    createdAt: Date | null;
    createdByName: string | null;
  }[];
};

export const getReviewLinksList = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/review-link/list?documentId=${body.documentId}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};