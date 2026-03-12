import { useState, useEffect } from "react";

export enum DeviceType {
  MOBILE = "mobile",
  TABLET = "tablet",
  DESKTOP = "desktop",
}

const BREAKPOINTS = {
  MOBILE: 640, // Phones
  TABLET: 1024, // Tablets and small desktops
};

/**
 * Custom hook that detects the current device type based on viewport width
 * @returns Object containing the current device type and a boolean indicating if it's a mobile device
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>(DeviceType.DESKTOP);

  const isMobile = deviceType === DeviceType.MOBILE;
  const isTablet = deviceType === DeviceType.TABLET;
  const isDesktop = deviceType === DeviceType.DESKTOP;

  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      const width = window.innerWidth;
      let newDeviceType: DeviceType;

      if (width < BREAKPOINTS.MOBILE) {
        newDeviceType = DeviceType.MOBILE;
      } else if (width < BREAKPOINTS.TABLET) {
        newDeviceType = DeviceType.TABLET;
      } else {
        newDeviceType = DeviceType.DESKTOP;
      }

      setDeviceType((currentType) =>
        currentType === newDeviceType ? currentType : newDeviceType,
      );
    };

    // Set initial device type based on current window size
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { deviceType, isMobile, isTablet, isDesktop };
};
