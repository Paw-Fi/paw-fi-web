import React from 'react'

interface CriticalResourcesProps {
  fonts?: string[]
  images?: string[]
  scripts?: string[]
  stylesheets?: string[]
}

export function CriticalResources({ 
  fonts = [], 
  images = [], 
  scripts = [], 
  stylesheets = [] 
}: CriticalResourcesProps) {
  return (
    <>
      {/* Preload critical fonts */}
      {fonts.map((font) => (
        <link
          key={font}
          rel="preload"
          href={font}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      ))}
      
      {/* Preload critical images */}
      {images.map((image) => (
        <link
          key={image}
          rel="preload"
          href={image}
          as="image"
        />
      ))}
      
      {/* Preload critical scripts */}
      {scripts.map((script) => (
        <link
          key={script}
          rel="preload"
          href={script}
          as="script"
        />
      ))}
      
      {/* Preload critical stylesheets */}
      {stylesheets.map((stylesheet) => (
        <link
          key={stylesheet}
          rel="preload"
          href={stylesheet}
          as="style"
        />
      ))}
    </>
  )
}

export function MonekoCriticalResources() {
  return (
    <CriticalResources
      fonts={[
        '/fonts/Poppins-400.woff2',
        '/fonts/Poppins-600.woff2',
        '/fonts/HeptaSlab-600.woff2',
      ]}
      images={[
        '/logo192.webp',  // Updated to WebP with PNG fallback
        '/logo512.webp',  // Added larger WebP logo
        '/hero-bg.webp',
        '/og-img.png',    // OG image for social sharing
      ]}
    />
  )
}

export function PerformanceHints() {
  return (
    <>
      {/* DNS prefetch for external domains - resolve DNS early */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      <link rel="dns-prefetch" href="//api.stripe.com" />
      <link rel="dns-prefetch" href="//js.stripe.com" />
      
      {/* Preconnect to critical external origins - establish early connections */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
      <link rel="preconnect" href="https://api.stripe.com" />
      <link rel="preconnect" href="https://js.stripe.com" />
      
      {/* Early hints for critical resources - load essential modules first */}
      <link rel="modulepreload" href="/src/main.tsx" />
      <link rel="modulepreload" href="/src/router.tsx" />
      <link rel="modulepreload" href="/src/client.tsx" />
      
      {/* Prefetch likely next pages for faster navigation */}
      <link rel="prefetch" href="/calculators/compound-calculator" />
      <link rel="prefetch" href="/calculators/mortgage-calculator" />
      <link rel="prefetch" href="/calculators/retirement-calculator" />
      <link rel="prefetch" href="/dashboard" />
      <link rel="prefetch" href="/pricing" />
      
      {/* Resource timing and performance hints */}
      <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width" />
      <meta name="format-detection" content="telephone=no" />
    </>
  )
}