import * as m from "framer-motion/m";
import { useDeviceType } from "@/hooks/use-device-type";

// Testimonials data from the mockup
const testimonialsData = [
  {
    name: "Martin Gooby",
    text: "From signing up and watching your first video to diving into investing 401k and becoming really focused on wealth building, this app has been really helpful for my journey!",
    image: "/testimonials/martin-1.jpg"
  },
  {
    name: "Martin Gooby",
    text: "From signing up and watching your first video to diving into investing 401k and becoming really focused on wealth building, this app has been really helpful for my journey!",
    image: "/testimonials/martin-2.jpg"
  }
];

export default function TestimonialsSection() {
  const { isMobile } = useDeviceType();

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonialsData.map((testimonial, index) => (
            <m.div
              key={index}
              className="p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border border-border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              {/* Testimonial Text */}
              <p className="text-muted-foreground leading-relaxed text-lg mb-6 font-lato">
                "{testimonial.text}"
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-primary font-semibold text-lg">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
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