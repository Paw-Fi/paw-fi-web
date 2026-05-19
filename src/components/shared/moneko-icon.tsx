import icon from "@/assets/images/icon.svg";
import { Link } from "@tanstack/react-router";

type MonekoIconProps = {
  href?: string;
};

export const MonekoIcon = ({ href = "/" }: MonekoIconProps = {}) => {
  return (
    <Link
      to="/"
      href={href}
      className="flex touch-manipulation items-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95 sm:gap-3 md:gap-4"
    >
      <div className="bg-primary/90 rounded-xl">
        <img
          src={icon}
          alt="Moneko"
          className="size-7 sm:size-8 md:size-9"
          style={{ transform: "translateY(-1px)" }}
        />
      </div>
      <span className="text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
        Moneko
      </span>
    </Link>
  );
};
