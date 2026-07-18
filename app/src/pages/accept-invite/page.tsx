import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";

function AcceptInviteInner({ token }: { token: string }) {
  const navigate = useNavigate();
  const { setActiveOrgId } = useMyOrgs();
  const acceptInvitation = useMutation(api.orgs.memberships.acceptInvitation);

  useEffect(() => {
    acceptInvitation({ token })
      .then((orgId) => {
        setActiveOrgId(orgId as Id<"organizations">);
        toast.success("You have joined the organization.");
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        if (err instanceof ConvexError) {
          toast.error((err.data as { message: string }).message);
        } else {
          toast.error("Failed to accept invitation");
        }
        navigate("/", { replace: true });
      });
  }, [token, acceptInvitation, setActiveOrgId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Spinner className="size-8 mx-auto" />
        <p className="text-muted-foreground text-sm">Accepting invitation...</p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <>
      <Authenticated>
        {token ? (
          <AcceptInviteInner token={token} />
        ) : (
          <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Invalid invitation</CardTitle>
                <CardDescription>This invitation link is missing or invalid.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Sign in to accept</CardTitle>
              <CardDescription>Sign in to ForgeOne to accept this invitation.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton className="w-full" />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
    </>
  );
}
