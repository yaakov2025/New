import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  jobId: z.number(),
  fileName: z.string(),
  fileSize: z.number(),
  contentType: z.string(),
  caption: z.string().optional(),
});

export type OutputType = { success: boolean; photoId: number; presignedUrl: string };

export const postUploadJobPhoto = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/photo/upload`, { method: "POST", body: superjson.stringify(schema.parse(body)), ...init, headers: { "Content-Type": "application/json" } });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};