import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { id, jobId, action, dueDate, ...data } = schema.parse(superjson.parse(await request.text()));

    let taskId = id;
    await db.transaction().execute(async (trx) => {
      if (action === "delete" && id) {
        await trx.deleteFrom("jobTasks").where("id", "=", id).where("orgId", "=", orgId).execute();
        await trx.insertInto("jobActivityEvents").values({ orgId, jobId, eventType: "task_deleted", description: "Task deleted", userId: user.id }).execute();
        return;
      }

      if (action === "complete" && id) {
        await trx.updateTable("jobTasks").set({ isCompleted: true, updatedAt: new Date() }).where("id", "=", id).where("orgId", "=", orgId).execute();
        await trx.insertInto("jobActivityEvents").values({ orgId, jobId, eventType: "task_completed", description: "Task completed", userId: user.id }).execute();
        return;
      }

      if (id) {
        await trx.updateTable("jobTasks").set({ ...data, dueDate, updatedAt: new Date() }).where("id", "=", id).where("orgId", "=", orgId).execute();

        if (data.isCompleted === true) {
          const task = await trx.selectFrom("jobTasks").select("title").where("id", "=", id).where("orgId", "=", orgId).executeTakeFirstOrThrow();
          await trx.insertInto("jobActivityEvents").values({ orgId, jobId, eventType: "task_completed", description: `Task completed: ${task.title}`, userId: user.id }).execute();
        }
      } else {
        if (!data.title) throw new Error("Title required for new task");
        const res = await trx.insertInto("jobTasks").values({ title: data.title, ...data, dueDate, jobId, orgId, createdBy: user.id }).returning("id").executeTakeFirstOrThrow();
        taskId = res.id;
        await trx.insertInto("jobActivityEvents").values({ orgId, jobId, eventType: "task_added", description: `Task added: ${data.title}`, userId: user.id }).execute();
      }
    });

    return new Response(superjson.stringify({ success: true, id: taskId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}