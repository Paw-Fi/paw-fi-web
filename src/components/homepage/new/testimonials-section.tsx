import * as m from "framer-motion/m";
import { useDeviceType } from "@/hooks/use-device-type";
import { Marquee } from "@/components/ui/marquee";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useHomepageTestimonials,
  HomepageTestimonial,
} from "@/hooks/use-homepage-testimonials";

// Testimonials data from the mockup
const testimonialsData: HomepageTestimonial[] = [
  {
    id: "mock-1",
    name: "Early user",
    quote:
      "From signing up and watching your first video to diving into investing 401k and becoming really focused on wealth building, this app has been really helpful for my journey!",
    avatar_url: undefined,
  },
  {
    id: "mock-2",
    name: "Early user",
    quote:
      "From signing up and watching your first video to diving into investing 401k and becoming really focused on wealth building, this app has been really helpful for my journey!",
    avatar_url: undefined,
  },
];

export default function TestimonialsSection() {
  const { isMobile } = useDeviceType();
  const { data, isLoading } = useHomepageTestimonials();

  const testimonials: HomepageTestimonial[] =
    data && data.length > 0 ? data : testimonialsData;

  return (
    <section className="from-background to-background/80 relative z-10 flex min-h-screen items-center justify-center bg-gradient-to-br px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          {isMobile ? (
            <h2 className="text-foreground font-lato mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl">
              What People Are Saying
            </h2>
          ) : (
            <m.h2
              className="text-foreground font-lato mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              What People Are Saying
            </m.h2>
          )}
        </div>

        {/* Testimonials Grid */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
            </div>
          ) : (
            <Marquee pauseOnHover className="[--duration:40s]">
              {testimonials.map((testimonial) => (
                <m.div
                  key={testimonial.id}
                  className="border-border mx-4 flex max-w-md flex-col gap-4 rounded-2xl border bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:bg-slate-900/80"
                >
                  <p className="text-muted-foreground font-lato text-lg leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {testimonial.avatar_url ? (
                        <AvatarImage
                          src={testimonial.avatar_url}
                          alt={testimonial.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-foreground font-lato font-semibold">
                        {testimonial.name}
                      </h4>
                      <p className="text-muted-foreground font-lato text-sm">
                        User
                      </p>
                    </div>
                  </div>
                </m.div>
              ))}
            </Marquee>
          )}
        </div>

        {/* Social Proof Metrics */}
        <m.div
          className="mt-16 flex flex-wrap justify-center gap-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col items-center">
            <div className="text-primary mb-2 text-3xl font-bold">
              Chat-first
            </div>
            <div className="text-muted-foreground text-sm">
              Budget from WhatsApp and Telegram
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-primary mb-2 text-3xl font-bold">
              Review-first
            </div>
            <div className="text-muted-foreground text-sm">
              Confirm details before saving
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-primary mb-2 text-3xl font-bold">Pockets</div>
            <div className="text-muted-foreground text-sm">
              Envelope-style budgeting
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-primary mb-2 text-3xl font-bold">
              Households
            </div>
            <div className="text-muted-foreground text-sm">
              Shared views for couples
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
