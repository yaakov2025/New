import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { DocumentTemplates } from "../../helpers/schema";

export const schema = z.object({
  id: z.number(),
});

export type TemplateDetail = Selectable<DocumentTemplates> & {
  createdByName: string | null;
  latestVersionNumber: number;
};

export type OutputType = { template: TemplateDetail };

export const getTemplate = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/get?id=${body.id}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};