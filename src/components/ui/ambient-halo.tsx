import React from 'react';

/**
 * Optimized AmbientHalo component using CSS animations instead of Framer Motion
 * for better performance and reduced bundle size.
 */
const AmbientHalo = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-halo-bg dark:bg-dark-halo-bg">
      {/* Primary Ambient Halo - Light Purple */}
      <div className="absolute inset-0 animate-float-slow">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[900px] h-[900px] rounded-full blur-3xl bg-radial from-halo-purple via-halo-purple-mid to-halo-purple-outer dark:from-dark-halo-purple dark:via-dark-halo-purple-mid dark:to-dark-halo-purple-outer opacity-85" />
          <div className="absolute inset-8 w-[550px] h-[550px] rounded-full blur-2xl bg-radial from-halo-purple via-halo-purple-mid to-transparent dark:from-dark-halo-purple dark:via-dark-halo-purple-mid dark:to-transparent" />
        </div>
      </div>

      {/* Light Pink Halo */}
      <div className="absolute inset-0 animate-float-medium" style={{ animationDelay: '1s' }}>
        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/3">
          <div className="w-[750px] h-[750px] rounded-full blur-3xl bg-radial from-halo-pink via-halo-pink-mid to-halo-pink-outer dark:from-dark-halo-pink dark:via-dark-halo-pink-mid dark:to-dark-halo-pink-outer opacity-70" />
          <div className="absolute inset-8 w-[500px] h-[500px] rounded-full blur-2xl bg-radial from-halo-pink via-halo-pink-mid to-transparent dark:from-dark-halo-pink dark:via-dark-halo-pink-mid dark:to-transparent" />
        </div>
      </div>
      
      {/* Light Blue Halo */}
      <div className="absolute inset-0 animate-float-fast" style={{ animationDelay: '1.5s' }}>
        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[700px] h-[700px] rounded-full blur-3xl bg-radial from-halo-blue via-halo-blue-mid to-halo-blue-outer dark:from-dark-halo-blue dark:via-dark-halo-blue-mid dark:to-dark-halo-blue-outer opacity-90" />
          <div className="absolute inset-8 w-[450px] h-[450px] rounded-full blur-2xl bg-radial from-halo-blue via-halo-blue-mid to-transparent dark:from-dark-halo-blue dark:via-dark-halo-blue-mid dark:to-transparent" />
        </div>
      </div>

      {/* Even Lighter Blue Halo */}
      <div className="absolute inset-0 animate-float-slow" style={{ animationDelay: '0.5s' }}>
        <div className="absolute top-2/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[750px] h-[750px] rounded-full blur-3xl bg-radial from-halo-light-blue via-halo-light-blue-mid to-halo-light-blue-outer dark:from-dark-halo-light-blue dark:via-dark-halo-light-blue-mid dark:to-dark-halo-light-blue-outer opacity-75" />
          <div className="absolute inset-8 w-[500px] h-[500px] rounded-full blur-2xl bg-radial from-halo-light-blue via-halo-light-blue-mid to-transparent dark:from-dark-halo-light-blue dark:via-dark-halo-light-blue-mid dark:to-transparent" />
        </div>
      </div>

      {/* Additional Dynamic Accent Halo - Purple-Pink Mix */}
      <div className="absolute inset-0 animate-float-medium" style={{ animationDelay: '2.5s' }}>
        <div className="absolute top-3/4 left-3/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[600px] h-[600px] rounded-full blur-3xl bg-radial from-halo-purple via-halo-pink to-halo-purple-outer dark:from-dark-halo-purple dark:via-dark-halo-pink dark:to-dark-halo-purple-outer opacity-60" />
        </div>
      </div>
    </div>
  );
};

export default AmbientHalo;