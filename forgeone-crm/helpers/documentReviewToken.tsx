import { db } from "./db";
import { Selectable } from "kysely";
import { DocumentReviewLinks, JobDocuments } from "./schema";
import { nanoid } from "nanoid";

export function generateReviewToken(): string {
  return nanoid(32);
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function buildReviewUrl(token: string): string {
  return `https://forgeone.agclaimsworks.com/review/${token}`;
}

export async function verifyReviewLink(token: string): Promise<{ link: Selectable<DocumentReviewLinks>, document: Selectable<JobDocuments> } | null> {
  const hashed = await hashToken(token);
  
  const link = await db.selectFrom("documentReviewLinks")
    .selectAll()
    .where("tokenHash", "=", hashed)
    .where("isRevoked", "=", false)
    .executeTakeFirst();
    
  if (!link) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;
  
  const document = await db.selectFrom("jobDocuments")
    .selectAll()
    .where("id", "=", link.documentId)
    .executeTakeFirst();
    
  if (!document) return null;
  
  return { link, document };
}