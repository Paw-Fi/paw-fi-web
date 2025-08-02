import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

export function GoalNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faFlag} className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Goal Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The goal you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={onBack} variant="outline">
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
          Back to Goals
        </Button>
      </div>
    </div>
  );
}
