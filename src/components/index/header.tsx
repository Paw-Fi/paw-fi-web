import { faArrowRight } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "../ui/button"
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            {/* Logo */}
          <MonekoIcon/>

            {/* Navigation */}
            <nav className="hidden items-center space-x-8 md:flex">
                {routes.map((route, index) => (
                    <Link
                        key={index}
                        to={route.to}
                        className={classNames(
                            "text-sm font-medium transition-colors duration-200",
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
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                    Community
                </a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        <UserAvatar
                            size="sm"
                            onClick={() => navigate({ to: "/dashboard" })}
                            className="cursor-pointer"
                        />
                        <Button
                            onClick={() => navigate({ to: "/dashboard" })}
                            className="font-medium"
                        >
                            Dashboard
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={() => navigate({ to: "/onboarding", search: { q: undefined } })}
                        className="font-medium px-6 py-2 inline-flex items-center gap-2"
                        size="lg"
                    >
                        Get Started
                        <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    )
}