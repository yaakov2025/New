import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { DocumentVersionSnapshots } from "../../../helpers/schema";

export const schema = z.object({
  documentId: z.number(),
});

export type VersionWithDetails = Selectable<DocumentVersionSnapshots> & {
  createdByName: string | null;
};

export type OutputType = { versions: VersionWithDetails[] };

export const getDocumentVersions = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/version/list?documentId=${body.documentId}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};