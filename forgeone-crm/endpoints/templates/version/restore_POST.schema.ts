import { z } from "zod";
import superjson from "superjson";
import { JsonValue } from "../../../helpers/schema";

export const schema = z.object({
  templateId: z.number(),
  versionId: z.number(),
});

export type OutputType = {
  template: {
    id: number;
    blocks: JsonValue;
    settings: JsonValue;
    updatedAt: Date;
  };
};

export const postRestoreTemplateVersion = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/version/restore`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};