// src/utils/seo.ts
export interface SeoMetaParams {
  title: string
  description?: string
  image?: string
  keywords?: string
  url?: string
}

export function seo({
  title,
  description,
  keywords,
  image,
  url,
}: SeoMetaParams) {
  const metaTags = [
    // Title is handled separately
    {title},
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:creator', content: '@tannerlinsley' },
    { name: 'twitter:site', content: '@tannerlinsley' },
    { name: 'og:type', content: 'website' },
    { name: 'og:title', content: title },
    { name: 'og:description', content: description },
    { name: 'og:url', content: url },
    { name: 'og:type', content: 'website' },

    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'og:image', content: image },
        ]
      : []),
  ]
  return metaTags 
}
