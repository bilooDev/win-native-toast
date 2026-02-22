# win-native-toast

Production-grade Windows toast notifications for Node.js with full progress support.

## Platform Support

| Platform | Support |
|----------|--------|
| Windows 10 | ✅ Fully supported |
| Windows 11 | ✅ Fully supported |
| macOS | ❌ Not supported |
| Linux | ❌ Not supported |

> **Note:** This package is Windows-only. Attempting to use it on other platforms will throw an error: `win-native-toast only supports Windows`

## Features

- 🚀 **Native Windows Toasts** - Electron-level notifications without Electron
- 📊 **Full Progress Lifecycle** - start, update, pause, resume, reOpen, complete, cancel
- 🔔 **Persistent & Updatable** - Keep notifications alive and update them in real-time
- ⚡ **Event Callbacks** - Handle button clicks, toast clicks, and dismiss events
- 🎨 **Rich Content** - Images, hero images, buttons, text inputs, and selection boxes
- 📦 **TypeScript-First** - Full type definitions included
- 🔌 **Middleware Support** - Transform notifications before they're shown
- 🔄 **Auto-Restart** - Bridge automatically restarts on crash
- 🎯 **Multi-App Support** - Show notifications under different app identities

## Installation

```bash
npm install win-native-toast
```

## Quick Start

### ESM

```js
import toast from "win-native-toast";

// Simple notification
await toast.show({
  title: "Hello World",
  message: "This is a toast notification"
});
```

### CommonJS

```js
const toast = require("win-native-toast").default;

toast.show({
  title: "Hello World",
  message: "This is a toast notification"
});
```

## Core API

### Show Notification

```js
const id = await toast.show({
  id: "my-notification",        // Optional, auto-generated if not provided
  title: "Download Complete",
  message: "file.zip has been downloaded",
  icon: "./icon.png",           // Supports relative paths
  group: "downloads",
  buttons: [
    { id: "open", text: "Open" },
    { id: "folder", text: "Open Folder" }
  ]
});
```

### Update Notification

```js
await toast.update("my-notification", {
  message: "Processing complete!",
  silent: true  // Don't play sound on update
});
```

### Dismiss Notifications

```js
// Dismiss single notification
await toast.dismiss("my-notification");

// Dismiss all notifications
await toast.dismissAll();

// Dismiss by group
await toast.dismissGroup("downloads");
```

## Progress API

The killer feature - full progress notification lifecycle.

### Basic Progress

```js
// Start a progress notification
toast.progress.start("download-1", {
  title: "Downloading Ubuntu ISO",
  message: "Starting download...",
  value: 0,
  group: "downloads"
});

// Update progress (0 to 1)
toast.progress.update("download-1", 0.25);
toast.progress.update("download-1", 0.50);
toast.progress.update("download-1", 0.75);

// Complete with success toast
toast.progress.complete("download-1", {
  showSuccessToast: true
});
```

### Separate Notification and Progress Titles

```js
// Use different titles for the notification and progress bar
toast.progress.start("download-1", {
  title: "Download Manager",                    // Main notification title
  progressTitle: "ubuntu-24.04-desktop.iso",   // Progress bar title
  message: "Preparing download...",
  value: 0
});
```

### Progress with Status

```js
// status = left side text, valueStringOverride = right side text
toast.progress.update("download-1", {
  value: 0.5,
  status: "50%",
  valueStringOverride: "50 MB / 100 MB"
});
```

### Pause & Resume

```js
// Pause (automatically swaps buttons to Resume/Cancel)
toast.progress.pause("download-1");

// Resume (restores original buttons)
toast.progress.resume("download-1");

// Cancel
toast.progress.cancel("download-1");
```

### Re-Open Dismissed Notifications

When a user dismisses a progress notification (swipe or timeout), you can re-open it:

```js
toast.on("dismissed", (e) => {
  // Check if this is an active progress notification
  if (toast.progress.has(e.id)) {
    // Re-open to keep showing progress
    toast.progress.reOpen(e.id);
  }
});
```

This is useful for download managers where you want the notification to persist until the user explicitly cancels via the Cancel button.

### Custom Progress Buttons

```js
toast.progress.start("task-1", {
  title: "Processing Files",
  value: 0,
  buttons: [
    { id: "pause", text: "⏸ Pause" },
    { id: "cancel", text: "✕ Cancel", style: "destructive" }
  ]
});
```

## Event Handling

```js
// Button click
toast.on("action", (e) => {
  console.log(`Button "${e.action}" clicked on toast "${e.id}"`);
  
  if (e.action === "open") {
    // Handle open action
  }
});

// Toast body click
toast.on("click", (e) => {
  console.log(`Toast "${e.id}" clicked`);
});

// Toast dismissed
toast.on("dismissed", (e) => {
  console.log(`Toast "${e.id}" dismissed: ${e.reason}`);
  // reason: "user" | "timeout" | "programmatic"
});

// Error handling
toast.on("failed", (e) => {
  console.error(`Toast "${e.id}" failed: ${e.error}`);
});
```

## Advanced Features

### Notification Channels

```js
// Create a channel (Android-style)
await toast.createChannel({
  id: "downloads",
  name: "Downloads",
  silent: false,
  priority: "high"
});

// Use the channel
await toast.show({
  title: "Download Complete",
  channel: "downloads"
});
```

### Scheduled Notifications

```js
await toast.schedule({
  id: "reminder-1",
  title: "Meeting in 5 minutes",
  message: "Team sync @ 3:00 PM",
  at: Date.now() + 5 * 60 * 1000  // 5 minutes from now
});

// Cancel scheduled notification
await toast.cancelSchedule("reminder-1");
```

### Multi-App Support

```js
// Create toast instance for specific app
const myAppToast = toast.withApp("com.mycompany.myapp");

await myAppToast.show({
  title: "App Notification"
});
```

### Middleware

```js
// Add prefix to all notifications
toast.use((options) => {
  return {
    ...options,
    title: `[MyApp] ${options.title}`
  };
});
```

### Debug Mode

```js
// Enable debug logging
toast.debug(true);

// Shows all IPC communication in console
```

### Raw XML Mode

For power users who need full control:

```js
await toast.show({
  xml: `
    <toast>
      <visual>
        <binding template="ToastGeneric">
          <text>Custom XML Toast</text>
        </binding>
      </visual>
    </toast>
  `
});
```

## Toast Options Reference

```typescript
interface ToastOptions {
  // Identity
  id?: string;              // Auto-generated if not provided
  group?: string;           // Default: "default"
  appId?: string;           // Application User Model ID
  channel?: string;         // Notification channel

  // Content
  title: string;            // Required (unless using xml)
  message?: string;
  subtitle?: string;
  attribution?: string;
  timestamp?: Date | string;

  // Images
  icon?: string;            // App logo
  heroImage?: string;       // Large image at top
  appLogo?: string;         // Override app logo

  // Behavior
  silent?: boolean;         // Suppress sound
  duration?: "short" | "long" | "persistent";
  scenario?: "default" | "alarm" | "reminder" | "incomingCall";

  // Interactive
  buttons?: ToastButton[];  // Max 5 buttons
  inputs?: ToastInput[];    // Max 5 inputs

  // Progress
  progress?: {
    value: number;          // 0 to 1
    status?: string;
    indeterminate?: boolean;
    title?: string;
    valueStringOverride?: string;
  };

  // Advanced
  xml?: string;             // Raw XML override
}
```

## Requirements

- **Windows 10 or Windows 11** (required)
- **Node.js 18+** (ESM support required)
- **.NET 8 Runtime** (bundled with the package)

## OS Compatibility Check

You can check if the current platform is supported before using the package:

```js
import { isWindows } from 'win-native-toast';

if (isWindows()) {
  // Safe to use toast notifications
  const toast = (await import('win-native-toast')).default;
  await toast.show({ title: 'Hello!' });
} else {
  console.log('Toast notifications are only available on Windows');
}
```

Alternatively, the package will throw a descriptive error if you try to use it on an unsupported platform.

## How It Works

`win-native-toast` uses a lightweight C# backend process that communicates with Node.js via JSON IPC over stdin/stdout. The C# process handles native Windows toast APIs (via `Microsoft.Toolkit.Uwp.Notifications`), while Node.js provides the developer-friendly API.

```
┌─────────────┐    JSON/IPC    ┌─────────────────┐
│   Node.js   │ ◄────────────► │  C# ToastBridge │
│   (Your App)│    stdin/out   │  (Native APIs)  │
└─────────────┘                └─────────────────┘
```

**Key characteristics:**
- No native Node.js addons required
- Single executable, no external dependencies
- Automatic process management with restart on crash
- Full progress bar support with real-time updates

## API Reference

### Toast Instance

| Method | Description |
|--------|-------------|
| `show(options)` | Show a notification |
| `update(id, options)` | Update an existing notification |
| `dismiss(id)` | Dismiss a notification |
| `dismissAll()` | Dismiss all notifications |
| `dismissGroup(group)` | Dismiss all in a group |
| `createChannel(options)` | Create a notification channel |
| `schedule(options)` | Schedule a future notification |
| `cancelSchedule(id)` | Cancel a scheduled notification |
| `withApp(appId)` | Create instance bound to an app ID |
| `use(middleware)` | Add middleware function |
| `debug(enabled)` | Enable/disable debug logging |
| `init()` | Manually initialize (optional) |
| `shutdown()` | Stop the bridge process |

### Progress API

| Method | Description |
|--------|-------------|
| `progress.start(id, options)` | Start a progress notification |
| `progress.update(id, value)` | Update progress value (0-1) |
| `progress.update(id, { value, status, valueStringOverride })` | Update with status (left) and value string (right) |
| `progress.pause(id)` | Pause and show Resume/Cancel buttons |
| `progress.resume(id)` | Resume and restore original buttons |
| `progress.reOpen(id)` | Re-open a dismissed notification |
| `progress.complete(id, options)` | Mark as complete |
| `progress.cancel(id)` | Cancel and dismiss |
| `progress.has(id)` | Check if progress exists |
| `progress.getStatus(id)` | Get current status |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `{ id, action, inputs?, group?, appId? }` | Button clicked |
| `click` | `{ id, inputs?, group?, appId? }` | Toast body clicked |
| `dismissed` | `{ id, reason, group?, appId? }` | Toast dismissed |
| `failed` | `{ id, error, code? }` | Toast failed |
| `ready` | - | Bridge is ready |
| `error` | `Error` | Bridge error |

## License

MIT
