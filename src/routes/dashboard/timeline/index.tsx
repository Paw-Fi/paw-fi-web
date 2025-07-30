import { createFileRoute } from '@tanstack/react-router';
import { Timeline } from '@/components/timeline/Timeline';

export const Route = createFileRoute('/dashboard/timeline/')({
  component: TimelinePage,
});

function TimelinePage() {
  return (
      <Timeline />
  );
}