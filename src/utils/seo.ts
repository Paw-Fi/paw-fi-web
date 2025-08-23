// src/utils/seo.ts
import { siteConfig } from '@/config/site';

export interface SeoMetaParams {
  title: string
  description?: string
  image?: string
  keywords?: string
  url?: string
  imageType?: string
  imageWidth?: string  
  imageHeight?: string
}

// Interface for custom meta tag attributes
interface MetaTag {
  name?: string
  property?: string
  content?: string
  title?: string
  [key: string]: any
}

export function seo({
  title,
  description,
  keywords,
  image,
  url,
  imageType = siteConfig.ogImage.type,
  imageWidth = siteConfig.ogImage.width,
  imageHeight = siteConfig.ogImage.height,
}: SeoMetaParams): MetaTag[] {
  const metaTags: MetaTag[] = [
    // Title is handled separately
    { title },
    
    // Standard meta tags 
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    
    // Twitter Card meta tags (always use 'name')
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: siteConfig.twitterHandle },
    { name: 'twitter:creator', content: siteConfig.twitterHandle },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    
    // Open Graph meta tags - using proper 'property' attributes
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: siteConfig.name },

    ...(image
      ? [
          // Twitter image
          { name: 'twitter:image', content: image },
          // Open Graph image with metadata using proper 'property' attributes
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: imageWidth },
          { property: 'og:image:height', content: imageHeight },
          { property: 'og:image:type', content: imageType },
        ]
      : []),
  ]
  
  return metaTags
}

// Alternative function for manual property attribute handling if needed
export function generateOpenGraphTags({
  title,
  description,
  image,
  url,
  imageType = siteConfig.ogImage.type,
  imageWidth = siteConfig.ogImage.width,
  imageHeight = siteConfig.ogImage.height,
}: SeoMetaParams): MetaTag[] {
  const ogTags: MetaTag[] = [
    // Open Graph with proper property attributes
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: siteConfig.name },
  ]
  
  if (image) {
    ogTags.push(
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: imageWidth },
      { property: 'og:image:height', content: imageHeight },
      { property: 'og:image:type', content: imageType }
    )
  }
  
  return ogTags
}

// Legacy function name for backward compatibility
export function generateMetaTags(params: SeoMetaParams) {
  return seo(params);
}
