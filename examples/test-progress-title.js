/**
 * Test for separate notification and progress titles
 */

import toast from './dist/esm/index.js';

toast.debug(true);

async function testProgressTitle() {
  console.log('Testing separate notification and progress titles...\n');

  await toast.init();

  // Test with both title and progressTitle
  const id = toast.progress.start({
    title: 'Download Manager',
    progressTitle: 'ubuntu-24.04-desktop.iso',
    message: 'Starting download...',
    value: 0.1,
  });

  console.log(`Started progress notification with ID: ${id}`);
  console.log('- Notification Title: Download Manager');
  console.log('- Progress Bar Title: ubuntu-24.04-desktop.iso');
  console.log('\nCheck your notification to see if both titles are displayed correctly!');
  console.log('The main notification should show "Download Manager"');
  console.log('The progress bar should show "ubuntu-24.04-desktop.iso"\n');

  // Update progress a few times
  setTimeout(() => {
    toast.progress.update(id, { value: 0.3, status: '30%' });
    console.log('Updated progress to 30%');
  }, 2000);

  setTimeout(() => {
    toast.progress.update(id, { value: 0.6, status: '60%' });
    console.log('Updated progress to 60%');
  }, 4000);

  setTimeout(() => {
    toast.progress.update(id, { value: 0.9, status: '90%' });
    console.log('Updated progress to 90%');
  }, 6000);

  setTimeout(() => {
    toast.progress.complete(id, {
      showSuccessToast: true,
      successTitle: 'Download Complete',
      successMessage: 'ubuntu-24.04-desktop.iso has been downloaded'
    });
    console.log('Completed progress notification');

    setTimeout(() => {
      console.log('\nTest finished!');
      toast.shutdown();
      process.exit(0);
    }, 3000);
  }, 8000);
}

testProgressTitle();
