"use client";

import { useEffect, useRef } from "react";

/**
 * Hook that traps keyboard focus within a container element.
 * - Tab/Shift+Tab cycles within focusable elements
 * - Focus wraps from last to first and vice versa
 * - Initial focus on first focusable element (only once on open)
 * - Escape key calls onEscape callback
 */
export function useFocusTrap(isActive: boolean, onEscape?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onEscapeRef = useRef(onEscape);
  const hasInitialFocusRef = useRef(false);

  // Keep onEscape ref up-to-date without triggering effect re-runs
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  // Reset initial focus flag when modal closes
  useEffect(() => {
    if (!isActive) {
      hasInitialFocusRef.current = false;
    }
  }, [isActive]);

  // Set initial focus only once when modal opens
  useEffect(() => {
    if (!isActive || !containerRef.current || hasInitialFocusRef.current) return;

    hasInitialFocusRef.current = true;
    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 50);
    }
  }, [isActive]);

  // Keydown handler for Tab trapping and Escape — stable, no deps that change on typing
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}
