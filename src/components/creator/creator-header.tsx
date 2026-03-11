import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreatorHeader() {
  const location = useLocation();

  const links = [
    {
      href: "/creator/analytics" as const,
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      active: location.pathname === "/creator/analytics",
    },
    {
      href: "/creator/tickets" as const,
      label: "Tickets",
      icon: <Ticket className="h-4 w-4" />,
      active: location.pathname === "/creator/tickets",
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
                  link.active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
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
