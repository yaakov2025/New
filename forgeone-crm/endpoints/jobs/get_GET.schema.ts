import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Jobs, Customers, Properties, Contacts, JobTasks, JobAppointments, JobNotes, JobPhotos, JobFiles, JobInsurance, JobActivityEvents, Users } from "../../helpers/schema";

export const schema = z.object({
  id: z.number(),
});

export type JobDetail = Selectable<Jobs> & {
  customer: Selectable<Customers> | null;
  property: Selectable<Properties> | null;
  contacts: (Selectable<Contacts> & { jobContactId: number })[];
  tasks: Selectable<JobTasks>[];
  appointments: Selectable<JobAppointments>[];
  notes: Selectable<JobNotes>[];
  photos: (Selectable<JobPhotos> & { url: string })[];
  files: Selectable<JobFiles>[];
  insurance: Selectable<JobInsurance> | null;
  events: Selectable<JobActivityEvents>[];
  assignments: Selectable<Users>[];
};

export type OutputType = { job: JobDetail };

export const getJobDetail = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/get?id=${body.id}`, {
    method: "GET", ...init, headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};