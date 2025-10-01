import React from 'react';

/**
 * Initial Loading Screen Component
 * Professional loading screen that appears before React hydrates
 * Uses existing CSS variables and design system from @/styles/
 */
export const InitialLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-moneko-background flex items-center justify-center z-[9999] transition-opacity duration-500 ease-out">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Moneko Logo using brand colors */}
        <div className="financial-glass w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6 flex items-center justify-center relative overflow-hidden">
          {/* Background gradient using Moneko brand colors */}
          <div className="absolute inset-0 bg-gradient-to-br from-moneko-primary to-moneko-secondary opacity-90"></div>
          
          {/* Logo text */}
          <span className="relative z-10 text-2xl sm:text-3xl font-bold text-white">
            M
          </span>
          
          {/* Professional pulse animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-moneko-primary to-moneko-secondary animate-pulse opacity-20 rounded-full"></div>
        </div>
        
        {/* Title using existing typography classes */}
        <h1 className="text-headline text-foreground mb-2 font-semibold">
          Moneko
        </h1>
        
        {/* Subtitle using muted foreground */}
        <p className="text-label text-muted-foreground mb-8">
          Initializing your financial journey...
        </p>
        
        {/* Loading dots using brand colors and professional animation */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-moneko-primary rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-moneko-primary rounded-full animate-pulse opacity-75" style={{ animationDelay: '0.3s' }}></div>
          <div className="w-2 h-2 bg-moneko-primary rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.6s' }}></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline styles for pre-React rendering
 * Uses CSS variables from app.css for consistency
 */
export const initialLoadingStyles = `
  #moneko-initial-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: hsl(var(--background));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 1;
    transition: opacity 0.5s ease-out, visibility 0.5s ease-out;
  }
  
  #moneko-initial-loader.hidden {
    opacity: 0;
    visibility: hidden;
  }
  
  .moneko-loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  
  .moneko-logo {
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, var(--moneko-primary), var(--moneko-secondary));
    border-radius: 50%;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    position: relative;
    overflow: hidden;
    /* Financial glass material effect */
    backdrop-filter: blur(20px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.125);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .moneko-logo::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--moneko-primary), var(--moneko-secondary));
    opacity: 0.2;
    border-radius: 50%;
    animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .moneko-loader-title {
    font-size: clamp(1.25rem, 2vw, 1.5rem);
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
    font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  
  .moneko-loader-subtitle {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.01em;
    color: hsl(var(--muted-foreground));
    margin-bottom: 2rem;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  
  .moneko-loader-dots {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .moneko-loader-dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--moneko-primary);
    border-radius: 50%;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .moneko-loader-dot:nth-child(2) {
    opacity: 0.75;
    animation-delay: 0.3s;
  }
  
  .moneko-loader-dot:nth-child(3) {
    opacity: 0.5;
    animation-delay: 0.6s;
  }
  
  /* Responsive adjustments for mobile */
  @media (max-width: 640px) {
    .moneko-logo {
      width: 3.5rem;
      height: 3.5rem;
      font-size: 1.25rem;
    }
    
    .moneko-loader-title {
      font-size: 1.25rem;
    }
    
    .moneko-loader-subtitle {
      font-size: 0.8rem;
    }
  }
`;

/**
 * HTML content for initial loading screen
 * Used in __root.tsx before React hydrates
 */
export const initialLoadingHTML = `
  <div id="moneko-initial-loader">
    <div class="moneko-loader-content">
      <div class="moneko-logo">M</div>
      <div class="moneko-loader-title">Moneko</div>
      <div class="moneko-loader-subtitle">Initializing your financial journey...</div>
      <div class="moneko-loader-dots">
        <div class="moneko-loader-dot"></div>
        <div class="moneko-loader-dot"></div>
        <div class="moneko-loader-dot"></div>
      </div>
    </div>
  </div>
`;