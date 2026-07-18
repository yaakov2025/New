import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils.ts";

const mobileNav = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
  { label: "Customers", href: "/customers", icon: <Users className="size-5" /> },
  { label: "Pipeline", href: "/pipeline", icon: <TrendingUp className="size-5" /> },
  { label: "Jobs", href: "/jobs", icon: <Briefcase className="size-5" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="size-5" /> },
];

export function MobileBottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex md:hidden justify-around border-t bg-sidebar border-sidebar-border z-50">
      {mobileNav.map((item) => {
        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-3 text-[11px] transition-colors",
              isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60",
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
