"use client";
import {
  useScroll,
  useTransform,
  motion,
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  title: React.ReactNode;
  content: React.ReactNode;
}

export const Timeline = ({ data, className }: { data: TimelineEntry[], className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className={cn("w-full font-sans md:px-10", className)}
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex flex-col md:flex-row justify-start pt-14 md:pt-28 md:gap-10"
          >
            {/* Wrapper stretches to row height, avoiding flex child sticky bugs */}
            <div className="relative w-full md:w-auto md:max-w-[220px] lg:max-w-[260px] shrink-0">
              <div className="sticky top-24 z-40 flex flex-row md:flex-col lg:flex-row items-center md:items-start pt-1 mb-8 md:mb-0 w-full">
                <div className="h-10 absolute left-3 w-10 rounded-full bg-background flex items-center justify-center z-10">
                  <div className="h-4 w-4 rounded-full bg-muted border border-border p-2" />
                </div>
                <div className="pl-16 md:pl-20 w-fit">
                  <div className="border-border/60 bg-background/85 supports-[backdrop-filter]:bg-background/80 shadow-sm backdrop-blur-xl rounded-xl border px-4 py-3 min-w-[140px] transition-all hover:border-primary/35">
                    {item.title}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative w-full pr-4 pl-16 md:pl-0 pb-8 md:pb-0">
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-border to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-primary/50 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
