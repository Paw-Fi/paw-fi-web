// Utility for generating responsive calculator screenshot URLs
// This provides multiple sizes and formats for optimal loading across devices

export interface ResponsiveScreenshot {
  src: string
  width: number
  format?: 'webp' | 'avif' | 'jpg' | 'png'
}

export interface ScreenshotConfig {
  baseName: string
  alt: string
  aspectRatio?: string
  sizes?: string
}

// Standard breakpoints for calculator screenshots
export const SCREENSHOT_BREAKPOINTS = [
  480,  // Mobile
  768,  // Tablet
  1024, // Desktop
  1200  // Large Desktop
] as const

// Generate responsive sources for a calculator screenshot
export function generateCalculatorScreenshots(
  calculatorName: string, 
  options?: { 
    includeWebP?: boolean 
    includeAVIF?: boolean 
    customBreakpoints?: number[]
  }
): ResponsiveScreenshot[] {
  const { includeWebP = true, includeAVIF = true, customBreakpoints } = options || {}
  const breakpoints = customBreakpoints || SCREENSHOT_BREAKPOINTS
  const sources: ResponsiveScreenshot[] = []

  // Add AVIF sources (best compression, modern browsers)
  if (includeAVIF) {
    breakpoints.forEach(width => {
      sources.push({
        src: `https://moneko.io/screenshots/${calculatorName}-${width}w.avif`,
        width,
        format: 'avif'
      })
    })
  }

  // Add WebP sources (good compression, wide support)
  if (includeWebP) {
    breakpoints.forEach(width => {
      sources.push({
        src: `https://moneko.io/screenshots/${calculatorName}-${width}w.webp`,
        width,
        format: 'webp'
      })
    })
  }

  // Add JPEG sources (universal fallback)
  breakpoints.forEach(width => {
    sources.push({
      src: `https://moneko.io/screenshots/${calculatorName}-${width}w.jpg`,
      width,
      format: 'jpg'
    })
  })

  return sources
}

// Pre-configured screenshot configs for all calculators
export const CALCULATOR_SCREENSHOTS: Record<string, ScreenshotConfig> = {
  'compound-calculator': {
    baseName: 'compound-calculator',
    alt: 'Moneko Compound Interest Calculator Screenshot - Interactive tool showing compound growth visualization with charts',
    aspectRatio: '16/10',
    sizes: '(min-width: 1200px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 480px'
  },
  'mortgage-calculator': {
    baseName: 'mortgage-calculator', 
    alt: 'Moneko Mortgage Payment Calculator Screenshot - PITI breakdown with amortization schedule and payment analysis',
    aspectRatio: '16/10',
    sizes: '(min-width: 1200px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 480px'
  },
  'retirement-calculator': {
    baseName: 'retirement-calculator',
    alt: 'Moneko Retirement Planning Calculator Screenshot - Savings projection tool with timeline visualization',
    aspectRatio: '16/10', 
    sizes: '(min-width: 1200px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 480px'
  },
  'investment-calculator': {
    baseName: 'investment-calculator',
    alt: 'Moneko Investment Growth Calculator Screenshot - Portfolio projection tool with compound returns analysis',
    aspectRatio: '16/10',
    sizes: '(min-width: 1200px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 480px'
  },
  'auto-loan-calculator': {
    baseName: 'auto-loan-calculator',
    alt: 'Moneko Auto Loan Payment Calculator Screenshot - Car financing tool with payment breakdown and comparison',
    aspectRatio: '16/10',
    sizes: '(min-width: 1200px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 480px'
  },
  'saving-goals-calculator': {
    baseName: 'saving-goals-calculator', 
    alt: 'Moneko Savings Goal Calculator Screenshot - Goal planning tool with monthly savings requirements and timeline',
    aspectRatio: '16/10',
    sizes: '(min-width: 1200px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 480px'
  }
}

// Get responsive screenshot data for schema markup
export function getCalculatorScreenshotData(calculatorName: string) {
  const config = CALCULATOR_SCREENSHOTS[calculatorName]
  if (!config) {
    throw new Error(`Calculator screenshot config not found: ${calculatorName}`)
  }

  const responsiveSources = generateCalculatorScreenshots(config.baseName)
  
  // Primary screenshot URL (1200w JPEG for schema)
  const primaryScreenshot = `https://moneko.io/screenshots/${config.baseName}-1200w.jpg`
  
  // Generate srcset string for schema
  const jpegSources = responsiveSources.filter(s => s.format === 'jpg')
  const srcSet = jpegSources.map(s => `${s.src} ${s.width}w`).join(', ')

  return {
    screenshot: primaryScreenshot,
    screenshotSrcSet: srcSet,
    responsiveSources,
    alt: config.alt,
    aspectRatio: config.aspectRatio,
    sizes: config.sizes
  }
}

// Helper function to get image dimensions from aspect ratio and width
export function getImageDimensions(width: number, aspectRatio: string = '16/10') {
  const [ratioWidth, ratioHeight] = aspectRatio.split('/').map(Number)
  const height = Math.round(width * (ratioHeight / ratioWidth))
  return { width, height }
}

// Generate JSON-LD ImageObject with responsive properties
export function generateImageObjectSchema(calculatorName: string) {
  const screenshotData = getCalculatorScreenshotData(calculatorName)
  const { width, height } = getImageDimensions(1200, screenshotData.aspectRatio)
  
  return {
    "@type": "ImageObject",
    "url": screenshotData.screenshot,
    "contentUrl": screenshotData.screenshot,
    "caption": screenshotData.alt,
    "width": width,
    "height": height,
    "encodingFormat": "image/jpeg",
    "representativeOfPage": true
  }
}