using System.Text.Json;

namespace ToastBridge;

/// <summary>
/// Handles IPC communication between Node.js and C# via stdin/stdout
/// </summary>
public class IpcHandler
{
    private readonly ToastService _toastService;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly object _writeLock = new();
    private bool _running = true;

    public IpcHandler(ToastService toastService)
    {
        _toastService = toastService;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        // Wire up events from toast service
        _toastService.OnAction += evt => SendEvent(evt);
        _toastService.OnClick += evt => SendEvent(evt);
        _toastService.OnDismissed += evt => SendEvent(evt);
        _toastService.OnFailed += evt => SendEvent(evt);
    }

    /// <summary>
    /// Start the IPC message loop
    /// </summary>
    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        // Send ready event
        SendEvent(new ReadyEvent());

        using var reader = new StreamReader(Console.OpenStandardInput());

        while (_running && !cancellationToken.IsCancellationRequested)
        {
            try
            {
                var line = await reader.ReadLineAsync(cancellationToken);

                if (line == null)
                {
                    // stdin closed
                    break;
                }

                if (string.IsNullOrWhiteSpace(line))
                    continue;

                await ProcessMessageAsync(line);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                SendEvent(new ErrorEvent { Error = ex.Message });
            }
        }
    }

    /// <summary>
    /// Process a single IPC message
    /// </summary>
    private async Task ProcessMessageAsync(string json)
    {
        try
        {
            var message = JsonSerializer.Deserialize<IpcMessage>(json, _jsonOptions);

            if (message == null)
            {
                SendEvent(new ErrorEvent { Error = "Failed to parse message" });
                return;
            }

            await HandleCommandAsync(message);
        }
        catch (JsonException ex)
        {
            SendEvent(new ErrorEvent { Error = $"JSON parse error: {ex.Message}" });
        }
        catch (Exception ex)
        {
            SendEvent(new ErrorEvent { Error = ex.Message });
        }
    }

    /// <summary>
    /// Handle a parsed IPC command
    /// </summary>
    private Task HandleCommandAsync(IpcMessage message)
    {
        var id = message.Id ?? "";

        switch (message.Cmd)
        {
            case "show":
                {
                    var options = DeserializePayload<ToastOptions>(message.Payload);
                    if (options != null)
                    {
                        options.Id = id;
                        _toastService.Show(id, options);
                    }
                }
                break;

            case "update":
                {
                    var payload = DeserializePayload<ProgressUpdatePayload>(message.Payload);
                    if (payload != null)
                    {
                        _toastService.UpdateProgress(id, payload.Value, payload.Status);
                    }
                }
                break;

            case "dismiss":
                _toastService.Dismiss(id);
                break;

            case "dismiss-all":
                _toastService.DismissAll();
                break;

            case "dismiss-group":
                {
                    var payload = DeserializePayload<DismissGroupPayload>(message.Payload);
                    if (payload != null)
                    {
                        _toastService.DismissGroup(payload.Group);
                    }
                }
                break;

            case "progress-start":
                {
                    var options = DeserializePayload<ProgressStartOptions>(message.Payload);
                    if (options != null)
                    {
                        _toastService.StartProgress(id, options);
                    }
                }
                break;

            case "progress-update":
                {
                    var payload = DeserializePayload<ProgressUpdatePayload>(message.Payload);
                    if (payload != null)
                    {
                        _toastService.UpdateProgress(id, payload.Value, payload.Status);
                    }
                }
                break;

            case "progress-pause":
                {
                    var payload = DeserializePayload<ProgressUpdatePayload>(message.Payload);
                    _toastService.PauseProgress(id, payload?.Buttons, payload?.Message);
                }
                break;

            case "progress-resume":
                {
                    var payload = DeserializePayload<ProgressUpdatePayload>(message.Payload);
                    _toastService.ResumeProgress(id, payload?.Buttons, payload?.Message);
                }
                break;

            case "progress-complete":
                {
                    var options = DeserializePayload<ProgressCompleteOptions>(message.Payload);
                    _toastService.CompleteProgress(id, options);
                }
                break;

            case "progress-cancel":
                _toastService.Dismiss(id);
                break;

            case "progress-reopen":
                {
                    var payload = DeserializePayload<ProgressReopenPayload>(message.Payload);
                    _toastService.ReopenProgress(id, payload?.IsPaused ?? false);
                }
                break;

            default:
                SendEvent(new ErrorEvent { Error = $"Unknown command: {message.Cmd}" });
                break;
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Deserialize a JsonElement payload to a specific type
    /// </summary>
    private T? DeserializePayload<T>(JsonElement? payload) where T : class
    {
        if (payload == null)
            return null;

        try
        {
            return JsonSerializer.Deserialize<T>(payload.Value.GetRawText(), _jsonOptions);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Send an event to Node.js via stdout
    /// </summary>
    public void SendEvent<T>(T evt) where T : IpcEvent
    {
        lock (_writeLock)
        {
            var json = JsonSerializer.Serialize(evt, _jsonOptions);
            Console.WriteLine(json);
            Console.Out.Flush();
        }
    }

    /// <summary>
    /// Stop the IPC handler
    /// </summary>
    public void Stop()
    {
        _running = false;
    }
}