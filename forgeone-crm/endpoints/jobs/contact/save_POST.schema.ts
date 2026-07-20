import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  jobId: z.number(),
  contactId: z.number(),
  action: z.enum(["add", "remove"]),
});

export type OutputType = { success: boolean };

export const postSaveJobContact = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/contact/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};