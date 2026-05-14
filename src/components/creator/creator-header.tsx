import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  MousePointerClick,
  Ticket,
  UserSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CreatorHeader() {
  const location = useLocation();

  const links = [
    {
      href: "/creator/analytics" as const,
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      href: "/creator/tickets" as const,
      label: "Tickets",
      icon: <Ticket className="h-4 w-4" />,
    },
    {
      href: "/creator/performance" as const,
      label: "Performance",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      href: "/creator/source-tracker" as const,
      label: "Sources",
      icon: <MousePointerClick className="h-4 w-4" />,
    },
    {
      href: "/creator/user-lookup" as const,
      label: "User Lookup",
      icon: <UserSearch className="h-4 w-4" />,
    },
  ];

  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4">
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="text-white/90">Admin Console</div>
          <div className="h-4 w-px bg-white/10" />
          <nav className="flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors",
                  location.pathname === link.href ||
                    location.pathname.startsWith(`${link.href}/`)
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
