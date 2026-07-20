import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./summary_GET.schema";
import superjson from "superjson";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    
    const [openJobsRes, needsReviewRes, openTasksRes, recentJobs, upcomingAppointments, openTasks] = await Promise.all([
      db.selectFrom("jobs").select(db.fn.count("id").as("cnt")).where("orgId", "=", orgId).where("isDeleted", "is not", true).where("status", "not in", ["Completed", "Canceled"]).executeTakeFirst(),
      db.selectFrom("jobs").select(db.fn.count("id").as("cnt")).where("orgId", "=", orgId).where("isDeleted", "is not", true).where("needsReview", "=", true).where("status", "not in", ["Completed", "Canceled"]).executeTakeFirst(),
      db.selectFrom("jobTasks").innerJoin("jobs", "jobTasks.jobId", "jobs.id").select(db.fn.count("jobTasks.id").as("cnt")).where("jobTasks.orgId", "=", orgId).where("jobTasks.isCompleted", "is not", true).where("jobs.isDeleted", "is not", true).where("jobs.status", "not in", ["Completed", "Canceled"]).executeTakeFirst(),
      db.selectFrom("jobs").selectAll().where("orgId", "=", orgId).where("isDeleted", "is not", true).orderBy("updatedAt", "desc").limit(5).execute(),
      db.selectFrom("jobAppointments").selectAll().where("orgId", "=", orgId).where("scheduledAt", ">", new Date()).orderBy("scheduledAt", "asc").limit(5).execute(),
      db.selectFrom("jobTasks").selectAll().where("orgId", "=", orgId).where("isCompleted", "is not", true).orderBy("dueDate", "asc").limit(5).execute()
    ]);

    return new Response(superjson.stringify({
      openJobsCount: Number(openJobsRes?.cnt || 0),
      needsReviewCount: Number(needsReviewRes?.cnt || 0),
      openTasksCount: Number(openTasksRes?.cnt || 0),
      recentJobs,
      upcomingAppointments,
      openTasks
    } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}