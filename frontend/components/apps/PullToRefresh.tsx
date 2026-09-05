"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
  maxPullDistance?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  pullThreshold = 65,
  maxPullDistance = 110,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);

  // Check if scroll is at the very top of container or window
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return true;
    const element = containerRef.current;

    // Check element scroll or window scroll
    const scrollTop = element.scrollTop || window.scrollY || document.documentElement.scrollTop || 0;
    return scrollTop <= 1;
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (isAtTop()) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (!isAtTop()) {
      if (pullDistance > 0) setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const dy = currentY - startYRef.current;
    const dx = Math.abs(currentX - startXRef.current);

    // Only activate if dragging downward and mostly vertical
    if (dy > 8 && dy > dx) {
      isPullingRef.current = true;
      setIsDragging(true);

      // Dampened pull resistance curve
      const resistance = Math.min(maxPullDistance, Math.pow(dy, 0.82) * 1.6);
      setPullDistance(resistance);

      // Prevent native overscroll when dragging down
      if (e.cancelable && dy > 10) {
        e.preventDefault();
      }
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
    if (!isPullingRef.current || isRefreshing) return;
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
            opacity: pullDistance > 10 ? Math.min(1, pullDistance / 35) : 0,
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

      {/* Centered Floating Loading Screen Overlay (Center Atas, Bawah, Kiri, Kanan tanpa background putih) */}
      {isRefreshing && !isSuccess && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[3px] pointer-events-none transition-all duration-300 animate-fadeIn">
          <div className="flex flex-col items-center justify-center space-y-3 scale-100">
            {/* Floating naik turun kanan kiri app/icon.png */}
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
