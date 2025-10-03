import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const LessonCardTitle = ({
  lessonTitle,
  index,
  allItemsTotal,
  icon
}: {
  index: number;
  lessonTitle: string;
  allItemsTotal: number;
  icon: IconProp;
}) => {
  return (
    <div className="mb-4 sm:mb-5 md:mb-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary flex-shrink-0">
          <FontAwesomeIcon
            icon={icon}
            className="text-white text-mobile-xs sm:text-sm"
          />
        </div>
        <h3 className="text-mobile-sm sm:text-base md:text-lg font-medium text-primary truncate">
          {lessonTitle}
        </h3>
      </div>
      <div className="hidden sm:block rounded-full bg-[var(--lesson-progress-bg)] px-2.5 sm:px-3 py-1 text-mobile-xs sm:text-sm font-medium text-[var(--lesson-progress-text)] whitespace-nowrap flex-shrink-0">
        {index + 1} of {allItemsTotal}
      </div>
    </div>
  );
};
