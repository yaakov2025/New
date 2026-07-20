import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  templateId: z.number(),
});

export type VersionListItem = {
  id: number;
  templateId: number;
  versionNumber: number;
  name: string;
  notes: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export type OutputType = { versions: VersionListItem[] };

export const getTemplateVersions = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/version/list?templateId=${body.templateId}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};