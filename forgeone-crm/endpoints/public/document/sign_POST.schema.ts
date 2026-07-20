import { z } from "zod";

export const schema = z.object({
  token: z.string(),
  signerName: z.string(),
  signerEmail: z.string().email(),
  signatureData: z.string(),
  signerRole: z.string().optional()
});

export type OutputType = { success: boolean };

export const postSignDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/public/document/sign`, {
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