import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.js";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { myOrgs, setActiveOrgId } = useMyOrgs();
  const createOrg = useMutation(api.orgs.organizations.create);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    try {
      const orgId = await createOrg({ name: name.trim(), slug: slug.trim() });
      setActiveOrgId(orgId as Id<"organizations">);
      navigate("/settings", { replace: true });
      toast.success("Organization created. Complete your setup below.");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to create organization");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <img
            src="https://hercules-cdn.com/file_2TWyhLHUfm0fSdWi4JSEBjkW"
            alt="ForgeOne"
            className="h-10 mx-auto object-contain"
          />
          <h1 className="font-display text-2xl font-bold">Set up your organization</h1>
          <p className="text-muted-foreground text-sm">
            {myOrgs.length > 0 ? "Create an additional organization." : "Welcome to ForgeOne. Let's get started."}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <CardDescription>This is how your company will appear in ForgeOne.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Company name</Label>
                <Input
                  id="org-name"
                  placeholder="Acme Roofing"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Workspace URL</Label>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm px-3 border border-r-0 border-input rounded-l-md bg-muted h-9 flex items-center">
                    forgeone.app/
                  </span>
                  <Input
                    id="org-slug"
                    className="rounded-l-none"
                    placeholder="acme-roofing"
                    value={slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      setSlug(slugify(e.target.value));
                    }}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create organization"}
              </Button>
            </form>
          </CardContent>
        </Card>
        {myOrgs.length > 0 && (
          <p className="text-center text-sm">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-primary hover:underline cursor-pointer"
            >
              Back to dashboard
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
