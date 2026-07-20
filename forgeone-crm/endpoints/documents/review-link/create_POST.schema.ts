import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  documentId: z.number(),
  expiresInDays: z.number().optional(),
  allowPdfDownload: z.boolean().optional(),
});

export type OutputType = {
  token: string;
  url: string;
  expiresAt: Date;
};

export const postCreateReviewLink = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/review-link/create`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};