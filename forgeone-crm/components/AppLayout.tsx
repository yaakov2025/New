import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../helpers/useAuth";
import { useOrgList, useSwitchOrg } from "../helpers/useOrganizations";
import { useGlobalSearch } from "../helpers/useSearch";
import { useDebounce } from "../helpers/useDebounce";
import { Button } from "./Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./DropdownMenu";
import { Avatar, AvatarFallback, AvatarImage } from "./Avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Input } from "./Input";
import { LayoutDashboard, Users, Filter, Target, Briefcase, Settings as SettingsIcon, LogOut, Menu, Search, X, Shield, FileText } from "lucide-react";
import styles from "./AppLayout.module.css";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { authState, logout } = useAuth();
  const { data: orgsData } = useOrgList();
  const { mutate: switchOrg } = useSwitchOrg();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: searchResults, isFetching: searchFetching } = useGlobalSearch(debouncedSearch);

  if (authState.type !== "authenticated") return null;

  const user = authState.user;
  const currentOrg = orgsData?.orgs.find(o => o.id === user.currentOrgId);

  const navLinks = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/leads", icon: Filter, label: "Leads" },
    { to: "/opportunities", icon: Target, label: "Opportunities" },
    { to: "/jobs", icon: Briefcase, label: "Jobs" },
    { to: "/templates", icon: FileText, label: "Templates" },
  ];

    if (user.currentOrgRole !== "sales") {
    navLinks.push({ to: "/settings", icon: SettingsIcon, label: "Settings" });
  }
  if (user.role === "super_admin") {
    navLinks.push({ to: "/admin", icon: Shield, label: "Admin" });
  }

  return (
    <div className={`dark ${styles.layout}`}>
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <Link to="/" className={styles.brand}>
            <img src="/_cdn/static/forgeone-logo.jpg" alt="ForgeOne" className={styles.brandLogo} />
            <img src="/_cdn/static/forgeone-symbol.jpg" alt="ForgeOne" className={styles.brandSymbol} />
          </Link>
          <Button variant="ghost" size="icon" className={styles.mobileClose} onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </Button>
        </div>
        <nav className={styles.nav}>
          {navLinks.map((link) => {
            const isActive = link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
            return (
              <Link key={link.to} to={link.to} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`} onClick={() => setMobileMenuOpen(false)}>
                <link.icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <Button variant="ghost" size="icon" className={styles.mobileMenuToggle} onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </Button>
            
            {orgsData && currentOrg && (
              <Select value={currentOrg.id.toString()} onValueChange={(val) => switchOrg({ orgId: parseInt(val) })}>
                <SelectTrigger className={styles.orgSwitcher}>
                  <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgsData.orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className={styles.topbarRight}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={styles.searchTrigger}>
                  <Search size={16} />
                  <span className={styles.searchPlaceholder}>Search...</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className={styles.searchPopover} align="end">
                <Input 
                  placeholder="Search customers, leads, jobs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className={styles.searchResults}>
                  {searchFetching && <p className={styles.searchState}>Searching...</p>}
                  {!searchFetching && searchResults && Object.keys(searchResults).length === 0 && debouncedSearch.length >= 2 && (
                    <p className={styles.searchState}>No results found.</p>
                  )}
                  {searchResults && Object.entries(searchResults).map(([type, items]) => (
                    <div key={type} className={styles.searchGroup}>
                      <h4 className={styles.searchGroupTitle}>{type.toUpperCase()}</h4>
                      {items.map(item => (
                        <div key={`${type}-${item.id}`} className={styles.searchItem} onClick={() => {
                          if (item.link) navigate(item.link);
                          setSearchQuery("");
                        }}>
                          <p className={styles.searchItemTitle}>{item.title}</p>
                          <p className={styles.searchItemSubtitle}>{item.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={styles.userMenuTrigger}>
                  <Avatar>
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className={styles.userInfo}>
                  <p className={styles.userName}>{user.displayName}</p>
                  <p className={styles.userEmail}>{user.email}</p>
                  <p className={styles.userRole}>{user.currentOrgRole} • {user.role}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <SettingsIcon size={16} style={{ marginRight: 8 }} /> {user.currentOrgRole === "sales" ? "Profile" : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut size={16} style={{ marginRight: 8 }} /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
};