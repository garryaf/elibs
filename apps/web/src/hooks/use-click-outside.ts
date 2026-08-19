import { useEffect, useRef } from "react";

/**
 * Custom hook to detect clicks outside a referenced element and handle Escape key presses.
 *
 * @param handler - Callback function invoked on outside click or Escape key press.
 * @param active  - Whether the listeners should be attached (typically when dropdown/modal is open).
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  handler: () => void,
  active: boolean = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handler, active]);

  return ref;
}
