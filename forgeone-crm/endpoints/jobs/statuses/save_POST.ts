import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";
import { Transaction } from "kysely";
import { DB } from "../../../helpers/schema";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const json = superjson.parse(await request.text());
    const { id, name, category, color, sortOrder, isDefault, isArchived } = schema.parse(json);

    const savedStatus = await db.transaction().execute(async (trx: Transaction<DB>) => {
      // If setting this status to default, clear default from others
      if (isDefault) {
        await trx.updateTable("jobStatuses")
          .set({ isDefault: false })
          .where("orgId", "=", orgId)
          .execute();
      }

      let targetId: number;

      if (id) {
        // Update existing status
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (category !== undefined) updates.category = category;
        if (color !== undefined) updates.color = color;
        if (sortOrder !== undefined) updates.sortOrder = sortOrder;
        if (isDefault !== undefined) updates.isDefault = isDefault;
        if (isArchived !== undefined) updates.isArchived = isArchived;
        
        await trx.updateTable("jobStatuses")
          .set(updates)
          .where("id", "=", id)
          .where("orgId", "=", orgId)
          .execute();
        
        targetId = id;
      } else {
        // Create new status
        if (!name || !category) {
          throw new Error("Name and category are required when creating a new status");
        }
        
        const insertRes = await trx.insertInto("jobStatuses")
          .values({
            orgId,
            name,
            category,
            color: color || null,
            sortOrder: sortOrder || 0,
            isDefault: isDefault || false,
            isArchived: isArchived || false,
            createdBy: user.id
          })
          .returning("id")
          .executeTakeFirstOrThrow();
          
        targetId = insertRes.id;
      }

      return await trx.selectFrom("jobStatuses")
        .selectAll()
        .where("id", "=", targetId)
        .where("orgId", "=", orgId)
        .executeTakeFirstOrThrow();
    });

    return new Response(superjson.stringify({ status: savedStatus } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}