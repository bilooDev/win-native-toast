using Microsoft.Toolkit.Uwp.Notifications;
using ToastBridge;

// Create services first so we can wire up activation
var toastService = new ToastService();
var ipcHandler = new IpcHandler(toastService);

// Configure toast activation handler
ToastNotificationManagerCompat.OnActivated += toastArgs =>
{
    // Forward activation to toast service for proper event handling
    toastService.HandleActivation(toastArgs);
};

// Handle graceful shutdown
var cts = new CancellationTokenSource();

Console.CancelKeyPress += (s, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

AppDomain.CurrentDomain.ProcessExit += (s, e) =>
{
    cts.Cancel();
};

// Run the IPC loop
try
{
    await ipcHandler.RunAsync(cts.Token);
}
catch (OperationCanceledException)
{
    // Normal shutdown
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Fatal error: {ex.Message}");
    Environment.Exit(1);
}

// Cleanup
ToastNotificationManagerCompat.Uninstall();
