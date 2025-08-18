import { useCallback, useEffect, useState } from 'react';
import { driver } from 'driver.js';
import type { DriveStep, Driver, Config } from 'driver.js';
import { useCookie } from '@/utils/use-cookie';

export const useGoalTrackerWalkthrough = () => {
  const { getCookie, setCookie } = useCookie();
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  // Check if user has seen the walkthrough
  const hasSeenWalkthrough = getCookie('goal-tracker-walkthrough-seen') === 'true';

  // Define walkthrough steps
  const walkthroughSteps: DriveStep[] = [
    {
      element: '[data-tour="goal-title"]',
      popover: {
        title: 'Welcome! Let\'s Start with Your Goal Title',
        description: 'Welcome to Goal Tracker! Let\'s begin our tour. Click on your goal title or description to edit them inline. Make your goals clear and motivating!',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="current-savings"]',
      popover: {
        title: 'Current Progress',
        description: 'This shows your current savings amount and how much you need to reach your target goal.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="update-progress-btn"]',
      popover: {
        title: 'Update Progress',
        description: 'Click here to add new savings to your goal. Keep track of every contribution!',
        side: 'left'
      }
    },
    {
      element: '[data-tour="goal-summary-btn"]',
      popover: {
        title: 'Goal Summary',
        description: 'View a detailed summary of your goal with projections and recommendations.',
        side: 'left'
      }
    },
    {
      element: '[data-tour="progress-bar"]',
      popover: {
        title: 'Visual Progress',
        description: 'Watch your progress grow! This bar shows how close you are to achieving your goal.',
        side: 'top'
      }
    },
    {
      element: '[data-tour="key-metrics"]',
      popover: {
        title: 'Key Metrics',
        description: 'Track important details like your start date, target amount, timeline, and current progress percentage.',
        side: 'top'
      }
    },
    {
      element: '[data-tour="tab-navigation"]',
      popover: {
        title: 'Navigation Tabs',
        description: 'Explore different aspects of your goal: Quick Actions for milestones, Analytics for insights, Fine-tune for projections, and Activity for history.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="quick-actions-tab"]',
      popover: {
        title: 'Quick Actions',
        description: 'Manage your goal milestones here. Create, update, and check off important steps toward your goal.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="analytics-tab"]',
      popover: {
        title: 'AI Analytics',
        description: 'Get AI-powered insights about your goal. View your personalized strategy and receive smart recommendations.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="fine-tune-tab"]',
      popover: {
        title: 'Fine-tune',
        description: 'Adjust your goal parameters and see how changes affect your savings projection in real-time.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="activity-tab"]',
      popover: {
        title: 'Activity Timeline',
        description: 'Review your progress history and see all your goal-related activities in chronological order.',
        side: 'bottom'
      }
    }
  ];

  // Driver.js configuration using official options
  const driverConfig: Config = {
    steps: walkthroughSteps,
    showProgress: true,
    showButtons: ['next', 'previous'],
    nextBtnText: 'Next →',
    prevBtnText: '← Previous',
    doneBtnText: 'Got it!',
    progressText: 'Step {{current}} of {{total}}',
    animate: true,
    smoothScroll: true,
    allowClose: false,
    allowKeyboardControl: true,
    overlayOpacity: 0.5,
    stagePadding: 10,
    stageRadius: 5,
    popoverOffset: 10,
    disableActiveInteraction: false,
    onDestroyed: () => {
      setIsWalkthroughActive(false);
    },
    onHighlightStarted: () => {
      setIsWalkthroughActive(true);
    },
    onPopoverRender: (popover, { driver }) => {
      // Add skip button using official DOM structure
      const skipButton = document.createElement('button');
      skipButton.innerHTML = 'Skip tour';
      skipButton.style.cssText = `
        background: none;
        border: none;
        color: #666;
        font-size: 12px;
        text-decoration: underline;
        cursor: pointer;
        padding: 8px 0;
        margin-top: 8px;
        width: 100%;
        text-align: center;
      `;
      skipButton.addEventListener('click', () => {
        driver.destroy();
      });
      
      // Use the official popover DOM structure
      if (popover.wrapper) {
        popover.wrapper.appendChild(skipButton);
      }
    }
  };

  // Initialize driver instance
  useEffect(() => {
    // Driver.js 1.x requires steps to be passed during initialization
    const instance = driver(driverConfig);
    setDriverInstance(instance);

    return () => {
      instance?.destroy();
    };
  }, []);

  // Start walkthrough
  const startWalkthrough = useCallback(() => {
    if (!driverInstance) return;

    setIsWalkthroughActive(true);
    // In Driver.js 1.x, steps are set during initialization, just call drive()
    driverInstance.drive();

    // Mark walkthrough as seen
    setCookie('goal-tracker-walkthrough-seen', 'true', { days: 365 });
  }, [driverInstance, setCookie]);

  // Reset walkthrough (for testing/demo purposes)
  const resetWalkthrough = useCallback(() => {
    setCookie('goal-tracker-walkthrough-seen', 'false', { days: -1 });
  }, [setCookie]);

  // Auto-start walkthrough for new users
  const autoStartWalkthrough = useCallback(() => {
    if (!hasSeenWalkthrough && driverInstance && !isWalkthroughActive) {
      // Add a small delay to ensure DOM elements are ready
      setTimeout(() => {
        startWalkthrough();
      }, 1000);
    }
  }, [hasSeenWalkthrough, driverInstance, isWalkthroughActive, startWalkthrough]);

  return {
    startWalkthrough,
    resetWalkthrough,
    autoStartWalkthrough,
    hasSeenWalkthrough,
    isWalkthroughActive,
    driverInstance
  };
};