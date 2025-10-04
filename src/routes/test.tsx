import { createFileRoute } from "@tanstack/react-router";
import icon from "@/assets/images/icon.svg";
import { BackgroundBeams } from "@/components/ui/shadcn-io/background-beams";

export const Route = createFileRoute("/test")({
  component: TestPage,
});

function TestPage() {
  return (
   <BackgroundBeams/>
  );
}
