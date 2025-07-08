import { faArrowRight } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "../ui/button"
import catCoin from "@/assets/images/icon.svg";
import { DISCORD_URL } from "@/routes";
import classNames from "classnames";

export const HomeHeader=()=>{

    const location=useLocation()

    const routes=[
        {to:"/blogs",label:"Blogs"},
        {to:"/pricing",label:"Pricing"},
        {to:"/team",label:"Team"},
    ]

    return   <div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
      <Link to="/" className="flex items-center gap-2">
        <img
          src={catCoin}
          alt="Moneko Logo"
          className="size-10"               
        />
        <span className="text-xl font-semibold text-slate-800">
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
                    className={classNames("text-sm transition-colors hover:text-primary",
                        {
                            "text-primary font-bold":location.pathname===route.to,
                            "text-slate-700 font-medium ":location.pathname!==route.to
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
          className="text-sm font-medium text-slate-700 transition-colors hover:text-purple-600"
        >
          Community
        </a>
      </div>
    <div className="flex items-center gap-x-5">
      <Link
        to="/dashboard/essentials"
        className="hidden text-sm font-medium text-slate-700 transition-colors hover:text-purple-600 md:block"
      >
        Explore Courses
      </Link>
      <Link
        to="/dashboard"
        className="font-medium text-primary hover:secondary"
      >
        <Button className="bg-primary hover:bg-secondary">
         Dashboard <FontAwesomeIcon icon={faArrowRight}  className="ml-2"/>
        </Button>
      </Link>
    </div>
  </div>
}