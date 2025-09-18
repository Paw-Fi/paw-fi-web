import icon from "@/assets/images/icon.svg";
import { Link } from "@tanstack/react-router";

export const MonekoIcon = () => {
  return (
    <Link to="/" className="flex items-center gap-2 sm:gap-3 md:gap-4 hover:scale-105 active:scale-95 transition-transform duration-200 touch-manipulation">
         <div className="dark:bg-primary/90 rounded-xl">
      
      <img src={icon} alt="Moneko" className="size-7 sm:size-8 md:size-9" style={{ transform: "translateY(-1px)" }} />
      </div>
      <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
        Moneko..
      </span>
    </Link>
  );
};
