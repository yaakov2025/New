import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./get_GET.schema";
import superjson from "superjson";
import { getUrl } from "@floot/storage";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) throw new Error("Job ID required");

    const job = await db.selectFrom("jobs").selectAll().where("id", "=", id).where("orgId", "=", orgId).where("isDeleted", "is not", true).executeTakeFirst();
    if (!job) throw new Error("Job not found");

    const [
      customer, property, contacts, tasks, appointments, jobNotes, rawPhotos, files, insurance, events, assignments
    ] = await Promise.all([
      job.customerId ? db.selectFrom("customers").selectAll().where("id", "=", job.customerId).executeTakeFirst() : Promise.resolve(null),
      job.propertyId ? db.selectFrom("properties").selectAll().where("id", "=", job.propertyId).executeTakeFirst() : Promise.resolve(null),
      db.selectFrom("jobContacts").innerJoin("contacts", "jobContacts.contactId", "contacts.id").select(["contacts.id", "contacts.customerId", "contacts.firstName", "contacts.lastName", "contacts.title", "contacts.email", "contacts.phone", "contacts.isPrimary", "contacts.createdAt", "contacts.createdBy", "contacts.orgId", "contacts.isDeleted", "jobContacts.id as jobContactId"]).where("jobContacts.jobId", "=", id).execute(),
      db.selectFrom("jobTasks").selectAll().where("jobId", "=", id).orderBy("createdAt", "desc").execute(),
      db.selectFrom("jobAppointments").selectAll().where("jobId", "=", id).orderBy("scheduledAt", "asc").execute(),
      db.selectFrom("jobNotes").selectAll().where("jobId", "=", id).orderBy("createdAt", "desc").execute(),
      db.selectFrom("jobPhotos").selectAll().where("jobId", "=", id).orderBy("createdAt", "desc").execute(),
      db.selectFrom("jobFiles").selectAll().where("jobId", "=", id).orderBy("createdAt", "desc").execute(),
      db.selectFrom("jobInsurance").selectAll().where("jobId", "=", id).executeTakeFirst(),
      db.selectFrom("jobActivityEvents").selectAll().where("jobId", "=", id).orderBy("createdAt", "desc").execute(),
      db.selectFrom("jobAssignments").innerJoin("users", "jobAssignments.userId", "users.id").selectAll("users").where("jobAssignments.jobId", "=", id).execute()
    ]);

    const photos = await Promise.all(rawPhotos.map(async (p) => {
      const urlRes = await getUrl({ visibility: "private", filename: p.storageKey });
      return { ...p, url: urlRes.ok ? urlRes.url : "" };
    }));

    return new Response(superjson.stringify({
      job: { 
        ...job, 
        customer: customer || null, 
        property: property || null, 
        contacts: contacts as OutputType["job"]["contacts"], 
        tasks, 
        appointments, 
        notes: jobNotes, 
        photos, 
        files, 
        insurance: insurance || null, 
        events, 
        assignments 
      }
    } as OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in jobs/get_GET:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}