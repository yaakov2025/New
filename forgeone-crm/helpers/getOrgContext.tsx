import { getServerUserSession } from "./getServerUserSession";
import { OrgRole } from "./schema";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getOrgContext(
  request: Request,
  config?: { requireOrgRole?: OrgRole[] }
) {
  const { user } = await getServerUserSession(request);

  if (!user.currentOrgId) {
    console.error("User has no currentOrgId");
    throw new AuthorizationError("No organization selected. Please switch to an organization.");
  }

  const isSuperAdmin = user.role === "super_admin";
 
  if (config?.requireOrgRole) {
    if (
      !user.currentOrgRole ||
      !config.requireOrgRole.includes(user.currentOrgRole as OrgRole)
    ) {
      console.error(`User does not have required org role: ${config.requireOrgRole.join(", ")}`);
      throw new AuthorizationError("Insufficient permissions for this organization.");
    }
  }

  return {
    user,
    orgId: user.currentOrgId,
    orgRole: user.currentOrgRole as OrgRole | null,
    isSuperAdmin,
  };
}