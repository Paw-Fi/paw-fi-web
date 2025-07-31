import { Link } from "@tanstack/react-router";
import { useUserActivities } from "@/hooks/useUserActivities";
import { ActivityList } from "@/components/shared/ActivityList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export function RecentActivity() {
  const { activities, isLoading } = useUserActivities();

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
     

      {/* Activity List */}
      <div className="p-4">
        <ActivityList activities={activities} isLoading={isLoading} limit={5} />
      </div>
    </div>
  );
}