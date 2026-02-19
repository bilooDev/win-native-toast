/**
 * win-native-toast
 * Production-grade Windows toast notifications for Node.js
 *
 * @packageDocumentation
 */

import { Toast, ToastInitOptions } from './toast.js';

// Create singleton instance
const toast = new Toast();

// Export singleton as default
export default toast;

// Named export for explicit imports
export { toast };

// Export Toast class for custom instances
export { Toast } from './toast.js';
export type { ToastInitOptions } from './toast.js';

// Export Progress API
export { ProgressAPI } from './progress.js';

// Export Bridge for advanced usage
export { Bridge, getBridge, resetBridge } from './bridge.js';
export type { BridgeOptions } from './bridge.js';

// Export all types
export type {
  // Toast options
  ToastOptions,
  ToastUpdateOptions,
  ToastButton,
  ToastInput,
  ToastDuration,
  ButtonStyle,
  InputType,
  SelectionOption,

  // Progress
  ProgressOptions,
  ProgressStartOptions,
  ProgressCompleteOptions,
  ProgressState,

  // Channels & Scheduling
  ChannelOptions,
  ScheduleOptions,

  // Events
  ActionEventPayload,
  ClickEventPayload,
  DismissedEventPayload,
  FailedEventPayload,
  DismissReason,
  BaseEventPayload,
  ToastEvents,

  // IPC Protocol
  IPCCommand,
  IPCMessage,
  IPCEvent,
  IPCEventType,
  IPCShowMessage,
  IPCUpdateMessage,
  IPCDismissMessage,
  IPCProgressMessage,
  IPCActionEvent,
  IPCClickEvent,
  IPCDismissedEvent,
  IPCFailedEvent,
  IPCReadyEvent,
  IPCErrorEvent,

  // Middleware
  ToastMiddleware,
} from './types.js';

// Export protocol version
export { PROTOCOL_VERSION } from './types.js';

// Export utilities
export {
  generateId,
  applyDefaults,
  resolveImagePath,
  resolveImagePaths,
  clampProgress,
  validateOptions,
  isWindows,
} from './utils.js';
