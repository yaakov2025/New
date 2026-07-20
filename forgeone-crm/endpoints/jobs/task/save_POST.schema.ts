import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().optional(),
  jobId: z.number(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  isCompleted: z.boolean().optional(),
  assignedTo: z.number().optional().nullable(),
  action: z.enum(["complete", "delete"]).optional(),
});

export type OutputType = { success: boolean; id: number };

export const postSaveJobTask = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/task/save`, { method: "POST", body: superjson.stringify(schema.parse(body)), ...init, headers: { "Content-Type": "application/json" } });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};