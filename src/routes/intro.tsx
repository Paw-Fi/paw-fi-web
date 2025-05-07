import { createFileRoute } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import catIcon from "../assets/images/icon.svg";

export const Route = createFileRoute("/intro")({
  component: IntroPage,
});

function IntroPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="relative flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl bg-white px-4 py-6 shadow-lg">
        {/* Wavy purple header */}
        <h1 className="text-center text-2xl font-bold text-gray-800">
          Welcome to PawFi!
        </h1>

       
          {/* Cat icon */}
          <div className="flex justify-center">
            <img src={catIcon} alt="PawFi Cat" className="h-24 w-24" />
          </div>

          {/* Introduction text */}
          <p className="text-sm text-gray-700 md:text-base text-center">
            I'm PawFi, your personal finance guide! I'm here to help you save
            and invest toward your life goals. Let's create a
            <span className="font-semibold">personalized plan</span> that fits
            your needs and goals. Ready to start your financial journey?
          </p>

          {/* Get started button */}
         <div className="flex justify-center mt-4">
         <Button
            as="link"
            to="/questionnaire"
            variant="dark"
            size="md"
          >
            Let's get started!
          </Button>
         </div>
      </div>
    </div>
  );
}
