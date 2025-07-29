import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { useUserActivities } from "@/hooks/useUserActivities";
import { ActivityList } from "@/components/shared/ActivityList";

export function RecentActivity() {
  const { activities, isLoading } = useUserActivities();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground dark:text-dark-foreground">
              Recent Activity
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Latest updates on your goals
            </p>
          </div>
          <FontAwesomeIcon icon={faClock} className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="p-6">
        <ActivityList activities={activities} isLoading={isLoading} />
      </div>
    </div>
  );
}