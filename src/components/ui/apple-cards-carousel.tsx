"use client";
import React, { useEffect, useRef, useState } from "react";
import { IconArrowNarrowLeft, IconArrowNarrowRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface CarouselProps {
  /**
   * Items rendered exactly as provided by the parent. Do not rely on the
   * carousel to add any styling to these items.
   */
  items: React.ReactElement[];
  /**
   * Optional iPhone mockups to render before each corresponding item.
   * Length should match items length. If omitted, only the item is rendered.
   */
  iphoneMockups?: React.ReactElement[];
  /**
   * Initial scrollLeft position for the container.
   */
  initialScroll?: number;
  /**
   * Show previous/next arrow buttons (defaults to true).
   */
  showArrows?: boolean;
  /**
   * Optional className for the outermost container.
   */
  className?: string;
}

export function Carousel({
  items,
  iphoneMockups,
  initialScroll = 0,
  showArrows = true,
  className,
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [sideSpacer, setSideSpacer] = useState(0);

  useEffect(() => {
    if (!scrollRef.current) return;
    // Set initial scroll position (if provided)
    scrollRef.current.scrollLeft = initialScroll;
    computeSideSpacers();
    updateScrollability();
    const onResize = () => {
      computeSideSpacers();
      updateScrollability();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScroll, items.length]);

  function updateScrollability() {
    const el = scrollRef.current;
    if (!el) return;
    // Determine nearest centered item and enable/disable arrows accordingly
    const idx = getCurrentIndex();
    setCanScrollLeft(idx > 0);
    setCanScrollRight(idx < items.length - 1);
  }

  function handleScroll() {
    updateScrollability();
  }

  function scrollByAmount(delta: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  function computeSideSpacers() {
    const el = scrollRef.current;
    if (!el) return;
    const firstItem = el.querySelector('[data-carousel-item="true"]') as HTMLElement | null;
    if (!firstItem) return;
    const containerWidth = el.clientWidth;
    const itemWidth = firstItem.offsetWidth;
    const spacer = Math.max(0, (containerWidth - itemWidth) / 2);
    setSideSpacer(spacer);
  }

  function getItemElements() {
    const el = scrollRef.current;
    if (!el) return [] as HTMLElement[];
    return Array.from(el.querySelectorAll('[data-carousel-item="true"]')) as HTMLElement[];
  }

  function getCurrentIndex() {
    const el = scrollRef.current;
    if (!el) return 0;
    const itemsEls = getItemElements();
    if (itemsEls.length === 0) return 0;
    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < itemsEls.length; i++) {
      const it = itemsEls[i];
      const itemCenter = it.offsetLeft + it.offsetWidth / 2;
      const dist = Math.abs(itemCenter - containerCenter);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    return nearestIdx;
  }

  function scrollToIndex(targetIdx: number) {
    const el = scrollRef.current;
    if (!el) return;
    const itemsEls = getItemElements();
    const idx = Math.max(0, Math.min(targetIdx, itemsEls.length - 1));
    const target = itemsEls[idx];
    if (!target) return;
    // Compute left so that the target item is centered in the container
    const targetLeft = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    el.scrollTo({ left: targetLeft, behavior: "smooth" });
  }

  function scrollPrev() {
    const idx = getCurrentIndex();
    scrollToIndex(idx - 1);
  }

  function scrollNext() {
    const idx = getCurrentIndex();
    scrollToIndex(idx + 1);
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          // Keep container minimal to avoid affecting child item styles
          "flex w-full h-full items-stretch overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any }}
      >
        {/* Dynamic leading/trailing spacers to center the first/last item */}
        {sideSpacer > 0 && (
          <div className="flex-none snap-start" aria-hidden style={{ width: sideSpacer }} />
        )}
        {items.map((item, index) => (
          <div
            key={index}
            className="flex-none snap-center h-full overflow-hidden"
            data-carousel-item="true"
          >
            <div className="flex h-full flex-col items-center justify-start">
              {/* Render the item exactly as provided */}
              {item}
              {/* Render optional iPhone mockup after the item if provided */}
              {iphoneMockups?.[index]}
            </div>
          </div>
        ))}
        {sideSpacer > 0 && (
          <div className="flex-none snap-end" aria-hidden style={{ width: sideSpacer }} />
        )}
      </div>

      {showArrows && (
        <div className="absolute bottom-2 right-3 lg:right-20 z-30 flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-sm transition disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
            onClick={scrollPrev}
            disabled={!canScrollLeft}
          >
            <IconArrowNarrowLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-sm transition disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
            onClick={scrollNext}
            disabled={!canScrollRight}
          >
            <IconArrowNarrowRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Carousel;
