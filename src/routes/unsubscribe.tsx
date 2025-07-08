import { createFileRoute } from "@tanstack/react-router"
export const Route = createFileRoute("/unsubscribe")({
    component: Unsubscribe,
});

 function Unsubscribe () {
    return (
        <div className="flex-1 flex items-center justify-center w-screen h-screen">
            <h1>You have been unsubscribed from our newsletter</h1>
        </div>
    );
};