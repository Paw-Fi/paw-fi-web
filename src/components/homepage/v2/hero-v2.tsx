import { Iphone } from "@/components/ui/iphone";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { ChatScreen } from "./chat-screen";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

export function HeroV2() {
  const reducedVisualEffects = useReducedVisualEffects();

  return (
    <div className="relative overflow-hidden pt-[4rem] pb-16 md:pt-[6rem]">
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center gap-12 text-center lg:gap-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center space-y-8">
            <Link to="/features/whatsapp-assistant" className="cursor-pointer">
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 border-border/50 bg-background/50 w-fit rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors"
              >
                WhatsApp expense tracking now available{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Badge>
            </Link>

            <h1 className="from-foreground to-foreground/70 bg-gradient-to-b bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl xl:text-7xl">
              The AI budgeting app <br />
              <span className="text-primary">built for everyday spending.</span>
            </h1>

            <p className="text-muted-foreground mx-auto max-w-[42rem] text-lg leading-relaxed sm:text-xl">
              Track expenses from WhatsApp, receipts, voice notes, and mobile
              alerts. Organize money into Pockets, split shared costs, and ask
              Moneko what changed before the month gets away from you.
            </p>

            <div className="flex w-auto flex-col justify-center gap-4 sm:flex-row">
              <AppleDownloadButton className="w-auto" />
              <AndroidDownloadButton className="w-auto" />
            </div>

            <div className="text-muted-foreground flex items-center justify-center gap-2 pt-4 text-sm">
              <span>Join other budgeting app users on</span>
              <a
                href="https://discord.gg/M2Dgujvtze"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary font-medium underline underline-offset-4"
              >
                Discord
              </a>
              <span>and</span>
              <a
                href="https://www.reddit.com/search/?q=Moneko%20budgeting%20app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary font-medium underline underline-offset-4"
              >
                Reddit
              </a>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[350px] justify-center lg:max-w-[400px]">
            <div className="relative z-10 transform transition-transform duration-500 md:hover:scale-[1.02]">
              <Iphone className="rounded-[3rem] border-8 border-gray-900/10 shadow-2xl dark:border-white/10">
                <ChatScreen />
              </Iphone>
            </div>

            {/* Decorative background elements */}
            <div
              className={
                reducedVisualEffects
                  ? "bg-primary/10 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  : "bg-primary/20 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
