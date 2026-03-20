import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Music2, LayoutDashboard, List, Plus, LogOut, Menu, X, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/works", label: "Verklista", icon: List },
  { to: "/works/new", label: "Nytt verk", icon: Plus },
  { to: "/clients", label: "Klienter", icon: Users },
  { to: "/agreements", label: "Förlagsavtal", icon: FileText },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:relative lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Music2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Music Super Circus</span>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs text-sidebar-foreground/70">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <header className="flex h-16 items-center gap-3 border-b px-4 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">
            {navItems.find((n) => n.to === location.pathname)?.label || "Musikförlagskatalogen"}
          </h1>
        </header>
        <div className="p-4 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
