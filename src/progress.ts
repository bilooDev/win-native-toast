import type { Bridge } from './bridge.js';
import type {
  ProgressStartOptions,
  ProgressCompleteOptions,
  ProgressState,
  ToastButton,
} from './types.js';
import { generateId, clampProgress } from './utils.js';

/**
 * Default active-state buttons
 */
const DEFAULT_ACTIVE_BUTTONS: ToastButton[] = [
  { id: 'pause', text: 'Pause' },
  { id: 'cancel', text: 'Cancel' },
];

/**
 * Default paused-state buttons
 */
const DEFAULT_PAUSED_BUTTONS: ToastButton[] = [
  { id: 'resume', text: 'Resume' },
  { id: 'cancel', text: 'Cancel' },
];

/**
 * Progress API for managing progress notifications
 */
export class ProgressAPI {
  private bridge: Bridge;
  private states = new Map<string, ProgressState>();

  constructor(bridge: Bridge) {
    this.bridge = bridge;
  }

  /**
   * Start a new progress notification.
   *
   * By default, clicking Pause/Resume/Cancel buttons is handled automatically.
   * Set autoHandlePauseResume: false to handle them yourself via the 'action' event.
   *
   * @example
   * const id = toast.progress.start({
   *   title: 'Downloading Update',
   *   message: 'Connecting...',
   *   pausedMessage: 'Download paused',
   *   appId: 'dz.gpro.delivery',
   * });
   */
  start(id: string, options: ProgressStartOptions): string;
  start(options: ProgressStartOptions): string;
  start(idOrOptions: string | ProgressStartOptions, maybeOptions?: ProgressStartOptions): string {
    let id: string;
    let options: ProgressStartOptions;

    if (typeof idOrOptions === 'string') {
      id = idOrOptions;
      options = maybeOptions!;
    } else {
      id = generateId();
      options = idOrOptions;
    }

    if (this.states.has(id)) {
      throw new Error(`Progress notification with id "${id}" already exists`);
    }

    const state: ProgressState = {
      id,
      status: 'active',
      value: options.value ?? 0,
      options,
      startedAt: Date.now(),
    };

    this.states.set(id, state);

    this.bridge.send('progress-start', id, {
      ...options,
      value: state.value,
      buttons: options.buttons ?? DEFAULT_ACTIVE_BUTTONS,
    });

    return id;
  }

  /**
   * Update progress value and/or status text
   */
  update(id: string, value: number): void;
  update(id: string, update: { value?: number; status?: string }): void;
  update(id: string, valueOrUpdate: number | { value?: number; status?: string }): void {
    const state = this.getState(id);

    if (state.status !== 'active') {
      throw new Error(`Cannot update progress "${id}" - status is ${state.status}`);
    }

    let payload: { value?: number; status?: string };

    if (typeof valueOrUpdate === 'number') {
      payload = { value: clampProgress(valueOrUpdate) };
    } else {
      payload = {
        ...valueOrUpdate,
        value: valueOrUpdate.value !== undefined ? clampProgress(valueOrUpdate.value) : undefined,
      };
    }

    if (payload.value !== undefined) {
      state.value = payload.value;
    }

    this.bridge.send('progress-update', id, payload);
  }

  /**
   * Pause a progress notification.
   * Re-shows it with pausedMessage and paused buttons (Resume + Cancel).
   */
  pause(id: string): void {
    const state = this.getState(id);

    if (state.status !== 'active') {
      throw new Error(`Cannot pause progress "${id}" - status is ${state.status}`);
    }

    state.status = 'paused';
    state.pausedAt = state.value;

    this.bridge.send('progress-pause', id, {
      buttons: state.options.pausedButtons ?? DEFAULT_PAUSED_BUTTONS,
      message: state.options.pausedMessage ?? 'Paused',
    });
  }

  /**
   * Resume a paused progress notification.
   * Re-shows it with original message and active buttons (Pause + Cancel).
   */
  resume(id: string): void {
    const state = this.getState(id);

    if (state.status !== 'paused') {
      throw new Error(`Cannot resume progress "${id}" - status is ${state.status}`);
    }

    state.status = 'active';
    delete state.pausedAt;

    this.bridge.send('progress-resume', id, {
      buttons: state.options.buttons ?? DEFAULT_ACTIVE_BUTTONS,
      message: state.options.message,
    });
  }

  /**
   * Mark progress as complete
   */
  complete(id: string, options?: ProgressCompleteOptions): void {
    const state = this.getState(id);

    if (state.status === 'completed' || state.status === 'cancelled') {
      throw new Error(`Progress "${id}" already ${state.status}`);
    }

    state.status = 'completed';
    state.value = 1;

    this.bridge.send('progress-complete', id, { ...options, value: 1 });

    const delay = options?.dismissDelay ?? 3000;
    setTimeout(() => this.states.delete(id), delay);
  }

  /**
   * Cancel a progress notification
   */
  cancel(id: string): void {
    const state = this.states.get(id);
    if (!state) return;
    if (state.status === 'completed' || state.status === 'cancelled') return;

    state.status = 'cancelled';
    this.bridge.send('progress-cancel', id);
    this.states.delete(id);
  }

  /**
   * Re-open a progress notification that was dismissed (by user swipe, timeout,
   * or programmatically). Restores the toast in its exact previous state —
   * paused or active — with the correct buttons and progress value.
   *
   * This is the correct method to call from a `dialog-result` resume action,
   * because the toast was swiped away (status stays 'active'), not paused via
   * pause() which is the only thing that sets status to 'paused'.
   */
  reOpen(id: string): number {
    const state = this.getState(id);

    if (state.status === 'completed' || state.status === 'cancelled') {
      throw new Error(`Cannot re-open progress "${id}" — it is already ${state.status}`);
    }

    this.bridge.send('progress-reopen', id, {
      isPaused: state.status === 'paused',
    });



    return this.getState(id).value;
  }

  getStatus(id: string): ProgressState['status'] {
    return this.getState(id).status;
  }

  has(id: string): boolean {
    return this.states.has(id);
  }

  getActiveIds(): string[] {
    return Array.from(this.states.entries())
      .filter(([, state]) => state.status === 'active')
      .map(([id]) => id);
  }

  /**
   * Called automatically by Toast when any action button is clicked.
   * Handles pause/resume/cancel automatically unless autoHandlePauseResume is false.
   */
  handleAction(id: string, action: string): boolean {
    const state = this.states.get(id);
    if (!state) return false;
    if (state.options.autoHandlePauseResume === false) return false;

    switch (action) {
      case 'pause':
        if (state.status === 'active') { this.pause(id); return true; }
        break;
      case 'resume':
        if (state.status === 'paused') { this.resume(id); return true; }
        break;
      case 'cancel':
        this.cancel(id);
        return true;
    }
    return false;
  }

  /**
   * Called automatically by Toast when a notification is dismissed.
   * Does NOT delete the state — user might still call update/resume/complete.
   */
  handleDismissed(id: string): void {
    const state = this.states.get(id);
    if (!state) return;
    // Keep state alive so user can still interact with it programmatically
  }

  clear(): void {
    this.states.clear();
  }

  private getState(id: string): ProgressState {
    const state = this.states.get(id);
    if (!state) throw new Error(`Progress notification "${id}" not found`);
    return state;
  }
}