import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  jobId: z.number(),
  policyNumber: z.string().optional().nullable(),
  claimNumber: z.string().optional().nullable(),
  deductible: z.number().optional().nullable(),
  dateOfLoss: z.date().optional().nullable(),
  coverageType: z.string().optional().nullable(),
  carrier: z.string().optional().nullable(),
  carrierPhone: z.string().optional().nullable(),
  carrierEmail: z.string().optional().nullable(),
  adjusterName: z.string().optional().nullable(),
  adjusterPhone: z.string().optional().nullable(),
  adjusterEmail: z.string().optional().nullable(),
});

export type OutputType = { success: boolean; id: number };

export const postSaveJobInsurance = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/insurance/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};