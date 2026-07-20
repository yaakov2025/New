import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().optional(),
  jobId: z.number(),
  title: z.string().optional(),
  scheduledAt: z.date().optional(),
  duration: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedTo: z.number().optional().nullable(),
  action: z.enum(["delete"]).optional(),
});

export type OutputType = { success: boolean; id?: number };

export const postSaveJobAppointment = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/appointment/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};