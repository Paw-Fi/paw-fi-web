import { createFileRoute } from "@tanstack/react-router";
import icon from "@/assets/images/icon.svg";

export const Route = createFileRoute("/test")({
  component: TestPage,
});

function TestPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#7458FF] relative overflow-hidden">
      {/* Huge Moneko Icon in the center */}
      <div className="flex items-center justify-center"
          style={{width:"35rem"}}
      
      >
        <img 
          src={icon} 
          alt="Moneko" 
          className=" object-contain w-full"
        />
      </div>

      {/* "Moneko" text at the bottom */}
      <div className="pb-16 md:pb-20 lg:pb-24">
        <p className="text-white text-[42rem] font-bold" style={{fontSize:"10rem"}}>
          Moneko
        </p>
      </div>
    </div>
  );
}
