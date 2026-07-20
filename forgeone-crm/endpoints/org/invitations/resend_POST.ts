import { db } from '../../../helpers/db';
import { getOrgContext } from '../../../helpers/getOrgContext';
import { schema, OutputType } from "./resend_POST.schema";
import superjson from "superjson";
import { sendEmail } from "@floot/email";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const json = superjson.parse(await request.text());
    const { invitationId } = schema.parse(json);

    const invitation = await db.
    selectFrom("orgInvitations").
    selectAll().
    where("id", "=", invitationId).
    where("orgId", "=", orgId).
    where("status", "=", "pending").
    executeTakeFirst();

    if (!invitation) {
      return new Response(superjson.stringify({ error: "Invitation not found or no longer pending." }), { status: 404 });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return new Response(superjson.stringify({ error: "Invitation has expired." }), { status: 400 });
    }

    const org = await db.selectFrom("organizations").select("name").where("id", "=", orgId).executeTakeFirstOrThrow();
    const orgName = org.name;

    const origin = new URL(request.url).origin;
    const inviteUrl = `${origin}/invite/${invitation.token}`;

    const emailResult = await sendEmail({
      from: "ForgeOne <invites@mail.forgeone.agclaimsworks.com>",
      to: invitation.email.toLowerCase(),
      subject: `You're invited to join ${orgName} on ForgeOne`,
      html: `
        <div style="font-family: 'IBM Plex Sans', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #09090b; font-size: 24px; margin-bottom: 24px;">You're invited to join ${orgName}</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            You have been invited to join <strong>${orgName}</strong> on ForgeOne CRM as a <strong>${invitation.role}</strong>.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            Click the button below to accept your invitation and get started:
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; margin: 24px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${inviteUrl}" style="color: #3B82F6; word-break: break-all;">${inviteUrl}</a>
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `You're invited to join ${orgName} on ForgeOne CRM as a ${invitation.role}.\n\nAccept your invitation by visiting: ${inviteUrl}\n\nThis invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.`
    });

    if (emailResult.ok) {
      console.log("Resent invitation email to:", invitation.email);
      return new Response(superjson.stringify({ success: true, emailSent: true } satisfies OutputType));
    } else {
      console.error("Failed to resend invitation email:", emailResult.error.message);
      return new Response(superjson.stringify({
        success: true,
        emailSent: false,
        emailError: emailResult.error.message
      } satisfies OutputType));
    }

  } catch (error) {
    if (error instanceof Error) {
      return new Response(superjson.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(superjson.stringify({ error: "An unknown error occurred" }), { status: 400 });
  }
}