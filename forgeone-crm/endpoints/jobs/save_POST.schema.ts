import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  jobType: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  needsReview: z.boolean().optional(),
  customerId: z.number().optional().nullable(),
  propertyId: z.number().optional().nullable(),
  estimatedValue: z.number().optional().nullable(),
  startDate: z.date().optional().nullable(),
  targetCompletionDate: z.date().optional().nullable(),
  nextStep: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isInsuranceJob: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
});

export type OutputType = { success: boolean; id: number };

export const postSaveJob = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};