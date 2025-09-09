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
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center">
        <div className="mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <FontAwesomeIcon
            icon={icon}
            className="text-white"
          />
        </div>
        <h3 className="text-lg font-medium text-primary">
          {lessonTitle}
        </h3>
      </div>
      <div className="hidden lg:block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-black">
        {index + 1} of {allItemsTotal}
      </div>
    </div>
  );
};
