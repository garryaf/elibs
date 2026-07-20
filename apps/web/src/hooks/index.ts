// Utility hooks
export { useDebounce } from './use-debounce';
export { useFocusTrap } from './use-focus-trap';
export { useLocalStorage } from './use-local-storage';
export { useMediaQuery } from './use-media-query';
export { useUnsavedChangesGuard } from './use-unsaved-changes-guard';

// Data-fetching hooks (deprecated — prefer @/services for new code)
export { useApi } from './use-api';
export { usePatients } from './use-patients';
export { useOrders, useOrder } from './use-orders';
export {
  useTests,
  useTestCategories,
  useLabQueue,
  useApprovalQueue,
  useLabSummary,
  useLabVolume,
} from './use-laboratory';
