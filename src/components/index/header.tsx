"use client";

import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { DISCORD_URL } from "@/lib/external-links";
import { useAuth } from "@/contexts/auth-context";
import { UserAvatar } from "../ui/user-avatar";
import { MonekoIcon } from "../shared/moneko-icon";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "../ui/sheet";
import {
  Menu,
  Zap,
  Wallet,
  Users,
  BrainCircuit,
  LayoutGrid,
  BookOpen,
  Calculator,
  DollarSign,
  History,
  LifeBuoy,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const features = [
  {
    title: "WhatsApp Assistant",
    href: "/features/whatsapp-assistant",
    description:
      "Track spending naturally via text, voice, or photo directly in WhatsApp.",
    icon: Zap,
  },
  {
    title: "Pockets System",
    href: "/features/pockets-system",
    description:
      "Modern envelope budgeting. Give every dollar a job and stick to it.",
    icon: Wallet,
  },
  {
    title: "Household Mode",
    href: "/features/household-mode",
    description: "Manage joint finances and shared bills without the headache.",
    icon: Users,
  },
  {
    title: "AI Insights",
    href: "/features/ai-insights",
    description:
      'Ask "Can I afford this?" and get instant, data-backed answers.',
    icon: BrainCircuit,
  },
];

const resources = [
  {
    title: "How it Works",
    href: "/how-it-works",
    description: "See the Moneko workflow in action.",
    icon: LayoutGrid,
  },
  {
    title: "Calculators",
    href: "/calculators",
    description: "Free tools for mortgage, loans, and more.",
    icon: Calculator,
  },
  {
    title: "Guides",
    href: "/guides/how-to-calculate-net-worth",
    description: "Practical, step-by-step personal finance guides.",
    icon: BookOpen,
  },
  {
    title: "Pricing",
    href: "/pricing",
    description: "Simple plans for powerful tools.",
    icon: DollarSign,
  },
  {
    title: "Help Center",
    href: "/help",
    description: "Guides, tutorials, and support resources.",
    icon: LifeBuoy,
  },
];

export const HomeHeader = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isPathActive = React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );
  const isFeaturesActive = features.some((item) => isPathActive(item.href));
  const isResourcesActive =
    resources.some((item) => isPathActive(item.href)) || isPathActive("/blogs");

  return (
    <header className="bg-background/95 md:bg-background/80 md:supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-0 z-50 border-b border-white/10 md:backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <MonekoIcon />
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "hover:text-foreground bg-transparent",
                    isFeaturesActive
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="bg-background/95 border-border grid w-[400px] gap-3 rounded-xl border p-4 shadow-2xl md:w-[500px] md:grid-cols-2 lg:w-[600px] lg:backdrop-blur-3xl">
                    {features.map((feature) => (
                      <ListItem
                        key={feature.title}
                        title={feature.title}
                        href={feature.href}
                        icon={feature.icon}
                        isActive={isPathActive(feature.href)}
                      >
                        {feature.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  to="/how-it-works"
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "hover:text-foreground bg-transparent",
                    isPathActive("/how-it-works")
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  How it Works
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  to="/changelog"
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "hover:text-foreground bg-transparent",
                    isPathActive("/changelog")
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Changelog
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "hover:text-foreground bg-transparent",
                    isResourcesActive
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="bg-background/95 border-border grid w-[400px] gap-3 rounded-xl border p-4 shadow-2xl md:w-[500px] md:grid-cols-2 lg:w-[600px] lg:backdrop-blur-3xl">
                    {resources.slice(1).map((resource) => (
                      <ListItem
                        key={resource.title}
                        title={resource.title}
                        href={resource.href}
                        icon={resource.icon}
                        isActive={isPathActive(resource.href)}
                      >
                        {resource.description}
                      </ListItem>
                    ))}
                    <ListItem
                      title="Blog"
                      href="/blogs"
                      icon={BookOpen}
                      isActive={isPathActive("/blogs")}
                    >
                      Latest updates and financial tips.
                    </ListItem>
                    <li className="row-span-3 list-none">
                      <NavigationMenuLink asChild>
                        <a
                          href={DISCORD_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="from-muted/50 to-muted hover:from-muted/70 hover:to-muted/80 flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-6 no-underline transition-all outline-none select-none focus:shadow-md"
                        >
                          <LayoutGrid className="h-6 w-6" />
                          <div className="mt-4 mb-2 text-lg font-medium">
                            Join Community
                          </div>
                          <p className="text-muted-foreground text-sm leading-tight">
                            Connect with other Moneko users on Discord.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  to="/pricing"
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "hover:text-foreground bg-transparent",
                    isPathActive("/pricing")
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Pricing
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  to="/download"
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "hover:text-foreground bg-transparent",
                    isPathActive("/download")
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Download
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="z-[100] w-[300px] overflow-y-auto rounded-r-3xl p-0 sm:w-[350px]"
          >
            <SheetHeader className="p-6 pb-2 text-left">
              <MonekoIcon />
            </SheetHeader>
            <nav className="flex flex-col px-4 pb-8">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="features" className="border-b-0">
                  <AccordionTrigger
                    className={cn(
                      "px-2 py-3 text-base font-medium hover:no-underline",
                      isFeaturesActive && "text-primary",
                    )}
                  >
                    Features
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-1 pl-2">
                      {features.map((item) => (
                        <MobileLink
                          key={item.href}
                          to={item.href}
                          setIsOpen={setIsOpen}
                          className={cn(
                            isPathActive(item.href) && "bg-accent text-primary",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "mr-2 h-4 w-4",
                              isPathActive(item.href)
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          {item.title}
                        </MobileLink>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="resources" className="border-b-0">
                  <AccordionTrigger
                    className={cn(
                      "px-2 py-3 text-base font-medium hover:no-underline",
                      isResourcesActive && "text-primary",
                    )}
                  >
                    Resources
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-1 pl-2">
                      {resources.map((item) => (
                        <MobileLink
                          key={item.href}
                          to={item.href}
                          setIsOpen={setIsOpen}
                          className={cn(
                            isPathActive(item.href) && "bg-accent text-primary",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "mr-2 h-4 w-4",
                              isPathActive(item.href)
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          {item.title}
                        </MobileLink>
                      ))}
                      <a
                        href={DISCORD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary hover:bg-accent flex w-full items-center rounded-md p-2 text-sm font-medium transition-colors"
                      >
                        <LayoutGrid className="text-muted-foreground mr-2 h-4 w-4" />
                        Community
                      </a>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="bg-border mx-2 my-2 h-px" />

              <MobileLink
                to="/how-it-works"
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/how-it-works") && "bg-accent text-primary",
                )}
              >
                How it Works
              </MobileLink>
              <MobileLink
                to="/changelog"
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/changelog") && "bg-accent text-primary",
                )}
              >              
                Changelog
              </MobileLink>
              <MobileLink
                to="/pricing"
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/pricing") && "bg-accent text-primary",
                )}
              >
                Pricing
              </MobileLink>
              <MobileLink
                to="/download"
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/download") && "bg-accent text-primary",
                )}
              >
                Download
              </MobileLink>

              <div className="mt-6 space-y-3 px-2">
                {isLoading ? (
                  <Button className="w-full rounded-xl" size="lg" disabled>
                    Loading...
                  </Button>
                ) : user ? (
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      navigate({ to: "/dashboard" });
                    }}
                    className="w-full rounded-xl"
                    size="lg"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      navigate({ to: "/register", search: { trial: true, redirect: undefined, code: undefined } });
                    }}
                    className="w-full rounded-xl dark:text-white"
                    size="lg"
                  >
                    Try it Free — No Credit Card
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-4 md:flex">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="font-medium" disabled>
                Loading...
              </Button>
              <Button
                className="rounded-full px-5 font-medium dark:text-white"
                disabled
              >
                Please wait
              </Button>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <UserAvatar
                size="sm"
                onClick={() => navigate({ to: "/dashboard" })}
                className="ring-background cursor-pointer ring-2 transition-transform hover:scale-105"
              />            
            </div>
          ) : (
            <div className="flex items-center gap-3">              
              <Button
                onClick={() => navigate({ to: "/register", search: { trial: true, redirect: undefined, code: undefined } })}
                className="rounded-full px-5 font-medium dark:text-white"
              >
                Try it Free — No Credit Card
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<typeof Link>,
  React.ComponentPropsWithoutRef<typeof Link> & {
    title: string;
    icon?: any;
    isActive?: boolean;
  }
>(({ className, title, children, icon: Icon, isActive, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          className={cn(
            "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none",
            isActive && "bg-accent/70",
            className,
          )}
          {...props}
        >
          <div
            className={cn(
              "group-hover:text-primary flex items-center gap-2 text-sm leading-none font-medium transition-colors",
              isActive && "text-primary",
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors",
                  isActive && "text-primary",
                )}
              />
            )}
            {title}
          </div>
          <p className="text-muted-foreground mt-1 ml-6 line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

function MobileLink({
  to,
  setIsOpen,
  children,
  className,
}: {
  to: string;
  setIsOpen: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        setIsOpen(false);
        navigate({ to });
      }}
      className={cn(
        "text-muted-foreground hover:text-primary hover:bg-accent flex w-full cursor-pointer items-center rounded-md p-2 text-sm font-medium transition-colors",
        className,
      )}
    >
      {children}
    </a>
  );
}
