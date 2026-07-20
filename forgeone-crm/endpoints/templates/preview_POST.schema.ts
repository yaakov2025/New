import { z } from "zod";
import superjson from "superjson";
import { ResolvedBlock } from "../../helpers/templateBlockTypes";

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
  resolvedBlocks: ResolvedBlock[];
  tagValues: Record<string, string>;
  warnings: string[];
};

export const postPreviewTemplate = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/preview`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};