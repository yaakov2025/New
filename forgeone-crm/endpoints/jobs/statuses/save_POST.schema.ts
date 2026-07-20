import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { JobStatuses, JobStatusCategoryArrayValues } from "../../../helpers/schema";

export const schema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  category: z.enum(JobStatusCategoryArrayValues).optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isDefault: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type OutputType = {
  status: Selectable<JobStatuses>;
};

export const postSaveJobStatus = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/jobs/statuses/save`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};