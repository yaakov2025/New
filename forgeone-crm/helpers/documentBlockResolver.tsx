import { db } from "./db";
import { ResolvedBlock } from "./templateBlockTypes";
import { Selectable } from "kysely";
import { Customers, Properties, JobDocuments } from "./schema";

const formatCurrency = (val: string | number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

/**
 * Replaces [Missing: ...] document number placeholders in resolved text content.
 */
function fixMissingDocumentNumbers(blocks: ResolvedBlock[], documentNumber: string): ResolvedBlock[] {
  const documentNumberPattern = /\[Missing:\s*(?:Estimate|Contract|Work Order)\s*Number\]/gi;
  return blocks.map((block) => {
    if (block.resolvedContent && documentNumberPattern.test(block.resolvedContent)) {
      return {
        ...block,
        resolvedContent: block.resolvedContent.replace(documentNumberPattern, documentNumber),
      };
    }
    return block;
  });
}

/**
 * Re-populates empty customerInfo and propertyInfo blocks from the database.
 */
async function fixMissingCustomerProperty(
  blocks: ResolvedBlock[],
  document: Selectable<JobDocuments>,
): Promise<ResolvedBlock[]> {
  let customer: Selectable<Customers> | undefined;
  let property: Selectable<Properties> | undefined;

  if (document.customerId) {
    customer = await db
      .selectFrom("customers")
      .selectAll()
      .where("id", "=", document.customerId)
      .executeTakeFirst();
  }

  if (document.propertyId) {
    property = await db
      .selectFrom("properties")
      .selectAll()
      .where("id", "=", document.propertyId)
      .executeTakeFirst();
  }

  const hasData = (data?: Record<string, any>): boolean => {
    if (!data) return false;
    return Object.values(data).some((v) => v !== null && v !== undefined && String(v).trim() !== "");
  };

  return blocks.map((block) => {
    if (block.type === "customerInfo" && !hasData(block.resolvedData) && customer) {
      return {
        ...block,
        resolvedData: {
          name: customer.name,
          address: [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(", "),
          phone: customer.phone,
          email: customer.email,
        },
      };
    }
    if (block.type === "propertyInfo" && !hasData(block.resolvedData) && property) {
      return {
        ...block,
        resolvedData: {
          name: property.name,
          address: [property.address, property.city, property.state, property.zip].filter(Boolean).join(", "),
          propertyType: property.propertyType,
        },
      };
    }
    return block;
  });
}

/**
 * Fixes broken or incomplete resolved blocks for PDF generation.
 * - Replaces [Missing: ... Number] placeholders with the actual document number.
 * - Repopulates empty customer and property info blocks.
 * - Overrides estimate line items with the latest DB items.
 * - Repopulates totals with the latest DB values.
 */
export async function resolveDocumentBlocksForPdf(
  blocks: ResolvedBlock[],
  document: Selectable<JobDocuments>,
  lineItems: any[],
): Promise<ResolvedBlock[]> {
  let updatedBlocks = blocks.map((block) => {
    if (block.type === "estimateLineItems" && lineItems.length > 0) {
      return {
        ...block,
        resolvedData: {
          ...block.resolvedData,
          items: lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: formatCurrency(li.unitPrice),
            total: formatCurrency(li.lineTotal),
          })),
        },
      };
    }
    if (block.type === "totals") {
      return {
        ...block,
        resolvedData: {
          ...block.resolvedData,
          subtotal: formatCurrency(document.subtotal),
          tax: formatCurrency(document.tax),
          discount: formatCurrency(document.discount),
          total: formatCurrency(document.total),
        },
      };
    }
    return block;
  });

  updatedBlocks = fixMissingDocumentNumbers(updatedBlocks, document.documentNumber);
  updatedBlocks = await fixMissingCustomerProperty(updatedBlocks, document);

  return updatedBlocks;
}