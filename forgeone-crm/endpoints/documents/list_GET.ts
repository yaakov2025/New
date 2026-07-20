import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./list_GET.schema";
import superjson from "superjson";
import { DocumentType, DocumentStatus } from "../../helpers/schema";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId") ? Number(url.searchParams.get("jobId")) : undefined;
    const customerId = url.searchParams.get("customerId") ? Number(url.searchParams.get("customerId")) : undefined;
    const opportunityId = url.searchParams.get("opportunityId") ? Number(url.searchParams.get("opportunityId")) : undefined;
    const documentType = url.searchParams.get("documentType");
    const status = url.searchParams.get("status");

    let query = db.selectFrom("jobDocuments")
      .leftJoin("users", "jobDocuments.createdBy", "users.id")
      .leftJoin("documentTemplates", "jobDocuments.templateId", "documentTemplates.id")
      .selectAll("jobDocuments")
      .select([
        "users.displayName as createdByName",
        "documentTemplates.name as templateName"
      ])
      .where("jobDocuments.orgId", "=", orgId);

    if (jobId) query = query.where("jobDocuments.jobId", "=", jobId);
    if (customerId) query = query.where("jobDocuments.customerId", "=", customerId);
    if (opportunityId) query = query.where("jobDocuments.opportunityId", "=", opportunityId);
    if (documentType) query = query.where("jobDocuments.documentType", "=", documentType as DocumentType);
    if (status) query = query.where("jobDocuments.status", "=", status as DocumentStatus);

    const documents = await query.orderBy("jobDocuments.createdAt", "desc").execute();

    return new Response(superjson.stringify({ documents } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}