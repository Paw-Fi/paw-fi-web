import { createFileRoute } from '@tanstack/react-router';
import { AIIntroComponent } from '@/components/onboarding/ai-intro-component';

export const Route = createFileRoute('/ai-intro')({
  component: AIIntroPage,
});

function AIIntroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/50 dark:to-gray-900">
      <AIIntroComponent className="h-screen" />
    </div>
  );
}

export default AIIntroPage;