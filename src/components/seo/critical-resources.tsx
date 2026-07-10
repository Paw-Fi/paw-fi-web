import React from "react";

interface CriticalResourcesProps {
  fonts?: string[];
  images?: string[];
  scripts?: string[];
  stylesheets?: string[];
}

export function CriticalResources({
  fonts = [],
  images = [],
  scripts = [],
  stylesheets = [],
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
        <link key={image} rel="preload" href={image} as="image" />
      ))}

      {/* Preload critical scripts */}
      {scripts.map((script) => (
        <link key={script} rel="preload" href={script} as="script" />
      ))}

      {/* Preload critical stylesheets */}
      {stylesheets.map((stylesheet) => (
        <link key={stylesheet} rel="preload" href={stylesheet} as="style" />
      ))}
    </>
  );
}

export function MonekoCriticalResources() {
  return (
    <>
      <CriticalResources fonts={[]} images={["/logo192.webp"]} />
    </>
  );
}

export function PerformanceHints() {
  return (
    <>
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />

      <link rel="preconnect" href="https://www.googletagmanager.com" />

      <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width" />
      <meta name="format-detection" content="telephone=no" />
    </>
  );
}
