import { faArrowRight } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { OptimizedImage } from "@components/seo/optimized-image";
import catCoin from "@/assets/images/icon.svg";
import { DISCORD_URL } from "@/routes";
import classNames from "classnames";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { UserAvatar } from "../ui/user-avatar";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { MonekoIcon } from "../shared/moneko-icon";

export const HomeHeader = () => {
    const location = useLocation()
    const { user } = useAuth()
    const navigate = useNavigate()

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

            {/* Navigation */}
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

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
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
                            className="font-medium px-4 sm:px-6 py-2 inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation active:scale-95"
                            size="default"
                        >
                            Get Started
                            <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}