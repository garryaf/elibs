import { useEffect } from "react";

interface ShortcutOptions {
  ctrlCmd?: boolean;
  alt?: boolean;
  shift?: boolean;
  preventDefault?: boolean;
}

/**
 * A hook to easily bind keyboard shortcuts to a callback.
 * 
 * @param key The key to listen for (e.g. "k", "Escape", "Enter")
 * @param callback The function to execute when the shortcut is triggered
 * @param options Configuration for modifier keys and default behavior
 */
export function useShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check modifiers
      const ctrlCmdMatch = options.ctrlCmd ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const altMatch = options.alt ? e.altKey : !e.altKey;
      const shiftMatch = options.shift ? e.shiftKey : !e.shiftKey;

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        ctrlCmdMatch &&
        altMatch &&
        shiftMatch
      ) {
        if (options.preventDefault !== false) {
          e.preventDefault();
        }
        callback(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, options]);
}
