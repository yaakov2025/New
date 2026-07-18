/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crm_contacts from "../crm/contacts.js";
import type * as crm_customers from "../crm/customers.js";
import type * as crm_leads from "../crm/leads.js";
import type * as crm_opportunities from "../crm/opportunities.js";
import type * as crm_pipelineStages from "../crm/pipelineStages.js";
import type * as crm_properties from "../crm/properties.js";
import type * as crm_search from "../crm/search.js";
import type * as crm_stats from "../crm/stats.js";
import type * as jobs_activity from "../jobs/activity.js";
import type * as jobs_appointments from "../jobs/appointments.js";
import type * as jobs_assignments from "../jobs/assignments.js";
import type * as jobs_contacts from "../jobs/contacts.js";
import type * as jobs_files from "../jobs/files.js";
import type * as jobs_insurance from "../jobs/insurance.js";
import type * as jobs_jobs from "../jobs/jobs.js";
import type * as jobs_notes from "../jobs/notes.js";
import type * as jobs_photos from "../jobs/photos.js";
import type * as jobs_statuses from "../jobs/statuses.js";
import type * as jobs_tasks from "../jobs/tasks.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_jobActivity from "../lib/jobActivity.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as orgs_members from "../orgs/members.js";
import type * as orgs_memberships from "../orgs/memberships.js";
import type * as orgs_organizations from "../orgs/organizations.js";
import type * as orgs_settings from "../orgs/settings.js";
import type * as platform_admin from "../platform/admin.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "crm/contacts": typeof crm_contacts;
  "crm/customers": typeof crm_customers;
  "crm/leads": typeof crm_leads;
  "crm/opportunities": typeof crm_opportunities;
  "crm/pipelineStages": typeof crm_pipelineStages;
  "crm/properties": typeof crm_properties;
  "crm/search": typeof crm_search;
  "crm/stats": typeof crm_stats;
  "jobs/activity": typeof jobs_activity;
  "jobs/appointments": typeof jobs_appointments;
  "jobs/assignments": typeof jobs_assignments;
  "jobs/contacts": typeof jobs_contacts;
  "jobs/files": typeof jobs_files;
  "jobs/insurance": typeof jobs_insurance;
  "jobs/jobs": typeof jobs_jobs;
  "jobs/notes": typeof jobs_notes;
  "jobs/photos": typeof jobs_photos;
  "jobs/statuses": typeof jobs_statuses;
  "jobs/tasks": typeof jobs_tasks;
  "lib/audit": typeof lib_audit;
  "lib/jobActivity": typeof lib_jobActivity;
  "lib/permissions": typeof lib_permissions;
  "orgs/members": typeof orgs_members;
  "orgs/memberships": typeof orgs_memberships;
  "orgs/organizations": typeof orgs_organizations;
  "orgs/settings": typeof orgs_settings;
  "platform/admin": typeof platform_admin;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
