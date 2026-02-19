/**
 * Basic Toast Notification Example
 * 
 * Run: node examples/basic.js
 */

import toast from '../dist/esm/index.js';

// Enable debug mode to see IPC communication
toast.debug(true);

// Simple notification
async function simpleNotification() {
  console.log('Showing simple notification...');

  const id = await toast.show({
    title: 'Hello from Node.js!',
    message: 'This is a Windows toast notification',
    appId: 'dz.gpro.delivery',
  });

  console.log(`Toast shown with ID: ${id}`);
}

// Notification with buttons
async function notificationWithButtons() {
  console.log('\nShowing notification with buttons...');

  const id = await toast.show({
    title: 'Download Complete',
    message: 'ubuntu-22.04.iso has been downloaded',
    group: 'downloads',
    buttons: [
      { id: 'open', text: 'Open' },
      { id: 'folder', text: 'Open Folder' },
    ],
  });

  console.log(`Toast with buttons shown: ${id}`);
}

// Notification with image
async function notificationWithImage() {
  console.log('\nShowing notification with image...');

  // Note: Use absolute paths for images
  const id = await toast.show({
    title: 'New Photo',
    message: 'Someone tagged you in a photo',
    icon: 'https://picsum.photos/48/48', // Example image URL
  });

  console.log(`Toast with image shown: ${id}`);
}

// Handle events
toast.on('action', (e) => {
  console.log(`\n🔘 Button clicked: "${e.action}" on toast "${e.id}"`);
});

toast.on('click', (e) => {
  console.log(`\n👆 Toast body clicked: "${e.id}"`);
});

toast.on('dismissed', (e) => {
  console.log(`\n❌ Toast dismissed: "${e.id}" (reason: ${e.reason})`);
});

toast.on('failed', (e) => {
  console.error(`\n⚠️ Toast failed: "${e.id}" - ${e.error}`);
});

// Run examples
async function main() {
  try {
    // await simpleNotification();
    // await new Promise(r => setTimeout(r, 2000));

    await notificationWithButtons();
    await new Promise(r => setTimeout(r, 2000));

    // await notificationWithImage();

    // Keep running to receive events
    console.log('\n✅ All notifications shown!');
    console.log('Waiting for events... Press Ctrl+C to exit.\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
