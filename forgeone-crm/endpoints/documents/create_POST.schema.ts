import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  templateId: z.number(),
  jobId: z.number().optional().nullable(),
  customerId: z.number().optional().nullable(),
  propertyId: z.number().optional().nullable(),
  opportunityId: z.number().optional().nullable(),
});

export type OutputType = { success: boolean; id: number; documentNumber: string };

export const postCreateDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/create`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};