"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

export interface MediaQueryData {
  /** Screen width in pixels (equivalent to MediaQuery.of(context).size.width in Flutter) */
  width: number;
  /** Screen height in pixels (equivalent to MediaQuery.of(context).size.height in Flutter) */
  height: number;
  /** Width percentage helper: returns px value for given percent (0-100) */
  wp: (percent: number) => number;
  /** Height percentage helper: returns px value for given percent (0-100) */
  hp: (percent: number) => number;

  /** Breakpoint booleans */
  isSmallPhone: boolean; // <= 380px (e.g., iPhone SE, Galaxy Mini)
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768px - 1023px
  isDesktop: boolean; // >= 1024px
  isLargeScreen: boolean; // >= 1280px

  /** Orientation (equivalent to MediaQuery.of(context).orientation in Flutter) */
  orientation: "portrait" | "landscape";
  isPortrait: boolean;
  isLandscape: boolean;

  /** Standalone / PWA Mode (running as installed app from homescreen) */
  isPWA: boolean;
  isStandalone: boolean;

  /** Platform detection */
  isIOS: boolean;
  isAndroid: boolean;

  /** Device Pixel Ratio */
  devicePixelRatio: number;
}

const DEFAULT_MEDIA_QUERY: MediaQueryData = {
  width: 390,
  height: 844,
  wp: (p: number) => (390 * p) / 100,
  hp: (p: number) => (844 * p) / 100,
  isSmallPhone: false,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isLargeScreen: false,
  orientation: "portrait",
  isPortrait: true,
  isLandscape: false,
  isPWA: false,
  isStandalone: false,
  isIOS: false,
  isAndroid: false,
  devicePixelRatio: 1,
};

/**
 * Custom hook providing reactive screen dimensions, breakpoints, safe orientation,
 * and PWA status mimicking Flutter's `MediaQuery.of(context)`.
 */
export function useMediaQuery(): MediaQueryData {
  const [data, setData] = useState<MediaQueryData>(DEFAULT_MEDIA_QUERY);

  const calculateMediaQuery = useCallback((): MediaQueryData => {
    if (typeof window === "undefined") {
      return DEFAULT_MEDIA_QUERY;
    }

    const width = window.innerWidth || document.documentElement.clientWidth || 390;
    const height = window.innerHeight || document.documentElement.clientHeight || 844;

    const isSmallPhone = width <= 380;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isLargeScreen = width >= 1280;

    const orientation = width > height ? "landscape" : "portrait";
    const isPortrait = orientation === "portrait";
    const isLandscape = orientation === "landscape";

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    const userAgent = window.navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(userAgent);
    const devicePixelRatio = window.devicePixelRatio || 1;

    return {
      width,
      height,
      wp: (percent: number) => (width * percent) / 100,
      hp: (percent: number) => (height * percent) / 100,
      isSmallPhone,
      isMobile,
      isTablet,
      isDesktop,
      isLargeScreen,
      orientation,
      isPortrait,
      isLandscape,
      isPWA: isStandalone,
      isStandalone,
      isIOS,
      isAndroid,
      devicePixelRatio,
    };
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setData(calculateMediaQuery());
    };

    handleUpdate();

    window.addEventListener("resize", handleUpdate, { passive: true });
    window.addEventListener("orientationchange", handleUpdate, { passive: true });

    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    try {
      standaloneMedia.addEventListener("change", handleUpdate);
    } catch {
      // Fallback for older Safari
      standaloneMedia.addListener?.(handleUpdate);
    }

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("orientationchange", handleUpdate);
      try {
        standaloneMedia.removeEventListener("change", handleUpdate);
      } catch {
        standaloneMedia.removeListener?.(handleUpdate);
      }
    };
  }, [calculateMediaQuery]);

  return data;
}

export default useMediaQuery;
