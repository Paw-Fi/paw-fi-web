import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background Gradient */}
      <div className="bg-primary/5 absolute inset-0 -z-10" />
      <div className="bg-primary/10 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 text-center md:px-6">
        <h2 className="from-foreground to-foreground/70 mb-6 bg-gradient-to-b bg-clip-text text-4xl font-bold tracking-tighter text-transparent sm:text-5xl md:text-6xl">
          Build your budget where spending happens
        </h2>
        <p className="text-muted-foreground mx-auto mb-10 max-w-[600px] text-xl">
          Download Moneko to track expenses from chat, organize Pockets, and
          keep shared budgets current without spreadsheet cleanup.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <AppleDownloadButton className="h-14 px-8 text-lg" />
          <AndroidDownloadButton className="h-14 px-8 text-lg" />
        </div>
        <p className="text-muted-foreground mt-6 text-sm">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  );
}
