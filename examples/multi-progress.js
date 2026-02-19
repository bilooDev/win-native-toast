/**
 * Multiple Concurrent Progress Notifications
 *
 * Simulates downloading multiple files at once.
 *
 * Run: node examples/multi-progress.js
 */

import toast from '../dist/esm/index.js';

toast.debug(false);

const downloads = [
  { id: 'dl-3', name: 'archive.zip', size: 5000, speed: 0.05 },
];

// Tracks live download state keyed by toast id
const activeDownloads = new Map();

function formatSize(mb) {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

async function startDownload(download) {
  const { id, name, size, speed } = download;
  console.log(`Starting: ${name}`);

  toast.progress.start(id, {
    title: `Downloading ${name}`,
    message: `0 / ${formatSize(size)}`,
    value: 0,
    group: 'downloads',
  });

  const active = {
    download,
    progress: 0,
    interval: null,
    completed: false,
  };

  const startInterval = () => {
    if (active.interval || active.completed) return;

    active.interval = setInterval(() => {
      active.progress += speed * (0.5 + Math.random());

      if (active.progress >= 1) {
        active.progress = 1;
        clearInterval(active.interval);
        active.interval = null;
        active.completed = true;
        activeDownloads.delete(id);

        console.log(`✅ Complete: ${name}`);
        toast.progress.complete(id, {
          showSuccessToast: true,
          successTitle: 'Download Complete',
          successMessage: `${name} - ${formatSize(size)}`,
        });

        if (activeDownloads.size === 0) {
          console.log('\n🎉 All downloads complete!');
          setTimeout(() => { toast.shutdown(); process.exit(0); }, 5000);
        }
        return;
      }

      const downloaded = size * active.progress;
      console.log(`${name}: ${(active.progress * 100).toFixed(0)}%`);
      toast.progress.update(id, {
        value: active.progress,
        status: `${formatSize(downloaded)} / ${formatSize(size)}`,
      });
    }, 300);
  };

  active.startInterval = startInterval;
  startInterval();
  activeDownloads.set(id, active);
}

// ─── Button clicks (Pause / Resume / Cancel) ───────────────────────────────

toast.on('action', (e) => {
  const active = activeDownloads.get(e.id);

  switch (e.action) {
    case 'pause':
      if (active?.interval) {
        clearInterval(active.interval);
        active.interval = null;
        console.log(`⏸️ Paused: ${active.download.name}`);
        // toast.progress.pause() already called internally by handleAction
      }
      break;

    case 'resume':
      if (active && !active.interval && !active.completed) {
        console.log(`▶️ Resuming: ${active.download.name}`);
        // toast.progress.resume() already called internally by handleAction
        active.startInterval();
      }
      break;

    case 'cancel':
      if (active) {
        clearInterval(active.interval);
        active.interval = null;
        activeDownloads.delete(e.id);
        console.log(`❌ Cancelled: ${active.download.name}`);
        // toast.progress.cancel() already called internally by handleAction
      }
      if (activeDownloads.size === 0) {
        setTimeout(() => { toast.shutdown(); process.exit(0); }, 1000);
      }
      break;
  }
});

// ─── Toast body clicked ─────────────────────────────────────────────────────

toast.on('click', (e) => {
  console.log(`Toast "${e.id}" clicked`);
});

// ─── Dismissed ──────────────────────────────────────────────────────────────
//
// When a progress notification is dismissed (by user swipe or timeout),
// we reOpen it to keep showing download progress. The user can click
// Cancel button if they want to stop the download.

toast.on('dismissed', (e) => {
  console.log(`Toast "${e.id}" dismissed: ${e.reason}`);

  const active = activeDownloads.get(e.id);

  // Only reopen if this is an active/paused download (not completed/cancelled)
  if (active && !active.completed && toast.progress.has(e.id)) {
    // Reopen the notification to keep showing progress
    console.log(`🔄 Reopening notification: ${active.download.name}`);
    toast.progress.reOpen(e.id);
  }
});

// ─── Errors ─────────────────────────────────────────────────────────────────

toast.on('failed', (e) => {
  console.error(`Toast "${e.id}" failed: ${e.error}`);
});

// ─── Run ────────────────────────────────────────────────────────────────────

console.log('Multiple Progress Notifications Example');
console.log('======================================\n');

await toast.init();

for (const download of downloads) {
  await startDownload(download);
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n${downloads.length} downloads started. Watching progress...\n`);