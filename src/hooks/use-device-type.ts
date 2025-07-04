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
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === "undefined") {
      return DeviceType.DESKTOP;
    }

    const width = window.innerWidth;
    if (width < BREAKPOINTS.MOBILE) {
      return DeviceType.MOBILE;
    }
    if (width < BREAKPOINTS.TABLET) {
      return DeviceType.TABLET;
    }
    return DeviceType.DESKTOP;
  });

  const isMobile = deviceType === DeviceType.MOBILE;
  const isTablet = deviceType === DeviceType.TABLET;
  const isDesktop = deviceType === DeviceType.DESKTOP;

  useEffect(() => {
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

      if (newDeviceType !== deviceType) {
        setDeviceType(newDeviceType);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.innerWidth]);

  return { deviceType, isMobile, isTablet, isDesktop };
};
