"use client";

import React, { useState, useRef, useCallback } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  pullThreshold = 85,
  maxPullDistance = 120,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const isBlockedRef = useRef(false);

  // Helper: Check if any modal dialog / popup overlay is currently active in the document
  const isModalActive = useCallback(() => {
    if (typeof document === "undefined") return false;
    // Look for fixed overlays that are not the pull-to-refresh loader itself
    const activeModals = document.querySelectorAll(
      ".fixed.inset-0:not([data-ptr-loader]), [role='dialog'], [aria-modal='true']"
    );
    return activeModals.length > 0;
  }, []);

  // Helper: Check if the touch target originated from inside a form, input, or modal element
  const isTargetInsideModalOrForm = useCallback((target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        ".fixed, [role='dialog'], [aria-modal='true'], form, input, textarea, select, button, label, [data-prevent-pull='true']"
      )
    );
  }, []);

  // Check if scroll is at the very top of container or window
  const isAtTop = useCallback(() => {
    if (typeof window === "undefined") return true;
    const windowScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const containerScrollTop = containerRef.current ? containerRef.current.scrollTop : 0;
    return windowScrollTop <= 1 && containerScrollTop <= 1;
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || disabled) return;

    // Completely disable pull-to-refresh if a modal is open or touch started on form/modal
    if (isModalActive() || isTargetInsideModalOrForm(e.target)) {
      isBlockedRef.current = true;
      isPullingRef.current = false;
      return;
    }

    isBlockedRef.current = false;
    if (isAtTop()) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing || disabled || isBlockedRef.current) return;

    // Double-check modal state during move
    if (isModalActive()) {
      if (pullDistance > 0) setPullDistance(0);
      isPullingRef.current = false;
      return;
    }

    if (!isAtTop()) {
      if (pullDistance > 0) setPullDistance(0);
      isPullingRef.current = false;
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const dy = currentY - startYRef.current;
    const dx = Math.abs(currentX - startXRef.current);

    // Intentional pull threshold: dy must exceed 28px and be primarily vertical (dy > dx * 1.5)
    if (dy > 28 && dy > dx * 1.5) {
      isPullingRef.current = true;
      setIsDragging(true);

      // Smooth, natural physical resistance
      const rawDistance = dy - 28;
      const resistance = Math.min(maxPullDistance, rawDistance * 0.48);
      setPullDistance(resistance);

      // Prevent native overscroll when dragging down
      if (e.cancelable && dy > 30) {
        e.preventDefault();
      }
    } else if (dy <= 0) {
      if (pullDistance > 0) setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setIsDragging(false);
    setPullDistance(pullThreshold);

    const startTime = Date.now();
    try {
      await onRefresh();
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 5000 - elapsed));
      }
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } catch (err) {
      console.error("Pull to refresh error:", err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 5000 - elapsed));
      }
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (isBlockedRef.current || !isPullingRef.current || isRefreshing || disabled) {
      isBlockedRef.current = false;
      return;
    }

    isPullingRef.current = false;
    setIsDragging(false);

    if (pullDistance >= pullThreshold) {
      await triggerRefresh();
    } else {
      // Smoothly snap back
      setPullDistance(0);
    }
  };

  // Progress ratio from 0 to 1
  const progress = Math.min(1, pullDistance / pullThreshold);
  const rotateDeg = Math.min(180, progress * 180);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative ${className}`}
    >
      {/* Animated Pull Indicator Banner (during drag) */}
      <div
        style={{
          height: `${pullDistance}px`,
          transition: isDragging ? "none" : "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="w-full overflow-hidden flex items-center justify-center pointer-events-none"
      >
        <div
          style={{
            opacity: pullDistance > 15 ? Math.min(1, (pullDistance - 10) / 30) : 0,
            transform: `scale(${Math.min(1, 0.75 + progress * 0.25)})`,
            transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="my-auto py-1.5 px-4 rounded-full bg-white/95 backdrop-blur-md shadow-lg shadow-cyan-500/10 border border-cyan-100 flex items-center gap-2.5 text-xs font-bold text-slate-700"
        >
          {isRefreshing ? (
            isSuccess ? (
              <>
                <span className="text-emerald-500 text-sm">✅</span>
                <span className="text-emerald-600 font-black">Data Berhasil Diperbarui</span>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon.png"
                  alt="Loading"
                  className="h-4 w-4 object-contain animate-spin"
                  style={{ animationDuration: "3s", animationTimingFunction: "linear" }}
                />
              </>
            )
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.png"
                alt="Pulling"
                style={{
                  transform: `rotate(${rotateDeg}deg)`,
                  transition: "transform 0.15s ease",
                }}
                className="h-4 w-4 object-contain"
              />
              <span className={progress >= 1 ? "text-cyan-600 font-black" : "text-slate-500"}>
                {progress >= 1
                  ? "Lepaskan untuk memuat data"
                  : "Tarik ke bawah untuk memuat data"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Centered Floating Loading Screen Overlay with data-ptr-loader tag */}
      {isRefreshing && !isSuccess && (
        <div
          data-ptr-loader="true"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[3px] pointer-events-none transition-all duration-300 animate-fadeIn"
        >
          <div className="flex flex-col items-center justify-center space-y-3 scale-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt="Loading"
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain animate-float-movement drop-shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {children}
    </div>
  );
}
