import { z } from "zod";

export const schema = z.object({
  token: z.string(),
  approverName: z.string(),
  approverEmail: z.string().email(),
  comment: z.string().optional()
});

export type OutputType = { success: boolean };

export const postApproveDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/public/document/approve`, {
    method: "POST",
    body: JSON.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const text = await result.text();
    let err = text;
    try { err = JSON.parse(text).error; } catch {}
    throw new Error(err);
  }
  return await result.json();
};