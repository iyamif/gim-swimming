"use client";

import React, { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableRowProps {
  id: string;
  isOpen: boolean;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onDelete: () => void;
  onClick: () => void;
  canSwipe?: boolean;
  deleteLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SwipeableRow({
  id,
  isOpen,
  onOpen,
  onClose,
  onDelete,
  onClick,
  canSwipe = true,
  deleteLabel = "Hapus",
  children,
  className = "",
}: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(isOpen ? -80 : 0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const currentOffset = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const hasMoved = useRef(false);

  useEffect(() => {
    setOffsetX(isOpen ? -80 : 0);
  }, [isOpen]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipe) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentOffset.current = isOpen ? -80 : 0;
    isHorizontal.current = null;
    hasMoved.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canSwipe || !isDragging) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontal.current) {
      hasMoved.current = true;
      const targetOffset = currentOffset.current + dx;
      const clamped = Math.min(0, Math.max(-95, targetOffset));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (!canSwipe || !isDragging) return;
    setIsDragging(false);

    if (isHorizontal.current) {
      if (offsetX < -35) {
        setOffsetX(-80);
        onOpen(id);
      } else {
        setOffsetX(0);
        onClose(id);
      }
    }
  };

  // Mouse / Pointer handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canSwipe) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentOffset.current = isOpen ? -80 : 0;
    isHorizontal.current = null;
    hasMoved.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canSwipe || !isDragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontal.current) {
      hasMoved.current = true;
      const targetOffset = currentOffset.current + dx;
      const clamped = Math.min(0, Math.max(-95, targetOffset));
      setOffsetX(clamped);
    }
  };

  const handleMouseUp = () => {
    if (!canSwipe || !isDragging) return;
    setIsDragging(false);

    if (isHorizontal.current) {
      if (offsetX < -35) {
        setOffsetX(-80);
        onOpen(id);
      } else {
        setOffsetX(0);
        onClose(id);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.stopPropagation();
      return;
    }
    if (isOpen) {
      e.stopPropagation();
      setOffsetX(0);
      onClose(id);
      return;
    }
    onClick();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl select-none ${className}`}
      onMouseLeave={() => isDragging && handleMouseUp()}
    >
      {/* Background Action: Red Delete Button revealed ONLY on left swipe */}
      {canSwipe && (
        <div
          style={{
            opacity: Math.max(0, Math.min(1, Math.abs(offsetX) / 35)),
            visibility: Math.abs(offsetX) > 3 ? "visible" : "hidden",
            pointerEvents: Math.abs(offsetX) > 30 ? "auto" : "none",
            transition: isDragging ? "none" : "opacity 0.2s ease, visibility 0.2s ease",
          }}
          className="absolute inset-y-0 right-0 w-20 flex items-center justify-center pr-1 z-0"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-[calc(100%-4px)] w-full my-auto rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white flex flex-col items-center justify-center gap-1 font-black text-[10px] shadow-sm active:scale-95 transition-transform cursor-pointer"
            title={deleteLabel}
          >
            <Trash2 size={18} />
            <span>{deleteLabel}</span>
          </button>
        </div>
      )}

      {/* Foreground Content Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative z-10 w-full cursor-pointer will-change-transform bg-white rounded-3xl"
      >
        {children}
      </div>
    </div>
  );
}
