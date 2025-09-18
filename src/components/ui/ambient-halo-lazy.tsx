import { lazy, Suspense, memo } from 'react';
import { useDeviceType } from '@/hooks/use-device-type';
import AmbientHaloMobile from './ambient-halo-mobile';

// Lazy load the heavy AmbientHalo component
const AmbientHaloHeavy = lazy(() => import('./ambient-halo'));

/**
 * Intelligent ambient halo component that:
 * 1. Uses static mobile version on mobile devices
 * 2. Lazy loads the heavy animated version on desktop
 * 3. Provides fallback during loading
 */
const AmbientHaloLazy = memo(() => {
  const { isMobile } = useDeviceType();

  // On mobile, use lightweight static version
  if (isMobile) {
    return <AmbientHaloMobile />;
  }

  // On desktop, lazy load the heavy animated version
  return (
    <Suspense fallback={<AmbientHaloMobile />}>
      <AmbientHaloHeavy />
    </Suspense>
  );
});

AmbientHaloLazy.displayName = 'AmbientHaloLazy';

export default AmbientHaloLazy;