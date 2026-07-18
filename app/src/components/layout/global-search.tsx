import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useMyOrgs } from "@/hooks/use-active-org.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Search, Users, UserRound, TrendingUp, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.js";

type ResultItem = {
  type: "customer" | "contact" | "lead" | "opportunity";
  id: Id<"customers"> | Id<"contacts"> | Id<"leads"> | Id<"opportunities">;
  title: string;
  subtitle: string;
};

const TYPE_ICONS = {
  customer: <Users className="size-3.5 text-blue-500" />,
  contact: <UserRound className="size-3.5 text-purple-500" />,
  lead: <Lightbulb className="size-3.5 text-amber-500" />,
  opportunity: <TrendingUp className="size-3.5 text-green-500" />,
};

const TYPE_ROUTES = {
  customer: (id: string) => `/customers/${id}`,
  contact: (id: string) => `/customers/contacts/${id}`,
  lead: (id: string) => `/pipeline/leads/${id}`,
  opportunity: (id: string) => `/pipeline/opportunities/${id}`,
};

export function GlobalSearch() {
  const { activeOrgId } = useMyOrgs();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debouncedTerm] = useDebounce(term, 300);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useQuery(
    api.crm.search.search,
    activeOrgId && debouncedTerm.length >= 2
      ? { orgId: activeOrgId, term: debouncedTerm }
      : "skip",
  );

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const allResults: ResultItem[] = results
    ? [
        ...(results.customers as ResultItem[]),
        ...(results.contacts as ResultItem[]),
        ...(results.leads as ResultItem[]),
        ...(results.opportunities as ResultItem[]),
      ]
    : [];

  const handleSelect = (item: ResultItem) => {
    setOpen(false);
    setTerm("");
    navigate(TYPE_ROUTES[item.type](item.id));
  };

  return (
    <div className="relative px-2 py-2">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex w-full items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground/50 text-sm transition-colors cursor-pointer"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] bg-sidebar-border px-1.5 py-0.5 rounded font-mono hidden sm:block">⌘K</kbd>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Search modal */}
          <div className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search customers, contacts, leads..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {term && (
                <button onClick={() => setTerm("")} className="cursor-pointer text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {debouncedTerm.length < 2 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Type at least 2 characters to search</p>
              ) : allResults.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results found for &quot;{debouncedTerm}&quot;</p>
              ) : (
                <ul>
                  {allResults.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors cursor-pointer",
                        )}
                      >
                        <span className="shrink-0">{TYPE_ICONS[item.type]}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-foreground truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="block text-xs text-muted-foreground truncate">{item.subtitle}</span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize shrink-0">{item.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
