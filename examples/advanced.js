/**
 * Advanced Features Example
 * 
 * Demonstrates inputs, channels, middleware, and more
 * 
 * Run: node examples/advanced.js
 */

import toast from '../dist/esm/index.js';

toast.debug(true);

// Add middleware to prefix all notifications
toast.use((options) => {
  return {
    ...options,
    title: `[MyApp] ${options.title}`,
  };
});

// Notification with text input
async function notificationWithInput() {
  console.log('Showing notification with text input...');
  
  await toast.show({
    title: 'Quick Reply',
    message: 'John sent you a message',
    inputs: [
      {
        id: 'reply',
        type: 'text',
        placeholder: 'Type your reply...',
      },
    ],
    buttons: [
      { id: 'send', text: 'Send' },
      { id: 'ignore', text: 'Ignore' },
    ],
  });
}

// Notification with selection dropdown
async function notificationWithSelection() {
  console.log('\nShowing notification with dropdown...');
  
  await toast.show({
    title: 'Snooze Reminder',
    message: 'Meeting with team in 5 minutes',
    inputs: [
      {
        id: 'snooze',
        type: 'selection',
        title: 'Snooze for:',
        defaultValue: '5min',
        options: [
          { id: '5min', content: '5 minutes' },
          { id: '15min', content: '15 minutes' },
          { id: '30min', content: '30 minutes' },
          { id: '1hr', content: '1 hour' },
        ],
      },
    ],
    buttons: [
      { id: 'snooze', text: 'Snooze' },
      { id: 'dismiss', text: 'Dismiss' },
    ],
  });
}

// Alarm-style notification (stays until dismissed)
async function alarmNotification() {
  console.log('\nShowing alarm notification...');
  
  await toast.show({
    title: 'Wake Up!',
    message: 'Your alarm is ringing',
    scenario: 'alarm',
    buttons: [
      { id: 'snooze', text: 'Snooze' },
      { id: 'dismiss', text: 'Dismiss' },
    ],
  });
}

// Multi-app support example
async function multiAppExample() {
  console.log('\nShowing notification from different app identity...');
  
  const otherApp = toast.withApp('com.example.otherapp');
  
  await otherApp.show({
    title: 'From Other App',
    message: 'This notification has a different app identity',
  });
}

// Handle all events
toast.on('action', (e) => {
  console.log(`\n🔘 Action: "${e.action}" on "${e.id}"`);
  
  // Check for input values
  if (e.inputs) {
    console.log('   Input values:', e.inputs);
  }
});

toast.on('click', (e) => {
  console.log(`\n👆 Clicked: "${e.id}"`);
  if (e.inputs) {
    console.log('   Input values:', e.inputs);
  }
});

toast.on('dismissed', (e) => {
  console.log(`\n❌ Dismissed: "${e.id}" (${e.reason})`);
});

// Run examples
async function main() {
  console.log('Advanced Features Example');
  console.log('=========================\n');
  
  try {
    await notificationWithInput();
    await new Promise(r => setTimeout(r, 3000));
    
    await notificationWithSelection();
    await new Promise(r => setTimeout(r, 3000));
    
    await alarmNotification();
    await new Promise(r => setTimeout(r, 3000));
    
    await multiAppExample();
    
    console.log('\n✅ All examples shown!');
    console.log('Interact with the notifications, then press Ctrl+C to exit.\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
