# Home Page Variants System

This system allows you to create multiple home page variants for A/B testing and different marketing campaigns focused on passive income and high-interest portfolios.

## How It Works

### 1. Data Structure
- **File**: `src/data/home/passive-income-variants.json`
- Contains different home page configurations with unique content, CTAs, and routing

### 2. Reusable Component
- **Component**: `src/components/index/reusable-home-page.tsx`
- Accepts variant data as props
- Handles SEO, meta tags, and structured data
- Fully responsive and animated

### 3. Route Implementation
- **Route**: `src/routes/passive-income/$slugId.tsx`
- Dynamic route that accepts different variant slugs
- Automatically loads corresponding variant data
- Falls back to default variant if slug not found

## Available Variants

### 1. High-Interest Portfolios (`high-interest-portfolios`)
**URL**: `/passive-income/high-interest-portfolios`
- **Focus**: Building wealth through high-yield passive income portfolios
- **Target Audience**: Non-professional traders seeking passive income
- **Primary CTA**: Navigate to `/dashboard/income-builder`
- **Keywords**: passive income, high-interest portfolios, compound interest

### 2. Goal Tracker Focus (`goal-tracker-focus`)
**URL**: `/passive-income/goal-tracker-focus`
- **Focus**: Tracking financial freedom goals with AI
- **Target Audience**: Goal-oriented individuals planning financial independence
- **Primary CTA**: Navigate to `/dashboard/tracker`
- **Keywords**: financial freedom goals, passive income tracking, AI financial planning

### 3. Compound Interest Focus (`compound-interest-focus`)
**URL**: `/passive-income/compound-interest-focus`
- **Focus**: Harnessing compound interest for wealth building
- **Target Audience**: Long-term investors interested in compound growth
- **Primary CTA**: Navigate to `/calculators/compound`
- **Keywords**: compound interest, passive wealth building, automatic wealth building

## Adding New Variants

To create a new variant:

1. **Add variant data** to `passive-income-variants.json`:
```json
{
  "new-variant-name": {
    "meta": {
      "title": "Your SEO Title",
      "description": "Your SEO description", 
      "keywords": "your, seo, keywords"
    },
    "hero": {
      "title": "Your Hero Title",
      "subtitle": "Your hero subtitle",
      "ctaText": "Your CTA Text",
      "ctaRoute": "/your/cta/route",
      "chatSuggestions": ["suggestion1", "suggestion2"]
    },
    "videoSection": {
      "title": "Video Section Title",
      "subtitle": "Video section description",
      "videoUrl": "/your-video.webm",
      "poster": "/your-poster.webp"
    },
    "features": [
      {
        "title": "Feature Title",
        "description": "Feature description",
        "icon": "🚀",
        "route": "/feature/route"
      }
    ],
    "lessons": [
      {
        "title": "Lesson Title",
        "description": "Lesson description",
        "icon": "📚"
      }
    ],
    "benefits": [
      "Benefit 1",
      "Benefit 2"
    ]
  }
}
```

2. **Access the variant** via URL: `/passive-income/new-variant-name`

## Key Features

### SEO Optimization
- Dynamic meta tags based on variant data
- Structured data for search engines
- Canonical URLs for each variant
- Open Graph and Twitter meta tags

### Performance
- Lazy loading for animations and heavy components
- Mobile-optimized animations
- Responsive design
- Efficient code splitting

### Analytics & Testing
- Each variant has unique URLs for tracking
- Easy A/B testing setup
- Different conversion funnels per variant
- Trackable CTA performance

## Usage Examples

### Basic Usage
```tsx
import ReusableHomePage from '@/components/index/reusable-home-page';
import variants from '@/data/home/passive-income-variants.json';

function MyHomePage() {
  const variant = variants['high-interest-portfolios'];
  const canonicalUrl = 'https://moneko.io/passive-income/high-interest-portfolios';
  
  return <ReusableHomePage variant={variant} canonicalUrl={canonicalUrl} />;
}
```

### Dynamic Route Usage
The system automatically handles route parameters in `$slugId.tsx`:
- `/passive-income/high-interest-portfolios` → loads `high-interest-portfolios` variant
- `/passive-income/goal-tracker-focus` → loads `goal-tracker-focus` variant
- `/passive-income/invalid-slug` → falls back to default `high-interest-portfolios` variant

## Dashboard Integration

Each variant can route users to different dashboard features:

- **Income Builder**: `/dashboard/income-builder` (coming soon page with links)
- **Goal Tracker**: `/dashboard/tracker` (fully functional AI-powered goal tracking)
- **Calculators**: `/calculators` (compound interest, retirement, etc.)
- **Learning Platform**: `/dashboard/learning` (financial education courses)
- **AI Coach**: `/dashboard` (main dashboard with AI chat)

## Future Enhancements

1. **Dynamic Video Content**: Support for variant-specific video content
2. **Personalization**: User-specific content based on profile data
3. **Analytics Integration**: Built-in conversion tracking
4. **Content Management**: Admin interface for variant management
5. **Localization**: Multi-language variant support