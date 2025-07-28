import React from 'react'

interface OrganizationData {
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
}

interface WebsiteData {
  url: string
  name: string
  description?: string
  publisher?: OrganizationData
}

interface ArticleData {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  author?: {
    name: string
    url?: string
  }
  image?: string
  publisher?: OrganizationData
}

interface BreadcrumbItem {
  name: string
  url: string
}

interface FAQItem {
  question: string
  answer: string
}

interface StructuredDataProps {
  type: 'organization' | 'website' | 'article' | 'breadcrumb' | 'faq'
  data: OrganizationData | WebsiteData | ArticleData | BreadcrumbItem[] | FAQItem[]
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const getStructuredData = () => {
    const baseContext = 'https://schema.org'

    switch (type) {
      case 'organization':
        const orgData = data as OrganizationData
        return {
          '@context': baseContext,
          '@type': 'Organization',
          name: orgData.name,
          url: orgData.url,
          logo: orgData.logo,
          description: orgData.description,
          sameAs: orgData.sameAs,
        }

      case 'website':
        const websiteData = data as WebsiteData
        return {
          '@context': baseContext,
          '@type': 'WebSite',
          name: websiteData.name,
          url: websiteData.url,
          description: websiteData.description,
          publisher: websiteData.publisher,
        }

      case 'article':
        const articleData = data as ArticleData
        return {
          '@context': baseContext,
          '@type': 'Article',
          headline: articleData.title,
          description: articleData.description,
          url: articleData.url,
          datePublished: articleData.datePublished,
          dateModified: articleData.dateModified || articleData.datePublished,
          author: articleData.author ? {
            '@type': 'Person',
            name: articleData.author.name,
            url: articleData.author.url,
          } : undefined,
          image: articleData.image,
          publisher: articleData.publisher,
        }

      case 'breadcrumb':
        const breadcrumbData = data as BreadcrumbItem[]
        return {
          '@context': baseContext,
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbData.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        }

      case 'faq':
        const faqData = data as FAQItem[]
        return {
          '@context': baseContext,
          '@type': 'FAQPage',
          mainEntity: faqData.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }

      default:
        return null
    }
  }

  const structuredData = getStructuredData()

  if (!structuredData) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// Pre-configured components for common use cases
export function MonekoOrganizationData() {
  return (
    <StructuredData
      type="organization"
      data={{
        name: 'Moneko',
        url: 'https://moneko.io',
        logo: 'https://moneko.io/logo192.png',
        description: 'Personal finance education and budgeting tools platform',
        sameAs: [
          'https://twitter.com/moneko',
          'https://linkedin.com/company/moneko',
        ],
      }}
    />
  )
}

export function MonekoWebsiteData() {
  return (
    <StructuredData
      type="website"
      data={{
        url: 'https://moneko.io',
        name: 'Moneko',
        description: 'Learn personal finance with comprehensive budgeting tools, calculators, and educational resources',
        publisher: {
          name: 'Moneko',
          url: 'https://moneko.io',
          logo: 'https://moneko.io/logo192.png',
        },
      }}
    />
  )
}