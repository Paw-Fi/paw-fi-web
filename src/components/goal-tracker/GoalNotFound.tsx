import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

export function GoalNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md text-center px-8">
        <div className="w-20 h-20 mx-auto bg-amber-50 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
          <FontAwesomeIcon icon={faFlag} className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-light text-foreground mb-6">
          Goal Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The goal you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button 
          onClick={onBack} 
          variant="outline" 
          className="rounded-full px-6 py-3 hover:scale-105 transition-all duration-200"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
          Back to Goals
        </Button>
      </div>
    </div>
  );
}
