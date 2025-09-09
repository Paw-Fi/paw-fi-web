# Professional Animation Guidelines for Moneko Financial Dashboard

## Overview
Updated all skeleton loading animations across the Moneko financial dashboard to maintain a professional, enterprise-grade appearance.

## Animation Standards
- **AVOID**: Bouncing (`animate-bounce`), scaling (`scale`), zooming in/out
- **USE**: Subtle pulse effects (`animate-pulse`) only
- **PURPOSE**: Financial dashboards require professional, non-distracting UX

## Changes Made
- Removed bouncing dots from chat loading states
- Replaced with professional pulse animation
- Applied across all dashboard pages
- Maintained accessibility and loading state visibility

## Files Updated
- `/src/components/chat/chat-conversation-display.tsx`
- All dashboard routes (`/src/routes/dashboard/`)
- Skeleton loading components

## Key Principles
1. Professional appearance for financial applications
2. Subtle, non-distracting animations
3. Consistent pulse effects across platform
4. Accessibility maintained