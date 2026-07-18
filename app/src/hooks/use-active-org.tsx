import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";

const ORG_STORAGE_KEY = "forgeone_active_org";

type ActiveOrgContextType = {
  activeOrgId: Id<"organizations"> | null;
  setActiveOrgId: (id: Id<"organizations">) => void;
};

const ActiveOrgContext = createContext<ActiveOrgContextType | null>(null);

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const [activeOrgId, setActiveOrgIdState] = useState<Id<"organizations"> | null>(() => {
    const stored = localStorage.getItem(ORG_STORAGE_KEY);
    return stored ? (stored as Id<"organizations">) : null;
  });

  const setActiveOrgId = (id: Id<"organizations">) => {
    localStorage.setItem(ORG_STORAGE_KEY, id);
    setActiveOrgIdState(id);
  };

  return (
    <ActiveOrgContext.Provider value={{ activeOrgId, setActiveOrgId }}>
      {children}
    </ActiveOrgContext.Provider>
  );
}

export function useActiveOrg() {
  const ctx = useContext(ActiveOrgContext);
  if (!ctx) throw new Error("useActiveOrg must be used within ActiveOrgProvider");
  return ctx;
}

// Returns the current user's org memberships (with org data) and handles auto-selection
export function useMyOrgs() {
  const { activeOrgId, setActiveOrgId } = useActiveOrg();
  const { isAuthenticated } = useConvexAuth();
  const myOrgs = useQuery(api.orgs.memberships.listMyOrgs, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!myOrgs || myOrgs.length === 0) return;
    // Auto-select first org if none stored or stored org is no longer valid
    const valid = myOrgs.find((m) => m.orgId === activeOrgId);
    if (!valid) {
      setActiveOrgId(myOrgs[0].orgId);
    }
  }, [myOrgs, activeOrgId, setActiveOrgId]);

  return {
    myOrgs: myOrgs ?? [],
    activeOrgId,
    setActiveOrgId,
    activeMembership: myOrgs?.find((m) => m.orgId === activeOrgId),
  };
}
