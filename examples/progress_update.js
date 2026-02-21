/**
 * Progress Notification Example
 * 
 * Simulates a file download with progress updates
 * 
 * Run: node examples/progress.js
 */

import toast from '../dist/esm/index.js';

toast.debug(false);

const downloadData = [{
    total: 98703521,
    delta: 14395968,
    transferred: 14395968,
    percent: 14.585060243190313,
    bytesPerSecond: 14367234
},
{
    total: 98703521,
    delta: 14588837,
    transferred: 28984805,
    percent: 29.36552283681957,
    bytesPerSecond: 14470696
},
{
    total: 98703521,
    delta: 15104933,
    transferred: 44089738,
    percent: 44.66886039455472,
    bytesPerSecond: 14681897
},
{
    total: 98703521,
    delta: 15720950,
    transferred: 59810688,
    percent: 60.59630638708421,
    bytesPerSecond: 14941466
},
{
    total: 98703521,
    delta: 15242935,
    transferred: 75053623,
    percent: 76.03945861262639,
    bytesPerSecond: 14998726
},
{
    total: 98703521,
    delta: 16783945,
    transferred: 91837568,
    percent: 93.04386213334782,
    bytesPerSecond: 15288425
},
{
    total: 98703521,
    delta: 6865953,
    transferred: 98703521,
    percent: 100,
    bytesPerSecond: 15412792
}];
function formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;

    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }

    return bytes.toFixed(2) + " " + units[i];
}
// Simulate a download with progress
async function simulateDownload() {
    const downloadId = 'download-1';
    const fileName = 'ubuntu-24.04-desktop-amd64.iso';

    console.log(`Starting download: ${fileName}`);

    // Start progress notification
    toast.progress.start(downloadId, {
        title: `Downloading ${fileName}`,
        message: 'Preparing download...',
        value: 0,
        appId: 'dz.gpro.delivery',
        group: 'downloads',
    });

    downloadData.forEach((data, index) => {
        setTimeout(() => {
            const progress = data.transferred / data.total;

            const status = `${(data.percent).toFixed(0)}%`;
            const valueStringOverride = `${formatSize(data.transferred)} / ${formatSize(data.total)}`;

            toast.progress.update(downloadId, {
                value: progress,
                status: status,
                valueStringOverride: valueStringOverride,
            });
        }, 1000 * index); // Simulate delay between progress updates
    });

}

// Handle pause/resume/cancel from toast buttons
toast.on('action', (e) => {
    console.log(`\nAction: ${e.action} on ${e.id}`);

    switch (e.action) {
        case 'pause':
            console.log('Pausing download...');
            toast.progress.pause(e.id);
            break;

        case 'resume':
            console.log('Resuming download...');
            toast.progress.resume(e.id);
            break;

        case 'cancel':
            console.log('Cancelling download...');
            toast.progress.cancel(e.id);

            setTimeout(() => {
                toast.shutdown();
                process.exit(0);
            }, 1000);
            break;
    }
});

toast.on('dismissed', (e) => {
    console.log(`Toast ${e.id} dismissed: ${e.reason}`);
});

// Run
console.log('Progress Notification Example');
console.log('============================\n');

// Must init before using progress API
await toast.init();
simulateDownload();
