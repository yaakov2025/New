import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../helpers/useAuth";
import { User } from "../helpers/User";
import { AuthErrorPage } from "./AuthErrorPage";
import { ShieldOff } from "lucide-react";
import { AuthLoadingState } from "./AuthLoadingState";
import { SelectOrgPrompt } from "./SelectOrgPrompt";
import styles from "./ProtectedRoute.module.css";

// Do not use this in pageLayout
const MakeProtectedRoute: (roles: User["role"][]) => React.FC<{
  children: React.ReactNode;
}> =
  (roles) =>
  ({ children }) => {
    const { authState } = useAuth();

    if (authState.type === "loading") {
      return <AuthLoadingState title="Authenticating" />;
    }

    if (authState.type === "unauthenticated") {
      return <Navigate to="/login" replace />;
    }

    if (!roles.includes(authState.user.role)) {
      return (
        <AuthErrorPage
          title="Access Denied"
          message={`Access denied. Your platform role (${authState.user.role}) lacks required permissions.`}
          icon={<ShieldOff className={styles.accessDeniedIcon} size={64} />}
        />
      );
    }

    return <>{children}</>;
  };

type OrgRole = NonNullable<User["currentOrgRole"]>;

const MakeOrgProtectedRoute: (orgRoles: OrgRole[]) => React.FC<{
  children: React.ReactNode;
}> =
  (allowedOrgRoles) =>
  ({ children }) => {
    const { authState } = useAuth();

    if (authState.type === "loading") {
      return <AuthLoadingState title="Authenticating" />;
    }

    if (authState.type === "unauthenticated") {
      return <Navigate to="/login" replace />;
    }

    const { user } = authState;

    // Super admins can view everything
    if (user.role === "super_admin") {
      return <>{children}</>;
    }

    // If not part of any org
    if (user.currentOrgId === null) {
      return <SelectOrgPrompt />;
    }

    // If part of an org but role is not in the allowed list
    if (!user.currentOrgRole || !allowedOrgRoles.includes(user.currentOrgRole)) {
      return (
        <AuthErrorPage
          title="Access Denied"
          message={`Access denied. Your organization role (${user.currentOrgRole ?? "None"}) lacks required permissions.`}
          icon={<ShieldOff className={styles.accessDeniedIcon} size={64} />}
        />
      );
    }

    return <>{children}</>;
  };

// Create protected routes here, then import them in pageLayout
export const SuperAdminRoute = MakeProtectedRoute(["super_admin"]);
export const AuthenticatedRoute = MakeProtectedRoute(["super_admin", "user"]);
export const OrgAdminRoute = MakeOrgProtectedRoute(["admin"]);
export const OrgManagerRoute = MakeOrgProtectedRoute(["admin", "manager"]);
export const OrgMemberRoute = MakeOrgProtectedRoute(["admin", "manager", "sales"]);
