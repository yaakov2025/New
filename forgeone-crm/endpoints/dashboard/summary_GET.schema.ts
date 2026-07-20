import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Jobs, JobTasks, JobAppointments } from "../../helpers/schema";

export const schema = z.object({});

export type OutputType = {
  openJobsCount: number;
  needsReviewCount: number;
  openTasksCount: number;
  recentJobs: Selectable<Jobs>[];
  upcomingAppointments: Selectable<JobAppointments>[];
  openTasks: Selectable<JobTasks>[];
};

export const getDashboardSummary = async (body: z.infer<typeof schema> = {}, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/dashboard/summary`, { method: "GET", ...init, headers: { "Content-Type": "application/json" } });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};