import { createFileRoute } from "@tanstack/react-router"
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/unsubscribe")({
    component: Unsubscribe,
    head: () => {
        const pageUrl = getCanonicalUrl("/unsubscribe");
        const title = "Unsubscribe | Moneko";
        const description = "You have successfully unsubscribed from Moneko's newsletter.";
        const keywords = "unsubscribe, newsletter, Moneko";
        const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

        return {
            meta: seo({
                title,
                description,
                keywords,
                image: imageUrl,
                url: pageUrl,
            }),
            links: [
                {
                    rel: "canonical",
                    href: pageUrl,
                },
            ],
        };
    },
});

 function Unsubscribe () {
    return (
        <div className="flex-1 flex items-center justify-center w-screen h-screen">
            <h1>You have been unsubscribed from our newsletter</h1>
        </div>
    );
};