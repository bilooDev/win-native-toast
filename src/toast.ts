import { EventEmitter } from 'events';
import { Bridge, getBridge, BridgeOptions } from './bridge.js';
import { ProgressAPI } from './progress.js';
import type {
  ToastOptions,
  ToastUpdateOptions,
  ChannelOptions,
  ScheduleOptions,
  ToastMiddleware,
  ActionEventPayload,
  ClickEventPayload,
  DismissedEventPayload,
  FailedEventPayload,
  DialogResultEventPayload,
} from './types.js';
import {
  applyDefaults,
  resolveImagePaths,
  validateOptions,
  serializeDate,
} from './utils.js';

/**
 * Toast initialization options
 */
export interface ToastInitOptions extends BridgeOptions {
  /** Application User Model ID (required for action callbacks) */
  appId?: string;
  /** Base path for resolving relative image paths */
  basePath?: string;
}

/**
 * Main Toast notification manager
 */
export class Toast extends EventEmitter {
  private bridge: Bridge;
  private _progress: ProgressAPI;
  private middlewares: ToastMiddleware[] = [];
  private channels = new Map<string, ChannelOptions>();
  private defaultAppId?: string;
  private basePath?: string;
  private initialized = false;

  constructor(options: ToastInitOptions = {}) {
    super();
    this.bridge = getBridge(options);
    this._progress = new ProgressAPI(this.bridge);
    this.defaultAppId = options.appId;
    this.basePath = options.basePath;

    this.setupEventForwarding();
  }

  /**
   * Progress notification API
   */
  get progress(): ProgressAPI {
    return this._progress;
  }

  /**
   * Initialize the toast system
   * Call this before showing notifications for guaranteed readiness
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.bridge.start();
    this.initialized = true;
  }

  /**
   * Show a toast notification
   * @param options Toast options
   * @returns The notification ID
   */
  async show(options: ToastOptions): Promise<string> {
    // Ensure bridge is started
    await this.ensureReady();

    // Apply middleware
    let processed = { ...options };
    for (const middleware of this.middlewares) {
      const result = middleware(processed);
      if (result) processed = result;
    }

    // Apply defaults
    processed = applyDefaults(processed);

    // Resolve image paths
    processed = resolveImagePaths(processed, this.basePath);

    // Apply default appId
    if (!processed.appId && this.defaultAppId) {
      processed.appId = this.defaultAppId;
    }

    // Serialize dates
    if (processed.timestamp) {
      processed.timestamp = serializeDate(processed.timestamp);
    }

    // Validate
    validateOptions(processed);

    // Send to bridge
    this.bridge.send('show', processed.id, processed);

    return processed.id!;
  }

  /**
   * Update an existing toast notification
   * @param id Notification ID
   * @param options Update options
   */
  async update(id: string, options: ToastUpdateOptions): Promise<void> {
    await this.ensureReady();
    this.bridge.send('update', id, options);
  }

  /**
   * Dismiss a toast notification
   * @param id Notification ID
   */
  async dismiss(id: string): Promise<void> {
    await this.ensureReady();

    // Also cancel progress if exists
    if (this._progress.has(id)) {
      this._progress.cancel(id);
    }

    this.bridge.send('dismiss', id);
  }

  /**
   * Dismiss all toast notifications
   */
  async dismissAll(): Promise<void> {
    await this.ensureReady();
    this._progress.clear();
    this.bridge.send('dismiss-all');
  }

  /**
   * Dismiss all toasts in a group
   * @param group Group identifier
   */
  async dismissGroup(group: string): Promise<void> {
    await this.ensureReady();
    this.bridge.send('dismiss-group', undefined, { group });
  }

  /**
   * Create a notification channel
   * @param options Channel configuration
   */
  async createChannel(options: ChannelOptions): Promise<void> {
    await this.ensureReady();
    this.channels.set(options.id, options);
    this.bridge.send('create-channel', options.id, options);
  }

  /**
   * Schedule a notification for later
   * @param options Schedule options including the `at` timestamp
   * @returns The notification ID
   */
  async schedule(options: ScheduleOptions): Promise<string> {
    await this.ensureReady();

    const processed = applyDefaults(options);

    // Convert Date to timestamp
    const at = options.at instanceof Date ? options.at.getTime() : options.at;

    this.bridge.send('schedule', processed.id, {
      ...processed,
      at,
    });

    return processed.id!;
  }

  /**
   * Cancel a scheduled notification
   * @param id Notification ID
   */
  async cancelSchedule(id: string): Promise<void> {
    await this.ensureReady();
    this.bridge.send('cancel-schedule', id);
  }

  /**
   * Add a middleware function
   * @param fn Middleware function
   */
  use(fn: ToastMiddleware): void {
    this.middlewares.push(fn);
  }

  /**
   * Create a toast instance bound to a specific appId
   * @param appId Application User Model ID
   */
  withApp(appId: string): BoundToast {
    return new BoundToast(this, appId);
  }

  /**
   * Enable debug mode
   * @param enabled Whether to enable debug logging
   */
  debug(enabled: boolean): void {
    this.bridge.setDebug(enabled);
  }

  /**
   * Shut down the toast system
   */
  shutdown(): void {
    this.bridge.stop();
    this._progress.clear();
    this.initialized = false;
  }

  /**
   * Check if toast system is ready
   */
  get isReady(): boolean {
    return this.bridge.ready;
  }

  /**
   * Ensure bridge is ready
   */
  private async ensureReady(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Set up event forwarding from bridge
   */
  private setupEventForwarding(): void {
    this.bridge.on('action', (payload: ActionEventPayload) => {
      // Check if this is a progress button
      if (this._progress.handleAction(payload.id, payload.action)) {
        // Still emit the event for user tracking
      }
      this.emit('action', payload);
    });

    this.bridge.on('click', (payload: ClickEventPayload) => {
      this.emit('click', payload);
    });

    this.bridge.on('dismissed', (payload: DismissedEventPayload) => {
      // Don't cancel progress — user might call resume/update after dismissing
      // Progress state is only cleaned up on explicit cancel() or complete()
      if (this._progress.has(payload.id)) {
        this._progress.handleDismissed(payload.id);
      }
      this.emit('dismissed', payload);
    });

    this.bridge.on('dialog-result', (payload: any) => {
      // Handle cancel confirmation dialog result.
      // The user dismissed the toast and then chose an action from the dialog.
      if (this._progress.has(payload.id)) {
        if (payload.action === 'resume') {
          // If status is 'paused', the user wants to resume the download.
          // If status is 'active', just reopen the toast in its current state.
          const status = this._progress.getStatus(payload.id);
          if (status === 'paused') {
            this._progress.resume(payload.id);
          } else {
            this._progress.reOpen(payload.id);
          }
        } else if (payload.action === 'cancel') {
          this._progress.cancel(payload.id);
        }
      }
      this.emit('dialog-result', payload);
    });

    this.bridge.on('failed', (payload: FailedEventPayload) => {
      this.emit('failed', payload);
    });

    this.bridge.on('ready', () => {
      this.emit('ready');
    });

    this.bridge.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }
}

/**
 * Toast instance bound to a specific appId
 */
class BoundToast {
  constructor(
    private toast: Toast,
    private appId: string
  ) { }

  async show(options: ToastOptions): Promise<string> {
    return this.toast.show({ ...options, appId: this.appId });
  }

  async update(id: string, options: ToastUpdateOptions): Promise<void> {
    return this.toast.update(id, options);
  }

  async dismiss(id: string): Promise<void> {
    return this.toast.dismiss(id);
  }

  get progress(): ProgressAPI {
    return this.toast.progress;
  }
}

// Export types for event handlers
export type {
  ActionEventPayload,
  ClickEventPayload,
  DismissedEventPayload,
  FailedEventPayload,
  DialogResultEventPayload,
};