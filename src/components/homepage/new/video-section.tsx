import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { useDeviceType } from "@/hooks/use-device-type";
import videoDemo from "../../../../public/Moneko-onboard .webm";

interface VideoSectionProps {
  data: {
    videoSection: {
      title: string;
      subtitle: string;
      videoUrl: string;
      poster: string;
    };
  };
}

export default function VideoSection({ data }: VideoSectionProps) {
  const { isMobile } = useDeviceType();
  const { videoSection } = data;

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 dark:from-blue-900/20 dark:via-sky-900/20 dark:to-cyan-900/20">
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <div className="mb-16 text-center">
          {isMobile ? (
            <>
              <h2 className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
                {videoSection.title}
              </h2>
              <p className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed font-lato">
                {videoSection.subtitle}
              </p>
            </>
          ) : (
            <>
              <motion.h2
                className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                {videoSection.title}
              </motion.h2>
              <motion.p
                className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed font-lato"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                {videoSection.subtitle}
              </motion.p>
            </>
          )}
        </div>

        {/* Video Demo with Browser Frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Browser Frame - matching dashboard-showcase.tsx structure */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Browser Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-6">
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg px-4 py-2 text-sm text-muted-foreground">
                  moneko.io/demo
                </div>
              </div>
              <div className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                Live Demo
              </div>
            </div>

            {/* Video Content */}
            <div className="relative bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="group relative cursor-pointer">
                    <div className="relative aspect-video w-full">
                      {/* Video Poster Image */}
                      <video
                        className="w-full h-full object-cover"
                        src={videoDemo}
                        width={1920}
                        height={1080}
                        controls
                        autoPlay
                        playsInline
                      preload="metadata"
                      muted
                    />
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center group-hover:bg-black/60 transition-colors">
                          <FontAwesomeIcon
                            icon={faPlay}
                            className="text-white text-2xl ml-1"
                          />
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-white/90 dark:bg-slate-800/90 rounded-full p-4">
                          <FontAwesomeIcon
                            icon={faPlay}
                            className="text-primary text-xl ml-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-6xl border-none bg-black p-0">
                  <div
                    className="relative w-full"
                    style={{ paddingBottom: "56.25%" }}
                  >
                    <video
                      className="absolute inset-0 h-full w-full object-contain"
                      src={videoDemo}
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
        </motion.div>
      </div>
    </section>
  );
}