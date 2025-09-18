import { memo } from 'react';

/**
 * Lightweight, static version of AmbientHalo for mobile devices
 * No animations, just static background gradients for visual consistency
 */
const AmbientHaloMobile = memo(() => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-halo-bg dark:bg-dark-halo-bg">
      {/* Static background gradients positioned like the animated version */}
      
      {/* Purple layer */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-[900px] h-[900px] rounded-full blur-3xl bg-radial from-halo-purple/40 via-halo-purple-mid/30 to-halo-purple-outer/20 dark:from-dark-halo-purple/40 dark:via-dark-halo-purple-mid/30 dark:to-dark-halo-purple-outer/20" />
      </div>
      
      {/* Pink layer */}
      <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-[750px] h-[750px] rounded-full blur-3xl bg-radial from-halo-pink/40 via-halo-pink-mid/30 to-halo-pink-outer/20 dark:from-dark-halo-pink/40 dark:via-dark-halo-pink-mid/30 dark:to-dark-halo-pink-outer/20" />
      </div>
      
      {/* Blue layer */}
      <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-[700px] h-[700px] rounded-full blur-3xl bg-radial from-halo-blue/40 via-halo-blue-mid/30 to-halo-blue-outer/20 dark:from-dark-halo-blue/40 dark:via-dark-halo-blue-mid/30 dark:to-dark-halo-blue-outer/20" />
      </div>
      
      {/* Light blue layer */}
      <div className="absolute top-2/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-[750px] h-[750px] rounded-full blur-3xl bg-radial from-halo-light-blue/40 via-halo-light-blue-mid/30 to-halo-light-blue-outer/20 dark:from-dark-halo-light-blue/40 dark:via-dark-halo-light-blue-mid/30 dark:to-dark-halo-light-blue-outer/20" />
      </div>
      
      {/* Accent layer */}
      <div className="absolute top-3/4 left-3/4 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-[600px] h-[600px] rounded-full blur-3xl bg-radial from-halo-purple/30 via-halo-pink/25 to-halo-purple-outer/15 dark:from-dark-halo-purple/30 dark:via-dark-halo-pink/25 dark:to-dark-halo-purple-outer/15" />
      </div>
    </div>
  );
});

AmbientHaloMobile.displayName = 'AmbientHaloMobile';

export default AmbientHaloMobile;