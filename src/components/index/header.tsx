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

export const HomeHeader=()=>{

    const location=useLocation()
    const {user}=useAuth()
    const navigate=useNavigate()

    const routes=[
        {to:"/dashboard/essentials",label:"Learning"},
        {to:"/blogs",label:"Blogs"},
        {to:"/pricing",label:"Pricing"},
        {to:"/calculators",label:"Calculators"},

    ]

    return   <div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
      <Link to="/" className="flex items-center gap-2">
        <OptimizedImage
          src={catCoin}
          alt="Moneko Logo"
          className="size-10"               
        />
        <span className="text-xl font-semibold text-foreground dark:text-dark-foreground">
          Moneko
        </span>
      </Link>
      <div className="hidden items-center gap-x-6 md:flex">
        {
            routes.map((route,index)=>{
                return(
                    <Link
                    key={index}
                    to={route.to}
                    className={classNames("text-sm transition-colors hover:text-primary dark:hover:text-dark-primary",
                        {
                            "text-primary dark:text-dark-primary font-bold":location.pathname===route.to,
                            "text-gray-700 dark:text-gray-300 font-medium ":location.pathname!==route.to
                        }
                    )}
                    >
                        {route.label}
                    </Link>
                )
            })
        }
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-dark-primary"
        >
          Community
        </a>
      </div>
    <div className="flex items-center gap-x-5">     
    
        <Button
        className="font-medium text-primary dark:text-dark-primary hover:text-secondary dark:hover:text-dark-secondary"
        onClick={()=>{
            if(user){
                navigate({to:"/dashboard"})
            }else{
                navigate({to:"/onboarding"})
            }
        }}
        >
          Get Started <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Button>

  </div>
  </div>
  
};