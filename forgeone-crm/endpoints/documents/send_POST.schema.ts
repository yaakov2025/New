import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  documentId: z.number(),
  recipientEmail: z.string().email(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export type OutputType = {
  success: boolean;
  messageId: string;
  reviewUrl: string;
};

export const postSendDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/send`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};