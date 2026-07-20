import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  templateId: z.number(),
  useSampleData: z.boolean().optional(),
  customerId: z.number().optional(),
  jobId: z.number().optional(),
  contactId: z.number().optional(),
  propertyId: z.number().optional(),
  leadId: z.number().optional(),
  opportunityId: z.number().optional(),
});

export type OutputType = {
  url: string;
  fileName: string;
};

export const postGenerateTemplatePdf = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/pdf/generate`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};