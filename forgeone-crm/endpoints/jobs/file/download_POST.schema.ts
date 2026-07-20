import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  fileId: z.number(),
});

export type OutputType = { success: boolean; url: string; fileName: string };

export const postDownloadJobFile = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/file/download`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};