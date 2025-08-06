# Dashboard Guidance System - Complete Implementation Guide

## Overview

The Dashboard Guidance Monitor provides contextual, intelligent tooltip guidance throughout the Moneko dashboard. It tracks user behavior, learns from patterns, and provides helpful tips at optimal moments.

## Features

✅ **Smart Contextual Guidance** - 25+ scenarios covering all dashboard areas
✅ **Intelligent Timing** - Only one tooltip shown at a time, with frequency controls
✅ **User Journey Tracking** - Adapts based on user progress and experience level
✅ **Preference Management** - Users can control frequency and disable guidance
✅ **Anti-Annoyance System** - Cooldowns, max show counts, and smart triggers
✅ **Route-Aware** - Different guidance for each dashboard section
✅ **Progress Tracking** - Monitors user engagement and learning progress

## Quick Test Guide

### Test Scenario 1: New User Onboarding
```javascript
// Simulate first-time user flow
1. Clear localStorage: localStorage.clear()
2. Navigate to /dashboard/tracker/
3. Expected: "Welcome to your Goal Tracker!" tooltip from tracker agent
4. Navigate to /dashboard/learning/  
5. Expected: "Welcome to Moneko Learning!" tooltip from educator agent
```

### Test Scenario 2: Goal Creation Flow
```javascript
// Test goal-related guidance
1. Create a goal in /onboarding/
2. Get redirected to /dashboard/tracker/{goalId}
3. Expected: "Congratulations on creating your first goal!" tooltip from advisor agent
```

### Test Scenario 3: Feature Discovery
```javascript
// Test feature discovery prompts
1. Stay on dashboard homepage for 30+ seconds
2. Expected: "New to finance? Check out our learning section!" tooltip from educator
3. Use chat feature
4. Expected: Chat usage tracked, future chat prompts reduced
```

## Implementation Examples

### Basic Integration (Already implemented in route.tsx)
```typescript
import { useDashboardGuidance } from '@/hooks/useDashboardGuidance';

const { trackUserAction, updatePreferences } = useDashboardGuidance({
  enabled: true,
  frequencyLevel: 'medium',
  sidebarRef: rightSidebarRef
});

// Track specific user actions
trackUserAction('goal_created', { goalId: '123' });
trackUserAction('chat_used', { aiType: 'advisor' });
trackUserAction('learning_visited');
```

### Manual Tooltip Control
```typescript
// Show tooltip programmatically
rightSidebarRef.current?.showTooltip(
  'advisor', 
  'Custom guidance message here!', 
  'left'
);

// Hide all tooltips
rightSidebarRef.current?.hideAllTooltips();
```

### Guidance Settings Integration
```typescript
import { GuidanceSettings, GuidanceSettingsButton } from '@/components/dashboard/GuidanceSettings';

// Add to your component
const [showGuidanceSettings, setShowGuidanceSettings] = useState(false);

// In JSX
<GuidanceSettingsButton onOpen={() => setShowGuidanceSettings(true)} />

<GuidanceSettings
  isOpen={showGuidanceSettings}
  onClose={() => setShowGuidanceSettings(false)}
  trackUserAction={trackUserAction}
  updatePreferences={updatePreferences}
  resetGuidanceState={resetGuidanceState}
  getGuidanceStats={getGuidanceStats}
/>
```

## Guidance Scenarios by Route

### Goal Tracker (`/dashboard/tracker/`)
- **First Visit**: Welcome message from tracker agent
- **No Goals**: Encouragement to create first goal
- **Goal Behind Schedule**: Action plan suggestions from advisor
- **Goal Milestone**: Celebration message from tracker

### Learning (`/dashboard/learning/`)
- **First Visit**: Introduction to essentials from educator
- **Course Completion**: Next course recommendations from educator
- **No Learning Activity**: Gentle prompts from dashboard

### Chat (`/dashboard/chat/`)
- **First Visit**: Introduction to AI capabilities from advisor
- **Long Time No Use**: Encouragement to ask questions

### Portfolio (`/dashboard/portfolio/`)
- **First Visit**: How to connect accounts from advisor
- **Weekly Review**: Portfolio analysis suggestions

### Main Dashboard (`/dashboard/`)
- **Idle Time**: Feature discovery prompts
- **Long Absence**: Re-engagement messages
- **Community Features**: Advanced feature introductions

## Customization Guide

### Adding New Scenarios
```typescript
// In dashboard-guidance-monitor.ts, add to GUIDANCE_SCENARIOS:
{
  id: 'custom_scenario',
  route: '/dashboard/your-route',
  agentId: 'advisor', // or 'tracker' or 'educator'
  message: 'Your helpful guidance message here',
  priority: 'medium',
  conditions: [
    { type: 'first_visit', value: true },
    { type: 'page_time', value: 5000 } // 5 seconds on page
  ],
  cooldownHours: 24,
  maxShowCount: 3
}
```

### Condition Types Available
- `first_visit`: User's first time on this route
- `return_visit`: User has visited before
- `time_since_last`: Hours since last visit
- `page_time`: Milliseconds spent on current page
- `route_pattern`: Custom logic (e.g., 'no_chat_used')
- `goal_status`: Check goal conditions
- `user_action`: Check user behavior

### Priority Levels
- **high**: Critical guidance, shown more often
- **medium**: Balanced guidance, respects frequency settings
- **low**: Optional guidance, shown only when appropriate

## Analytics & Insights

### Track Guidance Effectiveness
```typescript
// Get guidance statistics
const stats = getGuidanceStats();
console.log({
  totalVisits: stats.totalVisits,
  routesVisited: stats.routesVisited,
  scenariosShown: stats.scenariosShown,
  userJourney: stats.userJourney
});
```

### User Preferences
```typescript
// Update user guidance preferences
updatePreferences({
  guidanceEnabled: true,
  frequencyLevel: 'high' // 'high' | 'medium' | 'low'
});
```

## Advanced Features

### Smart Frequency Control
- **High**: More guidance, better for new users
- **Medium**: Balanced guidance (default)
- **Low**: Minimal guidance, experienced users

### Anti-Annoyance System
- Maximum show counts per scenario
- Cooldown periods between shows
- Smart timing based on user behavior
- One tooltip at a time policy

### Learning Adaptation
- Tracks successful user actions after guidance
- Reduces frequency for features user has mastered
- Increases guidance for areas user hasn't explored

## Development Tips

### Testing Different User States
```javascript
// Reset guidance state for testing
localStorage.removeItem('dashboard-guidance-state');

// Simulate experienced user
localStorage.setItem('dashboard-guidance-state', JSON.stringify({
  userJourney: {
    hasCreatedGoal: true,
    hasUsedChat: true,
    hasViewedLearning: true,
    hasViewedPortfolio: true
  }
}));
```

### Debugging Guidance
```javascript
// Enable guidance monitoring logs
const monitor = dashboardGuidanceMonitor;
console.log('Current guidance state:', monitor.getGuidanceStats());
```

### Performance Considerations
- Guidance evaluation runs max every 30 seconds
- LocalStorage operations are debounced
- Tooltip animations are optimized for 60fps
- Smart caching prevents unnecessary re-evaluations

## Future Enhancements

### Planned Features
- [ ] A/B testing for guidance effectiveness
- [ ] Machine learning for optimal timing
- [ ] Multi-language guidance support
- [ ] Advanced analytics dashboard
- [ ] Integration with user onboarding surveys

### Integration Ideas
- [ ] Help documentation integration
- [ ] Video tutorial triggers
- [ ] Achievement/badge systems
- [ ] Progressive disclosure patterns
- [ ] Context-sensitive help search

This guidance system provides a foundation for intelligent, contextual user assistance that grows with the user and adapts to their learning patterns.