'use client';

import { Outlet, useLocation } from '@tanstack/react-router';
import Header from '../Header';
import { useMemo } from 'react';

const EXCLUDED_PATHNAMES = ['/', '/intro'];
export function PageLayout() {
  const location=useLocation()
  const hideHeader = useMemo(() => EXCLUDED_PATHNAMES.includes(location.pathname), [location]);
  
  // If we're on the home page, just render the outlet without the layout
  if (hideHeader) {
    return <Outlet />;
  }
  
  // For all other pages, apply the layout with header
  return (
    <div className="flex flex-col h-screen w-screen ">
      <Header />
      <main className="flex-1 bg-background flex flex-col justify-center items-center [view-transition-name:main-content]">
        <Outlet />
      </main>
    </div>
  );
}

export default PageLayout;
