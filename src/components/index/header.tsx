import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "../ui/button"
import { DISCORD_URL } from "@/routes";
import classNames from "classnames";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { UserAvatar } from "../ui/user-avatar";
import { MonekoIcon } from "../shared/moneko-icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

export const HomeHeader = () => {
    const location = useLocation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)

    const routes = [
        { to: "/dashboard/essentials", label: "Learning" },
        { to: "/blogs", label: "Blogs" },
        { to: "/pricing", label: "Pricing" },
        { to: "/calculators", label: "Calculators" },
    ]

    return (
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4 lg:px-8">
            {/* Logo */}
         <MonekoIcon/>

            {/* Desktop Navigation */}
            <nav className="hidden items-center space-x-4 sm:space-x-6 md:space-x-8 md:flex">
                {routes.map((route, index) => (
                    <Link
                        key={index}
                        to={route.to}
                        className={classNames(
                            "text-sm sm:text-base font-medium transition-colors duration-200 hover:scale-105 active:scale-95 touch-manipulation",
                            {
                                "text-primary": location.pathname === route.to,
                                "text-muted-foreground hover:text-foreground": location.pathname !== route.to
                            }
                        )}
                    >
                        {route.label}
                    </Link>
                ))}
                <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 hover:scale-105 active:scale-95 touch-manipulation"
                >
                    Community
                </a>
            </nav>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="sm" className="mr-2 touch-manipulation active:scale-95">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px] rounded-r-3xl p-6">
                    <SheetHeader className="mb-8">
                    <MonekoIcon/>
                                        </SheetHeader>
                    <nav className="flex flex-col space-y-4">
                        {routes.map((route, index) => (
                            <Link
                                key={index}
                                to={route.to}
                                onClick={() => setIsOpen(false)}
                                className={classNames(
                                    "text-base font-medium transition-all duration-200 px-4 py-3 rounded-2xl hover:bg-subtle-background touch-manipulation active:scale-95",
                                    {
                                        "text-primary bg-subtle-background": location.pathname === route.to,
                                        "text-muted-foreground hover:text-foreground": location.pathname !== route.to
                                    }
                                )}
                            >
                                {route.label}
                            </Link>
                        ))}
                        <a
                            href={DISCORD_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-medium text-muted-foreground hover:text-foreground transition-all duration-200 px-4 py-3 rounded-2xl hover:bg-subtle-background touch-manipulation active:scale-95"
                        >
                            Community
                        </a>
                        
                        {/* Divider */}
                        <div className="h-px bg-border my-4" />
                        
                        {/* Mobile CTA */}
                        {user ? (
                            <Button
                                onClick={() => {
                                    setIsOpen(false)
                                    navigate({ to: "/dashboard" })
                                }}
                                className="w-full font-medium text-base px-4 py-3 touch-manipulation active:scale-95 rounded-2xl"
                                size="default"
                            >
                                Go to Dashboard
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    setIsOpen(false)
                                    navigate({ to: "/onboarding", search: { q: undefined } })
                                }}
                                className="w-full font-medium text-base px-4 py-3 touch-manipulation active:scale-95 rounded-2xl dark:text-white"
                                size="default"
                            >
                                Get Started for Free
                            </Button>
                        )}
                    </nav>
                </SheetContent>
            </Sheet>

            {/* Actions */}
            <div className="items-center gap-2 sm:gap-3 md:gap-4 hidden lg:flex">
                {user ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <UserAvatar
                            size="sm"
                            onClick={() => navigate({ to: "/dashboard" })}
                            className="cursor-pointer"
                        />
                        <Button
                            onClick={() => navigate({ to: "/dashboard" })}
                            className="font-medium text-sm sm:text-base px-3 sm:px-4 py-2 touch-manipulation active:scale-95"
                            size="sm"
                        >
                            Dashboard
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-end gap-1">
                      
                        <Button
                            onClick={() => navigate({ to: "/onboarding", search: { q: undefined } })}
                            className="font-medium px-4 sm:px-6 py-2 inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation active:scale-95 dark:text-white"
                            size="default"
                        >
                            Get Started for Free
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}