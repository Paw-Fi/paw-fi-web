# Dashboard Guidance System - SSR-Safe Testing Guide

## ✅ SSR Safety Features Added

All guidance system components are now safe for server-side rendering:
- ✅ `typeof window !== 'undefined'` checks before all DOM/browser API usage
- ✅ localStorage operations are client-side only
- ✅ setInterval/clearInterval wrapped in window checks  
- ✅ document.referrer access protected
- ✅ Hook effects guarded against SSR

## 🧪 How to Test the Guidance System

### Step 1: Reset User State (Fresh User Experience)

Open your browser dev tools console and run:

```javascript
// Clear all guidance data to simulate new user
localStorage.removeItem('dashboard-guidance-state');

// Optional: Clear all localStorage to simulate completely fresh user
// localStorage.clear();

// Refresh the page
window.location.reload();
```

### Step 2: Test New User Journey

Navigate through these routes in order to trigger guidance:

```javascript
// 1. Go to Goal Tracker (should show welcome message)
window.location.href = '/dashboard/tracker/';
// Expected: Tracker agent says "Welcome to your Goal Tracker! Click here to get help setting up your first financial goal."

// Wait 2 seconds, then go to Learning
setTimeout(() => {
  window.location.href = '/dashboard/learning/';
}, 2000);
// Expected: Educator agent says "Welcome to Moneko Learning! Start with our essentials to build a solid foundation in personal finance."

// Wait 2 seconds, then go to Portfolio  
setTimeout(() => {
  window.location.href = '/dashboard/portfolio/';
}, 4000);
// Expected: Advisor agent says "Track your investments here! Connect your accounts or manually add positions to see your complete financial picture."
```

### Step 3: Test Lesson Completion Flow (CORRECT BEHAVIOR)

```javascript
// Test course completion guidance - this is the CORRECT flow
// 1. Navigate to a lesson page
window.location.href = '/dashboard/learning/basic-finance/lesson/budgeting-101';

// 2. Complete the entire lesson (answer all questions correctly)
// 3. Click "Continue Learning" in the completion modal
// 4. Get redirected to the course page (/dashboard/learning/basic-finance)
// 5. Expected: "Excellent work completing that lesson!" tooltip from educator

// IMPORTANT: This should NOT show on first visit to course page
// It only shows after completing a lesson and navigating back
```

### Step 4: Test Goal Creation Flow

```javascript
// Simulate coming from onboarding (set referrer flag manually if needed)
// Then create a goal and visit the goal detail page
// Expected: Advisor says "Congratulations on creating your first goal! Ask me anything about optimizing your savings strategy or investment options."
```

### Step 5: Test Time-Based Scenarios

```javascript
// Stay on dashboard main page and wait 30 seconds
// Expected: Educator may prompt "New to finance? Check out our learning section to master the basics before investing!"

// Or use AI chat then wait
// Expected: Chat usage tracked, fewer chat prompts in future
```

### Step 5: Test Frequency Controls

```javascript
// Set high frequency for more guidance
if (typeof window !== 'undefined') {
  const monitor = (await import('@/utils/dashboard-guidance-monitor')).dashboardGuidanceMonitor;
  monitor.updatePreferences({ frequencyLevel: 'high' });
}

// Set low frequency for minimal guidance
if (typeof window !== 'undefined') {
  const monitor = (await import('@/utils/dashboard-guidance-monitor')).dashboardGuidanceMonitor;
  monitor.updatePreferences({ frequencyLevel: 'low' });
}
```

### Step 6: Debug Guidance State

```javascript
// Check current guidance statistics
if (typeof window !== 'undefined') {
  const monitor = (await import('@/utils/dashboard-guidance-monitor')).dashboardGuidanceMonitor;
  console.log('Guidance Stats:', monitor.getGuidanceStats());
  
  // Output will show:
  // {
  //   totalVisits: 15,
  //   routesVisited: 4,
  //   scenariosShown: 3,
  //   userJourney: {
  //     hasCreatedGoal: true,
  //     hasUsedChat: false,
  //     hasViewedLearning: true,
  //     hasViewedPortfolio: false
  //   }
  // }
}
```

## 🎭 Test Different User Personas

### Experienced User (Should see minimal guidance)

```javascript
localStorage.setItem('dashboard-guidance-state', JSON.stringify({
  totalVisits: 50,
  routeVisits: {
    '/dashboard/': 20,
    '/dashboard/tracker/': 15,
    '/dashboard/learning/': 10,
    '/dashboard/portfolio/': 5
  },
  lastVisits: {
    '/dashboard/': Date.now() - (24 * 60 * 60 * 1000), // 1 day ago
    '/dashboard/tracker/': Date.now() - (48 * 60 * 60 * 1000), // 2 days ago
  },
  scenariosShown: {
    'tracker_main_first_visit': { count: 1, lastShown: Date.now() - (7 * 24 * 60 * 60 * 1000) },
    'learning_first_visit': { count: 1, lastShown: Date.now() - (5 * 24 * 60 * 60 * 1000) }
  },
  userJourney: {
    hasCreatedGoal: true,
    hasUsedChat: true,
    hasViewedLearning: true,
    hasViewedPortfolio: true
  },
  preferences: {
    guidanceEnabled: true,
    frequencyLevel: 'medium'
  }
}));

window.location.reload();
// Expected: Very few or no tooltips shown
```

### Returning User (Some targeted guidance)

```javascript
localStorage.setItem('dashboard-guidance-state', JSON.stringify({
  totalVisits: 5,
  routeVisits: {
    '/dashboard/': 3,
    '/dashboard/tracker/': 2
  },
  lastVisits: {
    '/dashboard/': Date.now() - (72 * 60 * 60 * 1000), // 3 days ago
  },
  scenariosShown: {},
  userJourney: {
    hasCreatedGoal: true,
    hasUsedChat: false,
    hasViewedLearning: false,
    hasViewedPortfolio: false
  },
  preferences: {
    guidanceEnabled: true,
    frequencyLevel: 'medium'
  }
}));

window.location.reload();
// Expected: Re-engagement tooltips, learning prompts
```

## 🔍 Monitoring & Debugging

### Enable Console Logging

Add this to see guidance decisions in real-time:

```javascript
// In browser console
window.guidanceDebug = true;

// Then navigate around to see guidance logic
```

### Check Tooltip Behavior

```javascript
// Manually trigger tooltip
const sidebar = document.querySelector('[data-testid="right-sidebar"]'); // adjust selector
if (sidebar && sidebar._reactInternalInstance) {
  // Get React component reference and trigger tooltip
  // This would depend on your specific implementation
}

// Or use the ref directly if available
if (window.rightSidebarRef?.current) {
  window.rightSidebarRef.current.showTooltip('advisor', 'Test message!', 'left');
}
```

### Verify SSR Safety

```javascript
// This should work without errors in both SSR and client
const guidance = await import('@/hooks/useDashboardGuidance');
console.log('Hook imported successfully');

// Check that no window-dependent code runs on server
if (typeof window === 'undefined') {
  console.log('SSR environment - guidance should be disabled');
} else {
  console.log('Client environment - guidance should be active');
}
```

## 🎯 Expected Guidance Scenarios

### Route-Based Guidance
- `/dashboard/tracker/` (first visit) → Tracker agent welcome
- `/dashboard/learning/` (first visit) → Educator welcome  
- `/dashboard/portfolio/` (first visit) → Advisor account setup
- `/dashboard/chat/` (first visit) → Advisor introduction
- `/dashboard/` (idle 30s) → Feature discovery prompts

### Behavior-Based Guidance
- Goal creation → Congratulations from advisor
- Chat usage → Tracked, reduces future chat prompts
- Learning activity → Tracked, enables advanced suggestions
- Long absence → Re-engagement messages

### Smart Timing
- Only one tooltip at a time
- Respects cooldown periods (24h-7days depending on scenario)
- Frequency level affects probability of showing
- Max show counts prevent annoyance

## 🚨 Troubleshooting

### No Tooltips Showing
```javascript
// Check if guidance is enabled
const state = JSON.parse(localStorage.getItem('dashboard-guidance-state') || '{}');
console.log('Guidance enabled:', state.preferences?.guidanceEnabled);

// Check if sidebar ref is working
console.log('Sidebar ref:', window.rightSidebarRef?.current);

// Reset and try again
localStorage.removeItem('dashboard-guidance-state');
window.location.reload();
```

### SSR Errors
- Ensure all window/document access is wrapped in `typeof window !== 'undefined'`
- localStorage operations should be client-side only
- No DOM manipulation during SSR

### Performance Issues
- Guidance evaluation runs max every 30 seconds
- LocalStorage is debounced
- Use browser dev tools to monitor performance impact

The system is now fully SSR-safe and ready for production testing! 🚀