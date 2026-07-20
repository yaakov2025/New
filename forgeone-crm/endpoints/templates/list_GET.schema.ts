import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { DocumentTemplates } from "../../helpers/schema";

export const schema = z.object({
  documentType: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type TemplateListItem = Selectable<DocumentTemplates> & {
  createdByName: string | null;
};

export type OutputType = {
  templates: TemplateListItem[];
  foundationTemplates: TemplateListItem[];
};

export const getTemplateList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams(Object.entries(body).reduce((a, [k, v]) => (v !== undefined ? { ...a, [k]: String(v) } : a), {}));
  const result = await fetch(`/_api/templates/list?${qs.toString()}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};