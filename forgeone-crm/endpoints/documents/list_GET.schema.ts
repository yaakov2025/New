import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { JobDocuments } from "../../helpers/schema";

export const schema = z.object({
  jobId: z.number().optional(),
  customerId: z.number().optional(),
  opportunityId: z.number().optional(),
  documentType: z.string().optional(),
  status: z.string().optional(),
});

export type DocumentWithDetails = Selectable<JobDocuments> & {
  createdByName: string | null;
  templateName: string | null;
};

export type OutputType = { documents: DocumentWithDetails[] };

export const getDocumentList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams(
    Object.entries(body).reduce((a, [k, v]) => (v !== undefined ? { ...a, [k]: String(v) } : a), {})
  );
  const result = await fetch(`/_api/documents/list?${qs.toString()}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};