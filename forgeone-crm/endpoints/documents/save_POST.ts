import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

const round2 = (value: number): number => Math.round(value * 100) / 100;

const formatCurrency = (val: string | number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const input = schema.parse(superjson.parse(await request.text()));

    await db.transaction().execute(async (trx) => {
      const document = await trx.selectFrom("jobDocuments")
        .select(["status", "isSigned", "documentType", "subtotal", "tax", "discount", "total", "blocksSnapshot", "documentNumber"])
        .where("id", "=", input.id)
        .where("orgId", "=", orgId)
        .executeTakeFirst();

      if (!document) throw new Error("Document not found");
      if (document.status !== "draft") throw new Error("Only draft documents can be edited");
      if (document.isSigned) throw new Error("Cannot edit a signed document");

      let calculatedSubtotal: number | undefined = undefined;
      let calculatedLineItems: Array<{
        description: string;
        quantity: number;
        unit: string | null;
        unitPrice: number;
        lineTotal: number;
        category: string | null;
        notes: string | null;
        sortOrder: number;
      }> | undefined = undefined;

      if (input.lineItems) {
        for (const item of input.lineItems) {
          if (item.quantity <= 0) throw new Error("Line item quantity must be greater than 0");
          if (item.unitPrice < 0) throw new Error("Line item unit price must be greater than or equal to 0");
        }

        calculatedLineItems = input.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || null,
          unitPrice: item.unitPrice,
          lineTotal: round2(item.quantity * item.unitPrice),
          category: item.category || null,
          notes: item.notes || null,
          sortOrder: item.sortOrder,
        }));

        calculatedSubtotal = round2(calculatedLineItems.reduce((sum, item) => sum + item.lineTotal, 0));
      }

      let finalSubtotal: number;
      let finalTax: number;
      let finalDiscount: number;
      let finalTotal: number;

      const hasExistingSubtotal = document.subtotal !== null;
      const existingSubtotal = document.subtotal !== null ? parseFloat(document.subtotal) : 0;
      const existingTax = document.tax !== null ? parseFloat(document.tax) : 0;
      const existingDiscount = document.discount !== null ? parseFloat(document.discount) : 0;
      const existingTotal = document.total !== null ? parseFloat(document.total) : 0;

      const didSubtotalChange = calculatedSubtotal !== undefined && calculatedSubtotal !== existingSubtotal;

      if (calculatedSubtotal !== undefined) {
        finalSubtotal = calculatedSubtotal;
      } else if (input.subtotal !== undefined && input.subtotal !== null) {
        finalSubtotal = input.subtotal;
      } else if (hasExistingSubtotal) {
        finalSubtotal = existingSubtotal;
      } else {
        finalSubtotal = 0;
      }

      if (input.tax !== undefined && input.tax !== null) {
        finalTax = input.tax;
      } else if (didSubtotalChange) {
        finalTax = existingTax;
      } else {
        finalTax = existingTax;
      }

      if (input.discount !== undefined && input.discount !== null) {
        finalDiscount = input.discount;
      } else {
        finalDiscount = existingDiscount;
      }

      if (input.total !== undefined && input.total !== null) {
        finalTotal = input.total;
      } else {
        finalTotal = round2(finalSubtotal - finalDiscount + finalTax);
      }

      if (finalSubtotal < 0) throw new Error("Subtotal must be greater than or equal to 0");
      if (finalTax < 0) throw new Error("Tax must be greater than or equal to 0");
      if (finalTotal < 0) throw new Error("Total must be greater than or equal to 0");
      if (finalDiscount < 0) throw new Error("Discount must be greater than or equal to 0");

      await trx.updateTable("jobDocuments")
        .set({
          notes: input.notes !== undefined ? input.notes : undefined,
          subtotal: finalSubtotal,
          tax: finalTax,
          discount: finalDiscount,
          total: finalTotal,
          updatedAt: new Date(),
        })
        .where("id", "=", input.id)
        .execute();

      if (calculatedLineItems) {
        await trx.deleteFrom("documentLineItems")
          .where("documentId", "=", input.id)
          .where("orgId", "=", orgId)
          .execute();

        if (calculatedLineItems.length > 0) {
          const linesToInsert = calculatedLineItems.map(item => ({
            orgId,
            documentId: input.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            category: item.category,
            notes: item.notes,
            sortOrder: item.sortOrder,
          }));
                   await trx.insertInto("documentLineItems").values(linesToInsert).execute();
        }
      }

            // Only patch if blocksSnapshot exists
      if (document.blocksSnapshot) {
        let blocks: any[] = [];
        if (Array.isArray(document.blocksSnapshot)) {
          blocks = [...(document.blocksSnapshot as any[])];
        } else if (typeof document.blocksSnapshot === 'string') {
          try {
            const parsed = JSON.parse(document.blocksSnapshot as string);
            if (Array.isArray(parsed)) blocks = parsed;
          } catch { /* ignore parse errors */ }
        }
        
        const patchedBlocks = blocks.map((block: any) => {
          let patched = { ...block };
          
          // Patch estimateLineItems with the saved line items (only if new line items were provided)
          if (patched.type === 'estimateLineItems' && calculatedLineItems) {
            patched = {
              ...patched,
              resolvedData: {
                ...patched.resolvedData,
                items: calculatedLineItems.map(li => ({
                  description: li.description,
                  quantity: li.quantity,
                  unit: li.unit,
                  unitPrice: formatCurrency(li.unitPrice),
                  total: formatCurrency(li.lineTotal),
                })),
              },
            };
          }
          
          // Always patch totals block with the final computed financials
          if (patched.type === 'totals') {
            patched = {
              ...patched,
              resolvedData: {
                ...patched.resolvedData,
                subtotal: formatCurrency(finalSubtotal),
                tax: formatCurrency(finalTax),
                discount: formatCurrency(finalDiscount),
                total: formatCurrency(finalTotal),
              },
            };
          }
          
                    // Fix notes/terms blocks when document notes are saved
          if (input.notes !== undefined && (patched.type === 'notes' || patched.type === 'termsAndConditions')) {
            if (patched.content && /\{\{(?:estimate|document|contract|work_order)\.notes\}\}/i.test(patched.content)) {
              patched.resolvedContent = input.notes || '';
            }
          }
          
          // Fix [Missing: ...Number] placeholders with actual document number
          if (patched.resolvedContent) {
            patched.resolvedContent = patched.resolvedContent.replace(
              /\[Missing:\s*(?:Estimate|Contract|Work Order|Change Order|Certificate of Completion)\s*Number\]/gi,
              document.documentNumber
            );
          }
          
          return patched;
        });
        
        // Write patched blocks back. Include in the same transaction.
        await trx.updateTable("jobDocuments")
          .set({ blocksSnapshot: patchedBlocks as any })
          .where("id", "=", input.id)
          .execute();
      }
    });

    return new Response(superjson.stringify({ success: true, id: input.id } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}