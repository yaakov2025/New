import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Navigate } from "react-router-dom";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

function RedirectIfAuthenticated() {
  const { myOrgs, activeOrgId } = useMyOrgs();
  if (myOrgs.length === 0) return <Navigate to="/onboarding" replace />;
  if (activeOrgId) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/onboarding" replace />;
}

export default function Index() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>
      <Authenticated>
        <RedirectIfAuthenticated />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="space-y-3">
              <img
                src="https://hercules-cdn.com/file_2TWyhLHUfm0fSdWi4JSEBjkW"
                alt="ForgeOne"
                className="h-12 mx-auto object-contain"
              />
              <p className="text-muted-foreground text-sm">Business operating system for service companies</p>
            </div>
            <div className="space-y-3">
              <SignInButton className="w-full" />
              <p className="text-xs text-muted-foreground">
                Secure sign-in via ForgeOne Auth
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}
