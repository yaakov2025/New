import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  photoId: z.number(),
});

export type OutputType = { success: boolean };

export const postDeleteJobPhoto = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/photo/delete`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};