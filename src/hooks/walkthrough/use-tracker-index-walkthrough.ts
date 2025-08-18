import { useCallback, useEffect, useState } from 'react';
import { driver } from 'driver.js';
import type { DriveStep, Driver, Config } from 'driver.js';
import { useCookie } from '@/utils/use-cookie';

export const useTrackerIndexWalkthrough = () => {
  const { getCookie, setCookie } = useCookie();
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  // Check if user has seen the walkthrough
  const hasSeenWalkthrough = getCookie('tracker-index-walkthrough-seen') === 'true';

  // Define walkthrough steps
  const walkthroughSteps: DriveStep[] = [
    {
      element: '[data-tour="page-header"]',
      popover: {
        title: 'Welcome to Goal Tracker',
        description: 'This is your financial goals dashboard where you can track all your financial objectives with AI-powered insights.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="create-goal-btn"]',
      popover: {
        title: 'Create New Goals',
        description: 'Click here to create a new financial goal. Set your target amount, timeline, and let AI help you create a strategy.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="spotlight-section"]',
      popover: {
        title: 'Spotlight Section',
        description: 'Your most important goals appear here. Goals that need attention, are due soon, or making great progress get highlighted.',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="stats-bar"]',
      popover: {
        title: 'Progress Overview',
        description: 'Get a quick overview of all your goals - total count, active goals, completed goals, and overall progress percentage.',
        side: 'top'
      }
    },
    {
      element: '[data-tour="goals-list"]',
      popover: {
        title: 'All Your Goals',
        description: 'Browse all your financial goals here. Each goal shows progress, target amount, and current status. Click any goal to manage it.',
        side: 'top'
      }
    },
    {
      popover: {
        title: 'Ready to Start!',
        description: 'You\'re all set! Start by creating your first goal or explore the features. Remember, you can access this tour anytime from the menu.',
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
    setCookie('tracker-index-walkthrough-seen', 'true', { days: 365 });
  }, [driverInstance, setCookie]);

  // Reset walkthrough (for testing/demo purposes)
  const resetWalkthrough = useCallback(() => {
    setCookie('tracker-index-walkthrough-seen', 'false', { days: -1 });
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