import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  value: z.number().optional().nullable(),
  stageId: z.number().optional().nullable(),
  expectedCloseDate: z.date().optional().nullable(),
  customerId: z.number().optional().nullable(),
  contactId: z.number().optional().nullable(),
  propertyId: z.number().optional().nullable(),
  assignedTo: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  action: z.enum(["convert", "delete"]).optional(),
});

export type OutputType = { success: boolean; id: number; convertedJobId?: number };

export const postSaveOpportunity = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/opportunities/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};