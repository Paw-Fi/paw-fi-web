import icon from "@/assets/images/icon.svg";
import { Link } from "@tanstack/react-router";

export const MonekoIcon = () => {
  return (
    <Link to="/" className="flex items-center gap-4`">
      <img src={icon} alt="Moneko" className="size-9 " style={{ transform: "translateY(-1px)" }} />
      <span className=" text-xl font-bold text-gray-900 dark:text-white">
        Moneko
      </span>
    </Link>
  );
};
