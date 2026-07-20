"use client";

import { useState, useCallback } from "react";

/**
 * Hook that guards against accidentally discarding unsaved form changes.
 * Returns:
 * - isDirty: whether the form has been modified
 * - setDirty: function to mark form as dirty
 * - guardedClose: wraps the close handler — shows confirmation if dirty
 * - showConfirmDiscard: boolean to render discard confirmation UI
 * - confirmDiscard: call to actually close (after user confirms)
 * - cancelDiscard: call to cancel the close attempt
 * - reset: resets dirty and confirmation state
 */
export function useUnsavedChangesGuard(onClose: () => void) {
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  const setDirty = useCallback(() => setIsDirty(true), []);

  const guardedClose = useCallback(() => {
    if (isDirty) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowConfirmDiscard(false);
    setIsDirty(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => {
    setShowConfirmDiscard(false);
  }, []);

  const reset = useCallback(() => {
    setIsDirty(false);
    setShowConfirmDiscard(false);
  }, []);

  return {
    isDirty,
    setDirty,
    guardedClose,
    showConfirmDiscard,
    confirmDiscard,
    cancelDiscard,
    reset,
  };
}
