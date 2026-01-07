import { Iphone } from "@/components/ui/iphone";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { ChatScreen } from "./chat-screen";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function HeroV2() {
  return (
    <div className="relative overflow-hidden pt-[4rem] md:pt-[6rem]">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-8">
            <Link to="/features/whatsapp-assistant" className="cursor-pointer">
                <Badge variant="secondary" className="w-fit rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors border border-border/50 bg-background/50 backdrop-blur-sm">
                Now with WhatsApp Integration <ArrowRight className="ml-2 h-4 w-4" />
                </Badge>
            </Link>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              Stop fighting with spreadsheets. <br />
              <span className="text-primary">Just chat.</span>
            </h1>
            
            <p className="max-w-[42rem] text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Moneko is the AI financial assistant that makes staying on top of money feel lightweight. 
              Snap receipts, send voice notes, and manage "Pockets" without the manual work.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-auto">
              <AppleDownloadButton className="w-auto" />
              <AndroidDownloadButton className="w-auto" />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4">
              <div className="flex -space-x-2">
                 {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold ${i === 4 ? 'bg-primary/20 text-primary' : 'bg-gray-200'}`}>
                        {i === 4 ? '+2k' : ''}
                    </div>
                 ))}
              </div>
              <p>Join 2,000+ early users</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[350px] lg:max-w-none flex justify-center lg:justify-end">
            <div className="relative z-10 transform transition-transform hover:scale-[1.02] duration-500">
                <Iphone className="shadow-2xl rounded-[3rem] border-8 border-gray-900/10 dark:border-white/10">
                    <ChatScreen />
                </Iphone>
            </div>
            
            {/* Decorative background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
