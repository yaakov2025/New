import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils.ts";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  Shield,
  ChevronDown,
  Building2,
  LogOut,
  ChevronsUpDown,
  CheckIcon,
  TrendingUp,
} from "lucide-react";
import { GlobalSearch } from "./global-search.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { useIsPlatformAdmin } from "@/hooks/use-platform-admin.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Id } from "@/convex/_generated/dataModel.js";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
};

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-4" /> },
  { label: "Customers", href: "/customers", icon: <Users className="size-4" /> },
  { label: "Pipeline", href: "/pipeline", icon: <TrendingUp className="size-4" /> },
  { label: "Jobs", href: "/jobs", icon: <Briefcase className="size-4" /> },
];

const settingsNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: <Settings className="size-4" /> },
];

function NavLink({ item }: { item: NavItem }) {
  const location = useLocation();
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
  if (item.disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/40 cursor-not-allowed select-none">
        {item.icon}
        <span>{item.label}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-sidebar-foreground/30 font-medium">Soon</span>
      </div>
    );
  }
  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

export function AppSidebar() {
  const { user, signout } = useAuth();
  const { myOrgs, activeOrgId, setActiveOrgId, activeMembership } = useMyOrgs();
  const isPlatformAdmin = useIsPlatformAdmin();
  const activeOrg = activeMembership?.org;

  const initials = (name?: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Platform logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <img
          src="https://hercules-cdn.com/file_hbx8DFubNjdfl9Yai9n8QY8m"
          alt="ForgeOne"
          className="h-8 w-8 object-contain shrink-0"
        />
        <span className="font-display font-bold text-sidebar-foreground text-base tracking-tight">ForgeOne</span>
      </div>

      {/* Org switcher */}
      <div className="px-2 py-2 border-b border-sidebar-border">
        {myOrgs.length === 0 ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors text-left">
                <div className="flex items-center justify-center size-6 rounded bg-sidebar-primary/20 shrink-0">
                  <Building2 className="size-3 text-sidebar-primary" />
                </div>
                <span className="flex-1 text-sm text-sidebar-foreground truncate">
                  {activeOrg?.name ?? "Select org"}
                </span>
                <ChevronsUpDown className="size-3.5 text-sidebar-foreground/50 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
              {myOrgs.map((m) => (
                <DropdownMenuItem
                  key={m.orgId}
                  onClick={() => setActiveOrgId(m.orgId as Id<"organizations">)}
                  className="cursor-pointer"
                >
                  <Building2 className="size-3.5 mr-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{m.org?.name}</span>
                  {m.orgId === activeOrgId && <CheckIcon className="size-3.5 ml-2 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/onboarding/create-org" className="cursor-pointer">
                  <Building2 className="size-3.5 mr-2" />
                  Create organization
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Search */}
      <GlobalSearch />

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {isPlatformAdmin && (
          <>
            <div className="px-3 pt-4 pb-1">
              <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold">Platform</span>
            </div>
            <NavLink item={{ label: "Admin", href: "/platform", icon: <Shield className="size-4" /> }} />
          </>
        )}
      </nav>

      {/* Bottom: settings + user */}
      <div className="px-2 pb-2 border-t border-sidebar-border pt-2 space-y-0.5">
        {settingsNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors text-left">
              <Avatar className="size-6 shrink-0">
                <AvatarFallback className="text-[10px] bg-sidebar-primary/20 text-sidebar-primary">
                  {initials(user?.profile.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm text-sidebar-foreground truncate">
                {user?.profile.name ?? user?.profile.email ?? "Account"}
              </span>
              <ChevronDown className="size-3.5 text-sidebar-foreground/50 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
              {user?.profile.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signout()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="size-3.5 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
