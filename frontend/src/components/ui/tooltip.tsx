"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lightweight hover tooltip, portaled to document.body and positioned from
 * the trigger's bounding rect. Native `title` attributes are slow to
 * appear and a CSS-only absolutely-positioned tooltip gets clipped by any
 * ancestor with `overflow-hidden` (e.g. the room matrix's scroll card) -
 * portaling sidesteps both problems.
 */
export function Tooltip({ label, children, className, style }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  function handleShow() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setIsVisible(true);
  }

  return (
    <span
      ref={triggerRef}
      style={style}
      className={`inline-flex ${className ?? ""}`}
      onMouseEnter={handleShow}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={handleShow}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
            style={{ top: coords.top - 8, left: coords.left }}
          >
            {label}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
          </span>,
          document.body,
        )}
    </span>
  );
}
