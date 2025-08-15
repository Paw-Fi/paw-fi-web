# Goal Tracker Walkthrough Guide

This document explains the Driver.js walkthrough implementation for the Goal Tracker feature in Moneko.

## Overview

The walkthrough provides an interactive tour of the Goal Tracker page, helping users understand all the features available for managing their financial goals.

## Implementation Details

### Files Created/Modified:

1. **`src/hooks/use-goal-tracker-walkthrough.ts`** - Custom hook managing walkthrough state
2. **`src/styles/walkthrough.css`** - Custom styling for Driver.js popovers
3. **`src/routes/dashboard/tracker/$goalId.tsx`** - Added walkthrough integration
4. **`src/styles/main.css`** - Import walkthrough styles

### Hook Features:

- **Auto-start**: Automatically starts for new users (configurable via cookies)
- **Manual trigger**: "Take Tour" button in goal menu
- **State management**: Tracks walkthrough completion
- **Reset capability**: For testing/demo purposes

### Walkthrough Steps:

1. **Welcome Screen** - Interactive introduction to Goal Tracker features
2. **Goal Title & Description** - Inline editing capabilities  
3. **Current Progress** - Shows savings amount and remaining target
4. **Update Progress Button** - Add new savings contributions
5. **Goal Summary Button** - View detailed projections
6. **Progress Bar** - Visual representation of goal completion
7. **Key Metrics** - Start date, target, timeline, progress percentage
8. **Tab Navigation** - Overview of all available sections
9. **Quick Actions Tab** - Milestone management
10. **Analytics Tab** - AI insights and strategy
11. **Fine-tune Tab** - Projection adjustments
12. **Activity Tab** - Progress history
13. **Completion Screen** - Congratulations and next steps

### Enhanced Overlay & Styling Features:

- **Immersive Overlay** - Dark backdrop with blur effect for focus
- **Stage Highlighting** - Glowing cutout areas around target elements
- **Animated Highlighting** - Pulsing effects and gradient borders on focused elements
- **Welcome/Completion Screens** - Center-positioned with special animations
- **Dark/Light Theme Support** - Adapts to user's theme preference
- **Responsive Design** - Mobile-optimized popover sizing
- **Moneko Branding** - Custom gradient colors and smooth transitions
- **Advanced Animations** - Backdrop blur, gradient shifts, pulse effects

### Data Tour Attributes:

Elements are marked with `data-tour` attributes for Driver.js targeting:

```jsx
<div data-tour="goal-title">Goal Title</div>
<button data-tour="update-progress-btn">Update Progress</button>
<div data-tour="progress-bar">Progress Bar</div>
// ... etc
```

## Usage

### Auto-start (Default):
- Walkthrough automatically starts for users who haven't seen it
- Controlled by `goal-tracker-walkthrough-seen` cookie

### Manual Start:
1. Click the "⋮" menu button in the top-right
2. Select "Take Tour" 
3. Walkthrough begins immediately

### Reset (Development):
```javascript
const { resetWalkthrough } = useGoalTrackerWalkthrough();
resetWalkthrough(); // Clears the seen cookie
```

## Customization

### Adding New Steps:
1. Add `data-tour="step-id"` to target element
2. Add step configuration to `walkthroughSteps` array in hook
3. Update CSS if needed for special styling

### Modifying Styles:
- Edit `src/styles/walkthrough.css` for visual changes
- CSS variables control colors for easy theme adjustments
- Dark mode styles use `.dark` prefix

### Changing Auto-start Behavior:
- Modify `autoStartWalkthrough` logic in hook
- Adjust delay timing in `setTimeout`
- Change cookie expiration in `setCookie` calls

## Testing

1. **Reset walkthrough**: Clear browser cookies or use `resetWalkthrough()`
2. **Test mobile**: Verify popover positioning on small screens
3. **Test dark mode**: Ensure proper styling in both themes
4. **Test navigation**: Verify all steps are accessible and properly positioned

## Dependencies

- **driver.js**: Core walkthrough library
- **@tanstack/react-router**: Navigation integration
- **framer-motion**: Smooth animations (existing)
- **tailwindcss**: Styling framework (existing)

The walkthrough enhances user onboarding by providing contextual guidance for the Goal Tracker's powerful features, ensuring users can effectively manage their financial goals.