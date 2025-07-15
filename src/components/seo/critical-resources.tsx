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
        '/logo192.png',
        '/hero-bg.webp',
      ]}
    />
  )
}

export function PerformanceHints() {
  return (
    <>
      {/* DNS prefetch for external domains */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      
      {/* Preconnect to external origins */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      
      {/* Early hints for critical resources */}
      <link rel="modulepreload" href="/src/main.tsx" />
      <link rel="modulepreload" href="/src/router.tsx" />
    </>
  )
}