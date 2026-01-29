"use client";

import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { DISCORD_URL } from "@/routes";
import { useAuth } from "@/contexts/auth-context";
import { UserAvatar } from "../ui/user-avatar";
import { MonekoIcon } from "../shared/moneko-icon";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "../ui/sheet";
import { Menu, Zap, Wallet, Users, BrainCircuit, LayoutGrid, BookOpen, Calculator, DollarSign } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const features = [
  {
    title: "WhatsApp Assistant",
    href: "/features/whatsapp-assistant",
    description: "Track spending naturally via text, voice, or photo directly in WhatsApp.",
    icon: Zap,
  },
  {
    title: "Pockets System",
    href: "/features/pockets-system",
    description: "Modern envelope budgeting. Give every dollar a job and stick to it.",
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
    description: "Ask \"Can I afford this?\" and get instant, data-backed answers.",
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
    title: "Learning Center",
    href: "/dashboard/essentials",
    description: "Master personal finance with our guides.",
    icon: BookOpen,
  },
  {
      title: "Pricing",
      href: "/pricing",
      description: "Simple plans for powerful tools.",
      icon: DollarSign,
  }
];

export const HomeHeader = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = React.useState(false)

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4 lg:px-8">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <MonekoIcon />
                    </Link>

                    {/* Desktop Navigation */}
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground">Features</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-background/95 backdrop-blur-3xl border border-border shadow-2xl rounded-xl">
                                        {features.map((feature) => (
                                            <ListItem
                                                key={feature.title}
                                                title={feature.title}
                                                href={feature.href}
                                                icon={feature.icon}
                                            >
                                                {feature.description}
                                            </ListItem>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            
                            <NavigationMenuItem>
                                <Link to="/how-it-works" className={navigationMenuTriggerStyle() + " bg-transparent text-muted-foreground hover:text-foreground"}>
                                    How it Works
                                </Link>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground">Resources</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-background/95 backdrop-blur-3xl border border-border shadow-2xl rounded-xl">
                                         {resources.slice(1).map((resource) => (
                                            <ListItem
                                                key={resource.title}
                                                title={resource.title}
                                                href={resource.href}
                                                icon={resource.icon}
                                            >
                                                {resource.description}
                                            </ListItem>
                                        ))}
                                        <ListItem title="Blog" href="/blogs" icon={BookOpen}>
                                            Latest updates and financial tips.
                                        </ListItem>
                                        <li className="list-none row-span-3">
                                            <NavigationMenuLink asChild>
                                                 <a
                                                    href={DISCORD_URL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md hover:from-muted/70 hover:to-muted/80 transition-all"
                                                >
                                                    <LayoutGrid className="h-6 w-6" />
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        Join Community
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        Connect with other Moneko users on Discord.
                                                    </p>
                                                </a>
                                            </NavigationMenuLink>
                                        </li>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <Link to="/pricing" className={navigationMenuTriggerStyle() + " bg-transparent text-muted-foreground hover:text-foreground"}>
                                    Pricing
                                </Link>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <Link to="/download" className={navigationMenuTriggerStyle() + " bg-transparent text-muted-foreground hover:text-foreground"}>
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
                    <SheetContent side="left" className="w-[300px] sm:w-[350px] rounded-r-3xl p-0 overflow-y-auto z-[100]">
                        <SheetHeader className="p-6 pb-2 text-left">
                            <MonekoIcon />
                        </SheetHeader>
                        <nav className="flex flex-col px-4 pb-8">
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="features" className="border-b-0">
                                    <AccordionTrigger className="text-base font-medium py-3 hover:no-underline px-2">Features</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-col space-y-1 pl-2">
                                            {features.map((item) => (
                                                <MobileLink key={item.href} to={item.href} setIsOpen={setIsOpen}>
                                                    <item.icon className="h-4 w-4 mr-2 text-primary" />
                                                    {item.title}
                                                </MobileLink>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="resources" className="border-b-0">
                                    <AccordionTrigger className="text-base font-medium py-3 hover:no-underline px-2">Resources</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-col space-y-1 pl-2">
                                             {resources.map((item) => (
                                                <MobileLink key={item.href} to={item.href} setIsOpen={setIsOpen}>
                                                    <item.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    {item.title}
                                                </MobileLink>
                                            ))}
                                             <a
                                                href={DISCORD_URL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center w-full p-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-accent"
                                            >
                                                <LayoutGrid className="h-4 w-4 mr-2 text-muted-foreground" />
                                                Community
                                            </a>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            
                            <div className="h-px bg-border my-2 mx-2" />
                            
                            <MobileLink to="/how-it-works" setIsOpen={setIsOpen} className="text-base px-2 py-3">How it Works</MobileLink>
                            <MobileLink to="/pricing" setIsOpen={setIsOpen} className="text-base px-2 py-3">Pricing</MobileLink>
                            <MobileLink to="/download" setIsOpen={setIsOpen} className="text-base px-2 py-3">Download</MobileLink>

                            <div className="mt-6 space-y-3 px-2">
                                {user ? (
                                    <Button
                                        onClick={() => {
                                            setIsOpen(false)
                                            navigate({ to: "/dashboard" })
                                        }}
                                        className="w-full rounded-xl"
                                        size="lg"
                                    >
                                        Go to Dashboard
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            setIsOpen(false)
                                            navigate({ to: "/referral"})
                                        }}
                                        className="w-full rounded-xl dark:text-white"
                                        size="lg"
                                    >
                                       Join Early Access
                                    </Button>
                                )}
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Desktop Actions */}
                <div className="items-center gap-4 hidden md:flex">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <UserAvatar
                                size="sm"
                                onClick={() => navigate({ to: "/dashboard" })}
                                className="cursor-pointer ring-2 ring-background transition-transform hover:scale-105"
                            />
                            <Button
                                onClick={() => navigate({ to: "/dashboard" })}
                                className="font-medium px-5 rounded-full"
                                size="sm"
                            >
                              Dashboard
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={() => navigate({ to: "/login" })} className="font-medium">
                                Log in
                            </Button>
                        <Button
                                onClick={() => navigate({ to: "/referral"})}
                                className="font-medium px-5 rounded-full dark:text-white"
                            >
                               Join Early Access
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

const ListItem = React.forwardRef<
  React.ElementRef<typeof Link>,
  React.ComponentPropsWithoutRef<typeof Link> & { title: string; icon?: any }
>(({ className, title, children, icon: Icon, ...props }, ref) => {
  return (
    <li>
        <NavigationMenuLink asChild>
            <Link
                ref={ref}
                className={cn(
                "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group",
                className
                )}
                {...props}
            >
                <div className="flex items-center gap-2 text-sm font-medium leading-none group-hover:text-primary transition-colors">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                    {title}
                </div>
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1 ml-6">
                {children}
                </p>
            </Link>
        </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

function MobileLink({ to, setIsOpen, children, className }: { to: string, setIsOpen: (v: boolean) => void, children: React.ReactNode, className?: string }) {
    const navigate = useNavigate();
    return (
        <a 
            href={to}
            onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                navigate({ to });
            }}
            className={cn("flex items-center w-full p-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-accent cursor-pointer", className)}
        >
            {children}
        </a>
    )
}