import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./invite_POST.schema";
import superjson from "superjson";
import { randomUUID } from "crypto";
import { sendEmail } from "@floot/email";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const json = superjson.parse(await request.text());
    const { email, role } = schema.parse(json);

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insertInto("orgInvitations").values({
      orgId,
      email: email.toLowerCase(),
      role,
      token,
      invitedBy: user.id,
      expiresAt,
    }).execute();

    const org = await db.selectFrom("organizations").select("name").where("id", "=", orgId).executeTakeFirstOrThrow();
    const orgName = org.name;
    
    const origin = new URL(request.url).origin;
    const inviteUrl = `${origin}/invite/${token}`;

    const emailResult = await sendEmail({
      from: "ForgeOne <invites@mail.forgeone.agclaimsworks.com>",
      to: email.toLowerCase(),
      subject: `You're invited to join ${orgName} on ForgeOne`,
      html: `
        <div style="font-family: 'IBM Plex Sans', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #09090b; font-size: 24px; margin-bottom: 24px;">You're invited to join ${orgName}</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            You have been invited to join <strong>${orgName}</strong> on ForgeOne CRM as a <strong>${role}</strong>.
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
      text: `You're invited to join ${orgName} on ForgeOne CRM as a ${role}.\n\nAccept your invitation by visiting: ${inviteUrl}\n\nThis invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.`,
    });

    if (emailResult.ok) {
      console.log("Invitation email sent successfully:", emailResult.messageId);
    } else {
      console.error("Failed to send invitation email:", emailResult.error.message);
    }

    return new Response(superjson.stringify({ success: true, token, inviteUrl, emailSent: emailResult.ok, emailError: emailResult.ok ? undefined : emailResult.error.message } satisfies OutputType));
  } catch (error) {
    if (error instanceof Error) {
      return new Response(superjson.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(superjson.stringify({ error: "An unknown error occurred" }), { status: 400 });
  }
}