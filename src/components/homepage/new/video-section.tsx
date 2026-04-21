import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { motion, Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const VIDEO_DEMO_URL = "/Moneko-onboard%20.webm";
const VIDEO_POSTER_URL = "/video-poster.webp";

interface VideoSectionProps {
  data: {
    videoSection: {
      title: string;
      subtitle: string;
    };
  };
}

export default function VideoSection({ data }: VideoSectionProps) {
  const { videoSection } = data;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.section 
      className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={sectionVariants}
    >
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
            {videoSection.title}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed font-lato">
            {videoSection.subtitle}
          </p>
        </div>

        {/* Video Demo with Browser Frame */}
        <div className="relative">
          {/* Browser Frame - matching dashboard-showcase.tsx structure */}
          <div className="backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Browser Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-6">
                <div className="rounded-lg px-4 py-2 text-sm text-muted-foreground border border-white/20">
                  moneko.io/demo
                </div>
              </div>
             
            </div>

            {/* Video Content */}
            <div className="relative">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <div className="group relative cursor-pointer">
                    <div className="relative aspect-video w-full">
                      <img
                        className="h-full w-full object-cover"
                        src={VIDEO_POSTER_URL}
                        alt={videoSection.title}
                        width={1920}
                        height={1080}
                        loading="lazy"
                        decoding="async"
                      />
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center transition-colors border-2 border-white/50">
                          <FontAwesomeIcon
                            icon={faPlay}
                            className="text-white text-2xl ml-1"
                          />
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="rounded-full p-4 border border-white/20">
                          <FontAwesomeIcon
                            icon={faPlay}
                            className="text-primary text-xl ml-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-6xl border-none p-0">
                  <div
                    className="relative w-full"
                    style={{ paddingBottom: "56.25%" }}
                  >
                    <video
                      className="absolute inset-0 h-full w-full object-contain"
                      src={isDialogOpen ? VIDEO_DEMO_URL : undefined}
                      poster={VIDEO_POSTER_URL}
                      width={1920}
                      height={1080}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
