import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";

// Global search across customers, contacts, leads, and opportunities
export const search = query({
  args: {
    orgId: v.id("organizations"),
    term: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    if (!args.term || args.term.trim().length < 2) return { customers: [], contacts: [], leads: [], opportunities: [] };

    const term = args.term.toLowerCase().trim();

    const [customers, contacts, leads, opportunities] = await Promise.all([
      ctx.db
        .query("customers")
        .withIndex("by_org_and_deleted", (q) => q.eq("orgId", args.orgId).eq("isDeleted", false))
        .collect()
        .then((rows) =>
          rows
            .filter((c) => c.name.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term))
            .slice(0, 5)
            .map((c) => ({ type: "customer" as const, id: c._id, title: c.name, subtitle: c.email ?? c.phone ?? "" })),
        ),
      ctx.db
        .query("contacts")
        .withIndex("by_org_and_deleted", (q) => q.eq("orgId", args.orgId).eq("isDeleted", false))
        .collect()
        .then((rows) =>
          rows
            .filter(
              (c) =>
                c.firstName.toLowerCase().includes(term) ||
                c.lastName?.toLowerCase().includes(term) ||
                c.email?.toLowerCase().includes(term),
            )
            .slice(0, 5)
            .map((c) => ({
              type: "contact" as const,
              id: c._id,
              title: `${c.firstName} ${c.lastName ?? ""}`.trim(),
              subtitle: c.email ?? c.phone ?? "",
            })),
        ),
      ctx.db
        .query("leads")
        .withIndex("by_org_and_deleted", (q) => q.eq("orgId", args.orgId).eq("isDeleted", false))
        .collect()
        .then((rows) =>
          rows
            .filter((l) => l.title.toLowerCase().includes(term))
            .slice(0, 5)
            .map((l) => ({ type: "lead" as const, id: l._id, title: l.title, subtitle: "Lead" })),
        ),
      ctx.db
        .query("opportunities")
        .withIndex("by_org_and_deleted", (q) => q.eq("orgId", args.orgId).eq("isDeleted", false))
        .collect()
        .then((rows) =>
          rows
            .filter((o) => o.title.toLowerCase().includes(term))
            .slice(0, 5)
            .map((o) => ({ type: "opportunity" as const, id: o._id, title: o.title, subtitle: "Opportunity" })),
        ),
    ]);

    return { customers, contacts, leads, opportunities };
  },
});
