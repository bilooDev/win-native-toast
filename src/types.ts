/**
 * IPC Protocol version for Node ↔ C# communication
 */
export const PROTOCOL_VERSION = 1;

// ============================================================================
// Toast Options
// ============================================================================

/**
 * Button style for toast actions
 */
export type ButtonStyle = 'default' | 'destructive';

/**
 * Toast duration behavior
 */
export type ToastDuration = 'short' | 'long' | 'persistent';

/**
 * Input type for interactive toasts
 */
export type InputType = 'text' | 'selection';

/**
 * Toast button configuration
 */
export interface ToastButton {
  /** Unique identifier for the button action */
  id: string;
  /** Display text for the button */
  text: string;
  /** Optional icon path */
  icon?: string;
  /** Button style */
  style?: ButtonStyle;
}

/**
 * Selection option for dropdown inputs
 */
export interface SelectionOption {
  id: string;
  content: string;
}

/**
 * Toast input field configuration
 */
export interface ToastInput {
  /** Unique identifier for the input */
  id: string;
  /** Input type */
  type: InputType;
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Default value */
  defaultValue?: string;
  /** Title/label for the input */
  title?: string;
  /** Selection options (required for selection type) */
  options?: SelectionOption[];
}

/**
 * Progress bar configuration
 */
export interface ProgressOptions {
  /** Progress value from 0 to 1 */
  value: number;
  /** Status text displayed below progress bar */
  status?: string;
  /** Show indeterminate progress animation */
  indeterminate?: boolean;
  /** Title for the progress section */
  title?: string;
  /** Value string override (e.g., "5/10 files") */
  valueStringOverride?: string;
}

/**
 * Main toast notification options
 */
export interface ToastOptions {
  /** Unique identifier for the toast (auto-generated if not provided) */
  id?: string;
  /** Main title text */
  title: string;
  /** Body message text */
  message?: string;
  /** Subtitle text (displayed below title) */
  subtitle?: string;

  // Images
  /** App logo image path (displayed in toast) */
  icon?: string;
  /** Hero image path (large image at top) */
  heroImage?: string;
  /** Override app logo */
  appLogo?: string;

  // Grouping
  /** Group identifier for batch operations */
  group?: string;
  /** Notification channel (Android-style) */
  channel?: string;
  /** Application User Model ID */
  appId?: string;

  // Behavior
  /** Suppress notification sound */
  silent?: boolean;
  /** Toast display duration */
  duration?: ToastDuration;
  /** Scenario hint for Windows */
  scenario?: 'default' | 'alarm' | 'reminder' | 'incomingCall';

  // Interactive elements
  /** Action buttons */
  buttons?: ToastButton[];
  /** Input fields */
  inputs?: ToastInput[];

  // Progress
  /** Progress bar configuration */
  progress?: ProgressOptions;

  // Advanced
  /** Raw XML override (power users) */
  xml?: string;
  /** Attribution text */
  attribution?: string;
  /** Timestamp to display */
  timestamp?: Date | string;
}

/**
 * Options for updating an existing toast
 */
export interface ToastUpdateOptions {
  title?: string;
  message?: string;
  subtitle?: string;
  progress?: Partial<ProgressOptions>;
  buttons?: ToastButton[];
  /** Suppress sound on update */
  silent?: boolean;
}

/**
 * Notification channel configuration
 */
export interface ChannelOptions {
  /** Unique channel identifier */
  id: string;
  /** Display name for the channel */
  name: string;
  /** Channel description */
  description?: string;
  /** Suppress sounds for this channel */
  silent?: boolean;
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Scheduled notification options
 */
export interface ScheduleOptions extends ToastOptions {
  /** Timestamp when notification should appear */
  at: number | Date;
}

// ============================================================================
// Progress API Options
// ============================================================================

/**
 * Options for starting a progress notification
 */
export interface ProgressStartOptions {
  /** Main title */
  title: string;
  /** Progress bar title (separate from main notification title) */
  progressTitle?: string;
  /** Body message shown while active */
  message?: string;
  /** Message shown when paused (default: 'Paused') */
  pausedMessage?: string;
  /** Initial progress value (0-1) */
  value?: number;
  /** Initial status text */
  status?: string;
  /** Show indeterminate progress */
  indeterminate?: boolean;
  /** Group identifier */
  group?: string;
  /** Notification channel */
  channel?: string;
  /** Application User Model ID */
  appId?: string;
  /** Custom active-state buttons (default: Pause + Cancel) */
  buttons?: ToastButton[];
  /** Custom paused-state buttons (default: Resume + Cancel) */
  pausedButtons?: ToastButton[];
  /** Automatically handle pause/resume/cancel button clicks (default: true) */
  autoHandlePauseResume?: boolean;
  /** Show native dialog when user dismisses/clicks the notification (default: false) */
  showCancelDialog?: boolean;
}

/**
 * Options for completing a progress notification
 */
export interface ProgressCompleteOptions {
  /** Show a success toast after completion */
  showSuccessToast?: boolean;
  /** Replace with a custom success toast */
  replaceWithSuccessToast?: boolean;
  /** Custom success title */
  successTitle?: string;
  /** Custom success message */
  successMessage?: string;
  /** Auto-dismiss delay in ms (default: 3000) */
  dismissDelay?: number;
}

// ============================================================================
// Event Payloads
// ============================================================================

/**
 * Reason for toast dismissal
 */
export type DismissReason = 'user' | 'timeout' | 'programmatic' | 'application';

/**
 * Base event payload
 */
export interface BaseEventPayload {
  /** Toast identifier */
  id: string;
  /** Group identifier */
  group?: string;
  /** Application User Model ID */
  appId?: string;
}

/**
 * Action button click event
 */
export interface ActionEventPayload extends BaseEventPayload {
  /** Button action identifier */
  action: string;
  /** Input values (if toast had inputs) */
  inputs?: Record<string, string>;
}

/**
 * Toast body click event
 */
export interface ClickEventPayload extends BaseEventPayload {
  /** Input values (if toast had inputs) */
  inputs?: Record<string, string>;
}

/**
 * Toast dismissed event
 */
export interface DismissedEventPayload extends BaseEventPayload {
  /** Reason for dismissal */
  reason: DismissReason;
}

/**
 * Toast failed event
 */
export interface FailedEventPayload extends BaseEventPayload {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
}

/**
 * Dialog result event (from native cancel confirmation dialog)
 */
export interface DialogResultEventPayload extends BaseEventPayload {
  /** User's choice: 'resume' or 'cancel' */
  action: 'resume' | 'cancel';
  /** Download title */
  title?: string;
}

// ============================================================================
// IPC Protocol Types (Node ↔ C#)
// ============================================================================

/**
 * Commands sent from Node to C#
 */
export type IPCCommand =
  | 'show'
  | 'update'
  | 'dismiss'
  | 'dismiss-all'
  | 'dismiss-group'
  | 'progress-start'
  | 'progress-update'
  | 'progress-pause'
  | 'progress-resume'
  | 'progress-complete'
  | 'progress-cancel'
  | 'progress-reopen'
  | 'create-channel'
  | 'schedule'
  | 'cancel-schedule';

/**
 * Base IPC message structure
 */
export interface IPCMessage {
  /** Protocol version */
  protocol: number;
  /** Command type */
  cmd: IPCCommand;
  /** Toast/notification ID */
  id?: string;
  /** Command payload */
  payload?: unknown;
}

/**
 * IPC message for showing a toast
 */
export interface IPCShowMessage extends IPCMessage {
  cmd: 'show';
  payload: ToastOptions;
}

/**
 * IPC message for updating a toast
 */
export interface IPCUpdateMessage extends IPCMessage {
  cmd: 'update';
  id: string;
  payload: ToastUpdateOptions;
}

/**
 * IPC message for dismissing a toast
 */
export interface IPCDismissMessage extends IPCMessage {
  cmd: 'dismiss';
  id: string;
}

/**
 * IPC message for dismissing all toasts
 */
export interface IPCDismissAllMessage extends IPCMessage {
  cmd: 'dismiss-all';
}

/**
 * IPC message for dismissing a group
 */
export interface IPCDismissGroupMessage extends IPCMessage {
  cmd: 'dismiss-group';
  payload: { group: string };
}

/**
 * IPC message for progress operations
 */
export interface IPCProgressMessage extends IPCMessage {
  cmd: 'progress-start' | 'progress-update' | 'progress-pause' | 'progress-resume' | 'progress-complete' | 'progress-cancel';
  id: string;
  payload?: ProgressStartOptions | ProgressCompleteOptions | { value: number; status?: string };
}

/**
 * Events sent from C# to Node
 */
export type IPCEventType = 'action' | 'click' | 'dismissed' | 'failed' | 'ready' | 'error' | 'dialog-result';

/**
 * IPC event structure from C#
 */
export interface IPCEvent {
  /** Event type */
  event: IPCEventType;
  /** Toast ID */
  id?: string;
  /** Event-specific data */
  [key: string]: unknown;
}

/**
 * Action event from C#
 */
export interface IPCActionEvent extends IPCEvent {
  event: 'action';
  id: string;
  action: string;
  inputs?: Record<string, string>;
  group?: string;
  appId?: string;
}

/**
 * Click event from C#
 */
export interface IPCClickEvent extends IPCEvent {
  event: 'click';
  id: string;
  inputs?: Record<string, string>;
  group?: string;
  appId?: string;
}

/**
 * Dismissed event from C#
 */
export interface IPCDismissedEvent extends IPCEvent {
  event: 'dismissed';
  id: string;
  reason: DismissReason;
  group?: string;
  appId?: string;
}

/**
 * Failed event from C#
 */
export interface IPCFailedEvent extends IPCEvent {
  event: 'failed';
  id: string;
  error: string;
  code?: string;
}

/**
 * Dialog result event from C#
 */
export interface IPCDialogResultEvent extends IPCEvent {
  event: 'dialog-result';
  id: string;
  action: 'resume' | 'cancel';
  title?: string;
}

/**
 * Ready event from C#
 */
export interface IPCReadyEvent extends IPCEvent {
  event: 'ready';
  capabilities?: string[];
}

/**
 * Error event from C#
 */
export interface IPCErrorEvent extends IPCEvent {
  event: 'error';
  error: string;
  fatal?: boolean;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal progress state tracking
 */
export interface ProgressState {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  value: number;
  options: ProgressStartOptions;
  pausedAt?: number;
  startedAt: number;
}

/**
 * Toast event map for type-safe event emitter
 */
export interface ToastEvents {
  action: ActionEventPayload;
  click: ClickEventPayload;
  dismissed: DismissedEventPayload;
  failed: FailedEventPayload;
  'dialog-result': DialogResultEventPayload;
  ready: void;
  error: Error;
}

/**
 * Middleware function type
 */
export type ToastMiddleware = (payload: ToastOptions) => ToastOptions | void;