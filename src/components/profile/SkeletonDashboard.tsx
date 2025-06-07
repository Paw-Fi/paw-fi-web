'use client';

import React from 'react';
import { SkeletonWidget } from './SkeletonWidget';

export function SkeletonDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[14rem]">
      <SkeletonWidget columnSpan={2} />
      <SkeletonWidget />
      <SkeletonWidget />
      <SkeletonWidget columnSpan={2} isExpanded={true} />
    </div>
  );
}
