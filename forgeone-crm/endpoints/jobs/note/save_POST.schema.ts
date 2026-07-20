import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { JobNotes } from "../../../helpers/schema";

export const schema = z.object({
  jobId: z.number(),
  content: z.string().min(1),
});

export type OutputType = { success: boolean; note: Selectable<JobNotes> };

export const postSaveJobNote = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/note/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};