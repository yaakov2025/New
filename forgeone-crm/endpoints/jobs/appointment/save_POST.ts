import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { id, jobId, action, scheduledAt, ...data } = schema.parse(superjson.parse(await request.text()));

    const job = await db.selectFrom("jobs").select("id").where("id", "=", jobId).where("orgId", "=", orgId).executeTakeFirst();
    if (!job) throw new Error("Job not found in current organization");

    let appointmentId = id;

    await db.transaction().execute(async (trx) => {
      if (action === "delete" && id) {
        await trx.deleteFrom("jobAppointments").where("id", "=", id).where("jobId", "=", jobId).where("orgId", "=", orgId).execute();
        await trx.insertInto("jobActivityEvents").values({
          orgId,
          jobId,
          eventType: "appointment_deleted",
          description: "Appointment deleted",
          userId: user.id
        }).execute();
        return;
      }

      if (id) {
        await trx.updateTable("jobAppointments")
          .set({ ...data, scheduledAt })
          .where("id", "=", id)
          .where("jobId", "=", jobId)
          .where("orgId", "=", orgId)
          .execute();
      } else {
        if (!data.title || !scheduledAt) throw new Error("Title and scheduledAt are required for new appointment");
        const res = await trx.insertInto("jobAppointments").values({
          jobId,
          orgId,
          title: data.title,
          scheduledAt,
          duration: data.duration ?? null,
          location: data.location ?? null,
          notes: data.notes ?? null,
          assignedTo: data.assignedTo ?? null,
          createdBy: user.id
        }).returning("id").executeTakeFirstOrThrow();
        appointmentId = res.id;

        await trx.insertInto("jobActivityEvents").values({
          orgId,
          jobId,
          eventType: "appointment_scheduled",
          description: `Appointment "${data.title}" scheduled`,
          userId: user.id
        }).execute();
      }
    });

    return new Response(superjson.stringify({ success: true, id: appointmentId } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}