import { Outlet } from "react-router-dom";
import { AppSidebar } from "./app-sidebar.tsx";
import { MobileBottomNav } from "./mobile-nav.tsx";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}
