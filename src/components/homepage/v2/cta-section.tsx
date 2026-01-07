import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

export function CTASection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-primary/5 -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="container px-4 md:px-6 mx-auto text-center">
        <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
          Ready to take control?
        </h2>
        <p className="mx-auto max-w-[600px] text-muted-foreground text-xl mb-10">
          Join thousands of users who are building a healthier relationship with money. 
          Download Moneko today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <AppleDownloadButton className="h-14 px-8 text-lg" />
          <AndroidDownloadButton className="h-14 px-8 text-lg" />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  );
}
