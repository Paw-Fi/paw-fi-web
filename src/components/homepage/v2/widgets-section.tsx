"use client";

import React from "react";
import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";
import { CardSpotlight } from "@/components/ui/card-spotlight";

export function WidgetsSection() {
  return (
    <section className="w-full py-24 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden relative transition-colors duration-300">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:32px]" />
      <div className="absolute inset-0 bg-neutral-50/80 dark:bg-neutral-950/80 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-neutral-900 dark:text-white">
          Your Finance at a Glance.
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
          Keep tabs on your spending without even opening the app. 
          Widgets designed for your home screen.
        </p>
      </div>

      <div className="relative flex flex-col gap-8 w-full">
         <Marquee pauseOnHover className="[--duration:40s]">
            {firstRow.map((widget, i) => (
                <WidgetCard key={i} {...widget} />
            ))}
         </Marquee>
         <Marquee reverse pauseOnHover className="[--duration:40s]">
            {secondRow.map((widget, i) => (
                <WidgetCard key={i} {...widget} />
            ))}
         </Marquee>
         
         {/* Side gradients */}
         <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-neutral-50 dark:from-neutral-950" />
         <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-neutral-50 dark:from-neutral-950" />
      </div>
    </section>
  );
}

const WidgetCard = ({ title, type, color, value, content }: any) => {
    return (
        <div 
            className={cn(
                "w-40 h-40 md:w-48 md:h-48 rounded-[2rem] p-4 flex flex-col justify-between ml-4 shadow-xl border",
                "bg-white border-neutral-200 dark:bg-neutral-900/50 dark:border-white/5 backdrop-blur-md hover:scale-105 transition-all duration-300"
            )}
        >
            <div className="flex justify-between items-start">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/5 transition-colors", color)}>
                    {type}
                </span>
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 dark:text-neutral-500 transition-colors">
                    <span className="text-xs">M</span>
                </div>
            </div>

            <div className="space-y-1">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium transition-colors">{title}</div>
                 <div className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight transition-colors">
                    {value}
                </div>
                {content && <div className="text-[10px] text-neutral-400 dark:text-neutral-500 transition-colors">{content}</div>}
            </div>
        </div>
    )
}

const firstRow = [
    { title: "Daily Budget", type: "Budget", value: "$42 left", content: "of $60 daily limit", color: "text-green-600 dark:text-green-400" },
    { title: "Net Worth", type: "Total", value: "$12,450", content: "+$1.2k this month", color: "text-blue-600 dark:text-blue-400" },
    { title: "Groceries", type: "Pocket", value: "$120", content: "80% remaining", color: "text-orange-600 dark:text-orange-400" },
    { title: "Recent", type: "Transaction", value: "-$12.50", content: "Uber • 2m ago", color: "text-red-600 dark:text-red-400" },
    { title: "Savings", type: "Goal", value: "$4,500", content: "Trip to Japan", color: "text-purple-600 dark:text-purple-400" },
];

const secondRow = [
    { title: "Subscription", type: "Upcoming", value: "Netflix", content: "$15.99 • Tomorrow", color: "text-red-600 dark:text-red-400" },
    { title: "Investments", type: "Portfolio", value: "+4.2%", content: "All time high", color: "text-green-600 dark:text-green-400" },
    { title: "Eating Out", type: "Pocket", value: "$12", content: "Over budget!", color: "text-red-600 dark:text-red-500" },
    { title: "Fun Money", type: "Pocket", value: "$150", content: "Fully funded", color: "text-yellow-600 dark:text-yellow-400" },
     { title: "Coffee", type: "Insights", value: "34 cups", content: "This month", color: "text-amber-700 dark:text-amber-700" },
];
