import { randomUUID } from 'crypto';
import { resolve, isAbsolute } from 'path';
import { platform } from 'os';
import type { ToastOptions, ToastDuration } from './types.js';

/**
 * Check if the current OS is Windows
 */
export function isWindows(): boolean {
  return platform() === 'win32';
}

/**
 * Throws an error if the current OS is not Windows
 */
export function assertWindows(): void {
  if (!isWindows()) {
    throw new Error(
      `win-native-toast only supports Windows. Current platform: ${platform()}`
    );
  }
}

/**
 * Default group name for toasts without explicit group
 */
export const DEFAULT_GROUP = 'default';

/**
 * Default toast duration
 */
export const DEFAULT_DURATION: ToastDuration = 'short';

/**
 * Generate a unique toast ID
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Ensure a toast has an ID
 */
export function ensureId(options: ToastOptions): ToastOptions & { id: string } {
  return {
    ...options,
    id: options.id || generateId(),
  };
}

/**
 * Apply default values to toast options
 */
export function applyDefaults(options: ToastOptions): ToastOptions {
  const result = { ...options };

  // Auto-generate ID if not provided
  if (!result.id) {
    result.id = generateId();
  }

  // Default group
  if (!result.group) {
    result.group = DEFAULT_GROUP;
  }

  // Default duration (persistent for progress toasts)
  if (!result.duration) {
    result.duration = result.progress ? 'persistent' : DEFAULT_DURATION;
  }

  return result;
}

/**
 * Resolve an image path to an absolute path
 */
export function resolveImagePath(imagePath: string | undefined, basePath?: string): string | undefined {
  if (!imagePath) return undefined;

  // Already absolute
  if (isAbsolute(imagePath)) {
    return imagePath;
  }

  // URL (http/https/ms-appx)
  if (/^(https?|ms-appx|ms-appdata):/.test(imagePath)) {
    return imagePath;
  }

  // Resolve relative to base path or cwd
  const base = basePath || process.cwd();
  return resolve(base, imagePath);
}

/**
 * Resolve all image paths in toast options
 */
export function resolveImagePaths(options: ToastOptions, basePath?: string): ToastOptions {
  return {
    ...options,
    icon: resolveImagePath(options.icon, basePath),
    heroImage: resolveImagePath(options.heroImage, basePath),
    appLogo: resolveImagePath(options.appLogo, basePath),
    buttons: options.buttons?.map((btn) => ({
      ...btn,
      icon: resolveImagePath(btn.icon, basePath),
    })),
  };
}

/**
 * Clamp a value between 0 and 1
 */
export function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Format progress value as percentage string
 */
export function formatProgressPercent(value: number): string {
  return `${Math.round(clampProgress(value) * 100)}%`;
}

/**
 * Validate toast options
 */
export function validateOptions(options: ToastOptions): void {
  if (!options.title && !options.xml) {
    throw new Error('Toast must have a title or raw XML');
  }

  if (options.progress) {
    if (typeof options.progress.value === 'number') {
      if (options.progress.value < 0 || options.progress.value > 1) {
        throw new Error('Progress value must be between 0 and 1');
      }
    }
  }

  if (options.buttons && options.buttons.length > 5) {
    throw new Error('Toast can have at most 5 buttons');
  }

  if (options.inputs && options.inputs.length > 5) {
    throw new Error('Toast can have at most 5 inputs');
  }
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Create a deferred promise
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serialize date for IPC
 */
export function serializeDate(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString();
}
