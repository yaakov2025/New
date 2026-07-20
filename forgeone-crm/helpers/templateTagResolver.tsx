import { TemplateBlock, TemplateDataContext, ResolvedBlock } from "./templateBlockTypes";

// Re-export for backwards compatibility
export type { TemplateDataContext, ResolvedBlock };

import {
  templateTagRegistry,
  formatTagValue,
  getTagDefinition,
} from "./templateTagRegistry";
import { db } from "./db";
import { Selectable } from "kysely";
import {
  Organizations,
  Customers,
  Jobs,
  JobInsurance,
  Contacts,
  Properties,
  Leads,
  Opportunities,
  Users,
} from "./schema";

export async function templateTagResolver(
  blocks: TemplateBlock[],
  context: TemplateDataContext,
): Promise<{
  resolvedBlocks: ResolvedBlock[];
  tagValues: Record<string, string>;
  warnings: string[];
}> {
  const globalWarnings: string[] = [];

  let org: Selectable<Organizations> | undefined = undefined;
  let customer: Selectable<Customers> | undefined = undefined;
  let job: Selectable<Jobs> | undefined = undefined;
  let contact: Selectable<Contacts> | undefined = undefined;
  let property: Selectable<Properties> | undefined = undefined;
  let lead:
    | (Selectable<Leads> & { stageName: string | null })
    | undefined = undefined;
  let opportunity:
    | (Selectable<Opportunities> & { stageName: string | null })
    | undefined = undefined;
  let currentUser: Selectable<Users> | undefined = undefined;
  let jobInsurance: Selectable<JobInsurance> | undefined = undefined;
  let jobAssignedUsers: {
    id: number;
    displayName: string;
    email: string;
  }[] = [];

  // 1. Fetch Live Data
  if (!context.useSampleData) {
    org = await db
      .selectFrom("organizations")
      .selectAll()
      .where("id", "=", context.orgId)
      .executeTakeFirst();

    if (context.jobId) {
      job = await db
        .selectFrom("jobs")
        .selectAll()
        .where("id", "=", context.jobId)
        .where("orgId", "=", context.orgId)
        .executeTakeFirst();

      if (job) {
        jobInsurance = await db
          .selectFrom("jobInsurance")
          .selectAll()
          .where("jobId", "=", job.id)
          .executeTakeFirst();

        jobAssignedUsers = await db
          .selectFrom("jobAssignments")
          .innerJoin("users", "users.id", "jobAssignments.userId")
          .select(["users.id", "users.displayName", "users.email"])
          .where("jobAssignments.jobId", "=", job.id)
          .execute();

        if (!context.customerId && job.customerId) {
          customer = await db
            .selectFrom("customers")
            .selectAll()
            .where("id", "=", job.customerId)
            .executeTakeFirst();
        }
        if (!context.propertyId && job.propertyId) {
          property = await db
            .selectFrom("properties")
            .selectAll()
            .where("id", "=", job.propertyId)
            .executeTakeFirst();
        }
      }
    }

    if (context.customerId && !customer) {
      customer = await db
        .selectFrom("customers")
        .selectAll()
        .where("id", "=", context.customerId)
        .where("orgId", "=", context.orgId)
        .executeTakeFirst();
    }

    if (context.contactId) {
      contact = await db
        .selectFrom("contacts")
        .selectAll()
        .where("id", "=", context.contactId)
        .where("orgId", "=", context.orgId)
        .executeTakeFirst();
    }

    if (context.propertyId && !property) {
      property = await db
        .selectFrom("properties")
        .selectAll()
        .where("id", "=", context.propertyId)
        .where("orgId", "=", context.orgId)
        .executeTakeFirst();
    }

    if (context.leadId) {
      lead = await db
        .selectFrom("leads")
        .leftJoin("pipelineStages", "pipelineStages.id", "leads.stageId")
        .selectAll("leads")
        .select("pipelineStages.name as stageName")
        .where("leads.id", "=", context.leadId)
        .where("leads.orgId", "=", context.orgId)
        .executeTakeFirst();
    }

    if (context.opportunityId) {
      opportunity = await db
        .selectFrom("opportunities")
        .leftJoin(
          "pipelineStages",
          "pipelineStages.id",
          "opportunities.stageId",
        )
        .selectAll("opportunities")
        .select("pipelineStages.name as stageName")
        .where("opportunities.id", "=", context.opportunityId)
        .where("opportunities.orgId", "=", context.orgId)
        .executeTakeFirst();
    }

    if (context.currentUserId) {
      currentUser = await db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", context.currentUserId)
        .executeTakeFirst();
    }
  }

  // 2. Fallback / Sample Data Models
  const sampleData = {
    organization: {
      name: "Acme Restoration LLC",
      logo: "https://via.placeholder.com/150x50?text=Logo",
      phone: "(555) 019-9999",
      email: "info@acmerestoration.example.com",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      website: "www.acmerestoration.example.com",
      fullAddress: "123 Main St, Austin, TX 78701",
    },
    customer: {
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "(555) 010-0000",
      address: "456 Oak Ln",
      city: "Austin",
      state: "TX",
      zip: "78704",
      fullAddress: "456 Oak Ln, Austin, TX 78704",
      type: "residential",
    },
    contact: {
      firstName: "Jane",
      lastName: "Doe",
      fullName: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "(555) 012-3456",
      title: "Property Manager",
    },
    property: {
      name: "Oak Lane Residence",
      address: "456 Oak Ln",
      city: "Austin",
      state: "TX",
      zip: "78704",
      fullAddress: "456 Oak Ln, Austin, TX 78704",
      propertyType: "Residential",
    },
    job: {
      title: "Roof Replacement",
      number: "JOB-2023-001",
      status: "active",
      jobType: "Roofing",
      startDate: new Date(),
      targetCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estimatedValue: "15000",
      nextStep: "Order materials",
      notes: "Customer requested GAF Timberline HDZ shingles.",
      needsReview: false,
    },
    insurance: {
      claimNumber: "CLM-987654321",
      policyNumber: "POL-123456789",
      carrierName: "State Farm",
      carrierPhone: "(800) 555-1234",
      carrierEmail: "claims@statefarm.example.com",
      adjusterName: "Sarah Adjuster",
      adjusterPhone: "(555) 987-6543",
      adjusterEmail: "sarah.adjuster@statefarm.example.com",
      dateOfLoss: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      deductible: "1000",
      coverageType: "RCV",
    },
    lead: {
      name: "Water Damage Inquiry",
      source: "Website",
      estimatedValue: "5000",
      stage: "New",
      notes: "Customer reported water damage in basement.",
    },
    opportunity: {
      name: "Kitchen Remodel",
      value: "25000",
      stage: "Estimation",
      expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: "High priority project.",
    },
    currentUser: {
      name: "Admin User",
      email: "admin@acmerestoration.example.com",
    },
    assignedUser: {
      name: "Project Manager",
      email: "pm@acmerestoration.example.com",
    },
    estimate: {
      number: "EST-1001",
      issueDate: new Date(),
      total: "15000",
      subtotal: "14000",
      tax: "1000",
      notes: "Estimate valid for 30 days.",
    },
    contract: {
      number: "CON-2001",
      amount: "15000",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Standard contract terms apply.",
    },
    workOrder: {
      number: "WO-3001",
      title: "Roof Tear-off",
      notes: "Ensure tarps are placed around perimeter.",
    },
  };

  const rawValues: Record<string, any> = {};

  // 3. Populate raw structural values safely handling nulls
  if (context.useSampleData) {
    const o = sampleData.organization;
    rawValues["organization.name"] = o.name;
    rawValues["organization.logo"] = o.logo;
    rawValues["organization.phone"] = o.phone;
    rawValues["organization.email"] = o.email;
    rawValues["organization.address"] = o.address;
    rawValues["organization.city"] = o.city;
    rawValues["organization.state"] = o.state;
    rawValues["organization.zip"] = o.zip;
    rawValues["organization.website"] = o.website;
    rawValues["organization.fullAddress"] = o.fullAddress;

    const c = sampleData.customer;
    rawValues["customer.name"] = c.name;
    rawValues["customer.email"] = c.email;
    rawValues["customer.phone"] = c.phone;
    rawValues["customer.address"] = c.address;
    rawValues["customer.city"] = c.city;
    rawValues["customer.state"] = c.state;
    rawValues["customer.zip"] = c.zip;
    rawValues["customer.fullAddress"] = c.fullAddress;
    rawValues["customer.type"] = c.type;

    const ct = sampleData.contact;
    rawValues["contact.firstName"] = ct.firstName;
    rawValues["contact.lastName"] = ct.lastName;
    rawValues["contact.fullName"] = ct.fullName;
    rawValues["contact.email"] = ct.email;
    rawValues["contact.phone"] = ct.phone;
    rawValues["contact.title"] = ct.title;

    const p = sampleData.property;
    rawValues["property.name"] = p.name;
    rawValues["property.address"] = p.address;
    rawValues["property.city"] = p.city;
    rawValues["property.state"] = p.state;
    rawValues["property.zip"] = p.zip;
    rawValues["property.fullAddress"] = p.fullAddress;
    rawValues["property.propertyType"] = p.propertyType;

    const j = sampleData.job;
    rawValues["job.title"] = j.title;
    rawValues["job.number"] = j.number;
    rawValues["job.status"] = j.status;
    rawValues["job.jobType"] = j.jobType;
    rawValues["job.startDate"] = j.startDate;
    rawValues["job.targetCompletionDate"] = j.targetCompletionDate;
    rawValues["job.estimatedValue"] = j.estimatedValue;
    rawValues["job.nextStep"] = j.nextStep;
    rawValues["job.notes"] = j.notes;
    rawValues["job.needsReview"] = j.needsReview;

    const i = sampleData.insurance;
    rawValues["insurance.claimNumber"] = i.claimNumber;
    rawValues["insurance.policyNumber"] = i.policyNumber;
    rawValues["insurance.carrierName"] = i.carrierName;
    rawValues["insurance.carrierPhone"] = i.carrierPhone;
    rawValues["insurance.carrierEmail"] = i.carrierEmail;
    rawValues["insurance.adjusterName"] = i.adjusterName;
    rawValues["insurance.adjusterPhone"] = i.adjusterPhone;
    rawValues["insurance.adjusterEmail"] = i.adjusterEmail;
    rawValues["insurance.dateOfLoss"] = i.dateOfLoss;
    rawValues["insurance.deductible"] = i.deductible;
    rawValues["insurance.coverageType"] = i.coverageType;

    const l = sampleData.lead;
    rawValues["lead.name"] = l.name;
    rawValues["lead.source"] = l.source;
    rawValues["lead.estimatedValue"] = l.estimatedValue;
    rawValues["lead.stage"] = l.stage;
    rawValues["lead.notes"] = l.notes;

    const op = sampleData.opportunity;
    rawValues["opportunity.name"] = op.name;
    rawValues["opportunity.value"] = op.value;
    rawValues["opportunity.stage"] = op.stage;
    rawValues["opportunity.expectedCloseDate"] = op.expectedCloseDate;
    rawValues["opportunity.notes"] = op.notes;

    const u = sampleData.currentUser;
    rawValues["currentUser.name"] = u.name;
    rawValues["currentUser.email"] = u.email;

    const a = sampleData.assignedUser;
    rawValues["assignedUser.name"] = a.name;
    rawValues["assignedUser.email"] = a.email;

    rawValues["estimate.number"] = sampleData.estimate.number;
    rawValues["estimate.issueDate"] = sampleData.estimate.issueDate;
    rawValues["estimate.total"] = sampleData.estimate.total;
    rawValues["estimate.subtotal"] = sampleData.estimate.subtotal;
    rawValues["estimate.tax"] = sampleData.estimate.tax;
    rawValues["estimate.notes"] = sampleData.estimate.notes;

    rawValues["contract.number"] = sampleData.contract.number;
    rawValues["contract.amount"] = sampleData.contract.amount;
    rawValues["contract.startDate"] = sampleData.contract.startDate;
    rawValues["contract.endDate"] = sampleData.contract.endDate;
    rawValues["contract.notes"] = sampleData.contract.notes;

    rawValues["workOrder.number"] = sampleData.workOrder.number;
    rawValues["workOrder.title"] = sampleData.workOrder.title;
    rawValues["workOrder.notes"] = sampleData.workOrder.notes;
  } else {
    // Live Data path
    if (org) {
      rawValues["organization.name"] = org.name;
      rawValues["organization.logo"] = org.logoUrl;
      rawValues["organization.phone"] = org.phone;
      rawValues["organization.email"] = org.email;
      rawValues["organization.address"] = org.address;
      rawValues["organization.city"] = org.city;
      rawValues["organization.state"] = org.state;
      rawValues["organization.zip"] = org.zip;
      rawValues["organization.website"] = org.website;
      rawValues["organization.fullAddress"] = [
        org.address,
        org.city,
        org.state,
        org.zip,
      ]
        .filter(Boolean)
        .join(", ");
    }

    if (customer) {
      rawValues["customer.name"] = customer.name;
      rawValues["customer.email"] = customer.email;
      rawValues["customer.phone"] = customer.phone;
      rawValues["customer.address"] = customer.address;
      rawValues["customer.city"] = customer.city;
      rawValues["customer.state"] = customer.state;
      rawValues["customer.zip"] = customer.zip;
      rawValues["customer.fullAddress"] = [
        customer.address,
        customer.city,
        customer.state,
        customer.zip,
      ]
        .filter(Boolean)
        .join(", ");
      rawValues["customer.type"] = customer.type;
    }

    if (contact) {
      rawValues["contact.firstName"] = contact.firstName;
      rawValues["contact.lastName"] = contact.lastName;
      rawValues["contact.fullName"] = `${contact.firstName} ${contact.lastName || ""}`.trim();
      rawValues["contact.email"] = contact.email;
      rawValues["contact.phone"] = contact.phone;
      rawValues["contact.title"] = contact.title;
    }

    if (property) {
      rawValues["property.name"] = property.name;
      rawValues["property.address"] = property.address;
      rawValues["property.city"] = property.city;
      rawValues["property.state"] = property.state;
      rawValues["property.zip"] = property.zip;
      rawValues["property.fullAddress"] = [
        property.address,
        property.city,
        property.state,
        property.zip,
      ]
        .filter(Boolean)
        .join(", ");
      rawValues["property.propertyType"] = property.propertyType;
    }

    if (job) {
      rawValues["job.title"] = job.name;
      rawValues["job.number"] = job.id.toString();
      rawValues["job.status"] = job.status;
      rawValues["job.jobType"] = job.jobType;
      rawValues["job.startDate"] = job.startDate;
      rawValues["job.targetCompletionDate"] = job.targetCompletionDate;
      rawValues["job.estimatedValue"] = job.estimatedValue;
      rawValues["job.nextStep"] = job.nextStep;
      rawValues["job.notes"] = job.notes;
      rawValues["job.needsReview"] = job.needsReview;
    }

    if (jobInsurance) {
      rawValues["insurance.claimNumber"] = jobInsurance.claimNumber;
      rawValues["insurance.policyNumber"] = jobInsurance.policyNumber;
      rawValues["insurance.carrierName"] = jobInsurance.carrier;
      rawValues["insurance.carrierPhone"] = jobInsurance.carrierPhone;
      rawValues["insurance.carrierEmail"] = jobInsurance.carrierEmail;
      rawValues["insurance.adjusterName"] = jobInsurance.adjusterName;
      rawValues["insurance.adjusterPhone"] = jobInsurance.adjusterPhone;
      rawValues["insurance.adjusterEmail"] = jobInsurance.adjusterEmail;
      rawValues["insurance.dateOfLoss"] = jobInsurance.dateOfLoss;
      rawValues["insurance.deductible"] = jobInsurance.deductible;
      rawValues["insurance.coverageType"] = jobInsurance.coverageType;
    }

    if (lead) {
      rawValues["lead.name"] = lead.name;
      rawValues["lead.source"] = lead.source;
      rawValues["lead.estimatedValue"] = lead.estimatedValue;
      rawValues["lead.stage"] = lead.stageName;
      rawValues["lead.notes"] = lead.notes;
    }

    if (opportunity) {
      rawValues["opportunity.name"] = opportunity.name;
      rawValues["opportunity.value"] = opportunity.value;
      rawValues["opportunity.stage"] = opportunity.stageName;
      rawValues["opportunity.expectedCloseDate"] = opportunity.expectedCloseDate;
      rawValues["opportunity.notes"] = opportunity.notes;
    }

    if (currentUser) {
      rawValues["currentUser.name"] = currentUser.displayName;
      rawValues["currentUser.email"] = currentUser.email;
    }

    if (jobAssignedUsers && jobAssignedUsers.length > 0) {
      rawValues["assignedUser.name"] = jobAssignedUsers[0].displayName;
      rawValues["assignedUser.email"] = jobAssignedUsers[0].email;
    }

    // Document-specific tags — populated from context when creating/resolving a document
    if (context.documentNumber) {
      const dt = context.documentType || "";
      if (dt === "estimate") {
        rawValues["estimate.number"] = context.documentNumber;
        rawValues["estimate.issueDate"] = new Date();
      } else if (dt === "contract") {
        rawValues["contract.number"] = context.documentNumber;
        rawValues["contract.startDate"] = new Date();
      } else if (dt === "work_order") {
        rawValues["workOrder.number"] = context.documentNumber;
      }
    }
  }

  const now = new Date();
  rawValues["dates.today"] = now;
  rawValues["dates.currentDate"] = now;
  rawValues["dates.currentTime"] = now.toLocaleTimeString("en-US");
  rawValues["dates.currentDateTime"] = now.toLocaleString("en-US");

  // 4. Format all values utilizing registry standard formatting options
  const tagValues: Record<string, string> = {};
  for (const tag of templateTagRegistry) {
    tagValues[tag.key] = formatTagValue(rawValues[tag.key], tag.format);
  }

  // Helper string replacement for templated text (e.g., {{customer.name}})
  const resolveText = (
    text?: string,
  ): { resolved: string; warnings: string[] } => {
    if (!text) return { resolved: "", warnings: [] };
    const warnings: string[] = [];
    const resolved = text.replace(/\{\{([\w.]+)\}\}/g, (match, tagKey) => {
      const def = getTagDefinition(tagKey);
      if (!def) {
        warnings.push(`Unknown tag: ${tagKey}`);
        return match;
      }
      const val = tagValues[tagKey];
      if (!val || val === def.fallback || val === "") {
        warnings.push(`Missing data for tag: ${tagKey}`);
        return def.fallback || `[Missing: ${def.label}]`;
      }
      return val;
    });
    return { resolved, warnings };
  };

  // 5. Structure the resolved blocks representing visual components
  const resolvedBlocks: ResolvedBlock[] = blocks.map((block) => {
    const resolvedBlock: ResolvedBlock = { ...block };
    const warnings: string[] = [];

    // Parse free-form text based blocks
    if (
      ["text", "heading", "notes", "termsAndConditions"].includes(block.type) &&
      block.content
    ) {
      const { resolved, warnings: textWarnings } = resolveText(block.content);
      resolvedBlock.resolvedContent = resolved;
      warnings.push(...textWarnings);
    }

    // Process nested columns content
    if (block.type === "columns" && block.settings?.columns) {
      resolvedBlock.settings = { ...block.settings };
      resolvedBlock.settings.columns = block.settings.columns.map(
        (col: any) => {
          const { resolved, warnings: colWarnings } = resolveText(col.content);
          warnings.push(...colWarnings);
          return { ...col, content: resolved };
        },
      );
    }

    // Build dedicated object stores for data-heavy component types
    if (block.type === "orgBranding") {
      resolvedBlock.resolvedData = {
        name: tagValues["organization.name"],
        address: tagValues["organization.address"],
        city: tagValues["organization.city"],
        state: tagValues["organization.state"],
        zip: tagValues["organization.zip"],
        phone: tagValues["organization.phone"],
        email: tagValues["organization.email"],
        website: tagValues["organization.website"],
        logo: rawValues["organization.logo"], // Keep raw URL unformatted
      };
    } else if (block.type === "customerInfo") {
      resolvedBlock.resolvedData = {
        name: tagValues["customer.name"],
        address: tagValues["customer.fullAddress"],
        phone: tagValues["customer.phone"],
        email: tagValues["customer.email"],
      };
    } else if (block.type === "propertyInfo") {
      resolvedBlock.resolvedData = {
        name: tagValues["property.name"],
        address: tagValues["property.fullAddress"],
        propertyType: tagValues["property.propertyType"],
      };
    } else if (block.type === "jobInfo") {
      resolvedBlock.resolvedData = {
        title: tagValues["job.title"],
        number: tagValues["job.number"],
        status: tagValues["job.status"],
        type: tagValues["job.jobType"],
        startDate: tagValues["job.startDate"],
        targetCompletionDate: tagValues["job.targetCompletionDate"],
        value: tagValues["job.estimatedValue"],
      };
    } else if (block.type === "insuranceInfo") {
      resolvedBlock.resolvedData = {
        claimNumber: tagValues["insurance.claimNumber"],
        policyNumber: tagValues["insurance.policyNumber"],
        carrier: tagValues["insurance.carrierName"],
        adjuster: tagValues["insurance.adjusterName"],
        dateOfLoss: tagValues["insurance.dateOfLoss"],
        deductible: tagValues["insurance.deductible"],
      };
    } else if (block.type === "estimateLineItems") {
      // Create visually representative structure lines as placeholders when raw payload lacks it
      resolvedBlock.resolvedData = {
        items: context.useSampleData
          ? [
              {
                description: "Remove and dispose of existing shingles",
                quantity: 25,
                unit: "SQ",
                unitPrice: "$100.00",
                total: "$2,500.00",
              },
              {
                description: "Install ice and water shield",
                quantity: 2,
                unit: "RL",
                unitPrice: "$150.00",
                total: "$300.00",
              },
              {
                description: "Install GAF Timberline HDZ Shingles",
                quantity: 25,
                unit: "SQ",
                unitPrice: "$200.00",
                total: "$5,000.00",
              },
            ]
          : [],
      };
    } else if (block.type === "totals") {
      resolvedBlock.resolvedData = {
        subtotal: tagValues["estimate.subtotal"] || "$0.00",
        tax: tagValues["estimate.tax"] || "$0.00",
        total: tagValues["estimate.total"] || "$0.00",
      };
    }

    if (warnings.length > 0) {
      resolvedBlock.warnings = warnings;
      globalWarnings.push(...warnings);
    }

    return resolvedBlock;
  });

  return { resolvedBlocks, tagValues, warnings: globalWarnings };
}