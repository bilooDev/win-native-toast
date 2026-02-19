import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import type {
  IPCMessage,
  IPCEvent,
  IPCCommand,
  PROTOCOL_VERSION,
} from './types.js';
import { createDeferred, assertWindows } from './utils.js';

/**
 * Configuration options for the bridge
 */
export interface BridgeOptions {
  /** Path to the C# executable */
  executablePath?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Timeout for ready event (ms) */
  readyTimeout?: number;
  /** Auto-restart on crash */
  autoRestart?: boolean;
  /** Maximum restart attempts */
  maxRestarts?: number;
}

/**
 * Default bridge configuration
 */
const DEFAULT_OPTIONS: Required<BridgeOptions> = {
  executablePath: '',
  debug: false,
  readyTimeout: 10000,
  autoRestart: true,
  maxRestarts: 3,
};

/**
 * IPC Bridge for communicating with the C# toast backend
 */
export class Bridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private options: Required<BridgeOptions>;
  private messageQueue: IPCMessage[] = [];
  private isReady = false;
  private restartCount = 0;
  private buffer = '';
  private readyDeferred = createDeferred<void>();

  constructor(options: BridgeOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Find executable path
    if (!this.options.executablePath) {
      this.options.executablePath = this.findExecutable();
    }
  }

  /**
   * Find the C# executable in common locations
   */
  private findExecutable(): string {
    const possiblePaths = [
      // Development
      join(__dirname, '..', 'bin', 'win-native-toast.exe'),
      join(__dirname, '..', '..', 'bin', 'win-native-toast.exe'),
      // Installed package
      join(__dirname, 'bin', 'win-native-toast.exe'),
      // Global install
      join(process.env.APPDATA || '', 'win-native-toast', 'win-native-toast.exe'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Return default, will error on start if not found
    return join(__dirname, '..', 'bin', 'win-native-toast.exe');
  }

  /**
   * Start the C# backend process
   */
  async start(): Promise<void> {
    // Check OS compatibility
    assertWindows();

    if (this.process) {
      return this.readyDeferred.promise;
    }

    this.log('Starting C# backend...');
    this.log(`Executable: ${this.options.executablePath}`);

    if (!existsSync(this.options.executablePath)) {
      throw new Error(
        `C# executable not found at: ${this.options.executablePath}\n` +
        'Make sure the native binary is installed. Run: npm run postinstall'
      );
    }

    this.process = spawn(this.options.executablePath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleData(data);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.log(`[stderr] ${data.toString()}`);
      this.emit('error', new Error(data.toString()));
    });

    this.process.on('close', (code) => {
      this.log(`Process exited with code ${code}`);
      this.handleClose(code);
    });

    this.process.on('error', (error) => {
      this.log(`Process error: ${error.message}`);
      this.emit('error', error);
      this.readyDeferred.reject(error);
    });

    // Wait for ready with timeout
    const timeout = setTimeout(() => {
      if (!this.isReady) {
        this.readyDeferred.reject(new Error('Bridge ready timeout'));
      }
    }, this.options.readyTimeout);

    try {
      await this.readyDeferred.promise;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Handle incoming data from C# process
   */
  private handleData(data: Buffer): void {
    this.buffer += data.toString();

    // Process complete JSON messages (newline-delimited)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event: IPCEvent = JSON.parse(line);
        this.handleEvent(event);
      } catch (error) {
        this.log(`Failed to parse: ${line}`);
      }
    }
  }

  /**
   * Handle parsed IPC event from C#
   */
  private handleEvent(event: IPCEvent): void {
    this.log(`Event: ${JSON.stringify(event)}`);

    switch (event.event) {
      case 'ready':
        this.isReady = true;
        this.readyDeferred.resolve();
        this.flushQueue();
        this.emit('ready', event);
        break;

      case 'action':
        this.emit('action', {
          id: event.id,
          action: event.action,
          inputs: event.inputs,
          group: event.group,
          appId: event.appId,
        });
        break;

      case 'click':
        this.emit('click', {
          id: event.id,
          inputs: event.inputs,
          group: event.group,
          appId: event.appId,
        });
        break;

      case 'dismissed':
        this.emit('dismissed', {
          id: event.id,
          reason: event.reason,
          group: event.group,
          appId: event.appId,
        });
        break;

      case 'failed':
        this.emit('failed', {
          id: event.id,
          error: event.error,
          code: event.code,
        });
        break;

      case 'error':
        this.emit('error', new Error(event.error as string));
        if (event.fatal) {
          this.stop();
        }
        break;

      default:
        this.emit('unknown', event);
    }
  }

  /**
   * Handle process close
   */
  private handleClose(code: number | null): void {
    this.process = null;
    this.isReady = false;

    if (code !== 0 && this.options.autoRestart && this.restartCount < this.options.maxRestarts) {
      this.restartCount++;
      this.log(`Restarting (attempt ${this.restartCount}/${this.options.maxRestarts})...`);
      this.readyDeferred = createDeferred<void>();
      this.start().catch((err) => this.emit('error', err));
    } else {
      this.emit('close', code);
    }
  }

  /**
   * Send a message to the C# process
   */
  send(cmd: IPCCommand, id?: string, payload?: unknown): void {
    const message: IPCMessage = {
      protocol: 1, // PROTOCOL_VERSION
      cmd,
      id,
      payload,
    };

    if (!this.isReady) {
      this.messageQueue.push(message);
      this.log(`Queued: ${JSON.stringify(message)}`);
      return;
    }

    this.sendImmediate(message);
  }

  /**
   * Send a message immediately (bypasses queue)
   */
  private sendImmediate(message: IPCMessage): void {
    if (!this.process?.stdin?.writable) {
      this.emit('error', new Error('Process stdin not writable'));
      return;
    }

    const json = JSON.stringify(message) + '\n';
    this.log(`Send: ${json.trim()}`);
    this.process.stdin.write(json);
  }

  /**
   * Flush queued messages
   */
  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendImmediate(message);
    }
  }

  /**
   * Stop the C# process
   */
  stop(): void {
    this.options.autoRestart = false;
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isReady = false;
    this.messageQueue = [];
  }

  /**
   * Check if bridge is ready
   */
  get ready(): boolean {
    return this.isReady;
  }

  /**
   * Wait for bridge to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.isReady) return;
    await this.start();
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[win-native-toast] ${message}`);
    }
  }

  /**
   * Enable or disable debug mode
   */
  setDebug(enabled: boolean): void {
    this.options.debug = enabled;
  }
}

// Singleton instance
let bridgeInstance: Bridge | null = null;

/**
 * Get the shared bridge instance
 */
export function getBridge(options?: BridgeOptions): Bridge {
  if (!bridgeInstance) {
    bridgeInstance = new Bridge(options);
  }
  return bridgeInstance;
}

/**
 * Reset the bridge instance (for testing)
 */
export function resetBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.stop();
    bridgeInstance = null;
  }
}
