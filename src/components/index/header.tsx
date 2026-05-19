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

type PreservedSearchParams = Record<
  string,
  string | string[] | boolean | undefined
>;

const appendSearchString = (path: string, searchStr: string) => {
  const normalizedSearch = searchStr.startsWith("?")
    ? searchStr.slice(1)
    : searchStr;

  if (!normalizedSearch) return path;

  const hashIndex = path.indexOf("#");
  const pathWithoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const separator = pathWithoutHash.includes("?") ? "&" : "?";

  return `${pathWithoutHash}${separator}${normalizedSearch}${hash}`;
};

const buildPathWithSearch = (path: string, search: PreservedSearchParams) => {
  const params = new URLSearchParams();

  Object.entries(search).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.set(key, String(value));
  });

  return appendSearchString(path, params.toString());
};

const parseSearchString = (searchStr: string): PreservedSearchParams => {
  const params = new URLSearchParams(
    searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
  );
  const search: PreservedSearchParams = {};

  params.forEach((value, key) => {
    const currentValue = search[key];

    if (currentValue === undefined) {
      search[key] = value;
      return;
    }

    if (Array.isArray(currentValue)) {
      search[key] = [...currentValue, value];
      return;
    }

    search[key] = [String(currentValue), value];
  });

  return search;
};

export const HomeHeader = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useRouterState({
    select: (state) => state.location,
  });
  const pathname = location.pathname;
  const preservedSearchStr = location.searchStr || "";
  const preservedSearch = React.useMemo(
    () => parseSearchString(preservedSearchStr),
    [preservedSearchStr],
  );
  const buildPreservedPath = React.useCallback(
    (path: string) => appendSearchString(path, preservedSearchStr),
    [preservedSearchStr],
  );
  const registerTrialPath = React.useMemo(
    () =>
      buildPathWithSearch("/register", {
        ...preservedSearch,
        trial: true,
        redirect: undefined,
        code: undefined,
      }),
    [preservedSearch],
  );
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
          <MonekoIcon href={buildPreservedPath("/")} />

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
                        href={buildPreservedPath(feature.href)}
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
                  href={buildPreservedPath("/how-it-works")}
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
                  href={buildPreservedPath("/changelog")}
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
                        href={buildPreservedPath(resource.href)}
                        icon={resource.icon}
                        isActive={isPathActive(resource.href)}
                      >
                        {resource.description}
                      </ListItem>
                    ))}
                    <ListItem
                      title="Blog"
                      href={buildPreservedPath("/blogs")}
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
                  href={buildPreservedPath("/pricing")}
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
                  href={buildPreservedPath("/download")}
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
              <MonekoIcon href={buildPreservedPath("/")} />
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
                          href={buildPreservedPath(item.href)}
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
                          href={buildPreservedPath(item.href)}
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
                href={buildPreservedPath("/how-it-works")}
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/how-it-works") && "bg-accent text-primary",
                )}
              >
                How it Works
              </MobileLink>
              <MobileLink
                href={buildPreservedPath("/changelog")}
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/changelog") && "bg-accent text-primary",
                )}
              >              
                Changelog
              </MobileLink>
              <MobileLink
                href={buildPreservedPath("/pricing")}
                setIsOpen={setIsOpen}
                className={cn(
                  "px-2 py-3 text-base",
                  isPathActive("/pricing") && "bg-accent text-primary",
                )}
              >
                Pricing
              </MobileLink>
              <MobileLink
                href={buildPreservedPath("/download")}
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
                      navigate({ href: buildPreservedPath("/dashboard") });
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
                      navigate({ href: registerTrialPath });
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
                onClick={() =>
                  navigate({ href: buildPreservedPath("/dashboard") })
                }
                className="ring-background cursor-pointer ring-2 transition-transform hover:scale-105"
              />            
            </div>
          ) : (
            <div className="flex items-center gap-3">              
              <Button
                onClick={() =>
                  navigate({ href: registerTrialPath })
                }
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
  Omit<React.ComponentPropsWithoutRef<typeof Link>, "children"> & {
    title: string;
    children: React.ReactNode;
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
  href,
  setIsOpen,
  children,
  className,
}: {
  href: string;
  setIsOpen: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={href}
      href={href}
      onClick={() => {
        setIsOpen(false);
      }}
      className={cn(
        "text-muted-foreground hover:text-primary hover:bg-accent flex w-full cursor-pointer items-center rounded-md p-2 text-sm font-medium transition-colors",
        className,
      )}
    >
      {children}
    </Link>
  );
}
