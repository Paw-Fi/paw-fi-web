import ReactGA from 'react-ga4';

export const useAnalytics = () => {
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    ReactGA.event({
      action: eventName,
      category: parameters?.category || 'User Interaction',
      label: parameters?.label,
      value: parameters?.value,
      ...parameters
    });
  };

  const trackClick = (platform: string) => {
    ReactGA.event({
      category: 'Social Links',
      action: 'Click',
      label: platform,
    });
  };

  const trackPageView = (page: string, title?: string) => {
    ReactGA.send({ 
      hitType: "pageview", 
      page,
      title: title || document.title 
    });
  };

  return {
    trackEvent,
    trackClick,
    trackPageView
  };
};