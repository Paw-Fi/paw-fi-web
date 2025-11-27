import * as m from "framer-motion/m";
import { useDeviceType } from "@/hooks/use-device-type";
import { Marquee } from "@/components/ui/marquee";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { useHomepageTestimonials, HomepageTestimonial } from "@/hooks/use-homepage-testimonials";

// Testimonials data from the mockup
const testimonialsData: HomepageTestimonial[] = [
  {
    id: "mock-1",
    name: "Martin Gooby",
    quote:
      "From signing up and watching your first video to diving into investing 401k and becoming really focused on wealth building, this app has been really helpful for my journey!",
    avatar_url: undefined,
    rating: 5,
  },
  {
    id: "mock-2",
    name: "Martin Gooby",
    quote:
      "From signing up and watching your first video to diving into investing 401k and becoming really focused on wealth building, this app has been really helpful for my journey!",
    avatar_url: undefined,
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const { isMobile } = useDeviceType();
  const { data, isLoading } = useHomepageTestimonials();

  const testimonials: HomepageTestimonial[] =
    data && data.length > 0 ? data : testimonialsData;

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-br from-background to-background/80">
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <div className="mb-16 text-center">
          {isMobile ? (
            <h2 className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
              Hear What Our Customers Say
            </h2>
          ) : (
            <m.h2
              className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Hear What Our Customers Say
            </m.h2>
          )}
        </div>

        {/* Testimonials Grid */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Marquee pauseOnHover className="[--duration:40s]">
              {testimonials.map((testimonial) => (
                <m.div
                  key={testimonial.id}
                  className="mx-4 max-w-md p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border border-border flex flex-col gap-4"
                >
                  <p className="text-muted-foreground leading-relaxed text-lg font-lato">
                    "{testimonial.quote}"
                  </p>
                  {typeof testimonial.rating === "number" && testimonial.rating > 0 && (
                    <div className="flex items-center gap-2">
                      <Rating
                        value={testimonial.rating}
                        readOnly
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <RatingButton key={index} />
                        ))}
                      </Rating>
                      <span className="text-sm text-muted-foreground font-lato">
                        {testimonial.rating}/5
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
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
                      <h4 className="font-semibold text-foreground font-lato">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-muted-foreground font-lato">
                        Verified User
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
            <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary mb-2">$2.3M+</div>
            <div className="text-sm text-muted-foreground">Money Saved</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary mb-2">4.9★</div>
            <div className="text-sm text-muted-foreground">App Rating</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary mb-2">127%</div>
            <div className="text-sm text-muted-foreground">Better Returns</div>
          </div>
        </m.div>
      </div>
    </section>
  );
}