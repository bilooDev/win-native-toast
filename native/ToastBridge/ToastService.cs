using Microsoft.Toolkit.Uwp.Notifications;
using Windows.UI.Notifications;
using System.Collections.Concurrent;

namespace ToastBridge;

/// <summary>
/// Manages Windows toast notifications with progress support
/// </summary>
public class ToastService
{
    private readonly ConcurrentDictionary<string, ToastNotification> _activeToasts = new();
    private readonly ConcurrentDictionary<string, NotificationData> _progressData = new();
    private readonly ConcurrentDictionary<string, ToastMeta> _toastMeta = new();
    private readonly ConcurrentDictionary<string, ProgressState> _progressStates = new();

    public event Action<ActionEvent>? OnAction;
    public event Action<ClickEvent>? OnClick;
    public event Action<DismissedEvent>? OnDismissed;
    public event Action<FailedEvent>? OnFailed;

    private class ToastMeta
    {
        public string? Group { get; set; }
        public string? AppId { get; set; }
    }

    private class ProgressState
    {
        public string Title { get; set; } = "";
        public string? Message { get; set; }
        public string? Group { get; set; }
        public string? AppId { get; set; }
        public double Value { get; set; }
        public string? Status { get; set; }
        public bool IsPaused { get; set; }
        public bool SuppressNextDismissDialog { get; set; }
        public List<ToastButton>? OriginalButtons { get; set; }
    }

    // -------------------------------------------------------------------------
    // Notifier helpers — use raw Windows API when appId is provided so Windows
    // displays the correct app name and icon from the registry instead of the
    // bridge process identity.
    // -------------------------------------------------------------------------

    private void ShowToast(ToastNotification toast, string? appId)
    {
        if (!string.IsNullOrEmpty(appId))
        {
            try
            {
                ToastNotificationManager.CreateToastNotifier(appId).Show(toast);
                return;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ToastBridge] appId notifier failed ({appId}): {ex.Message}");
            }
        }
        ToastNotificationManagerCompat.CreateToastNotifier().Show(toast);
    }

    private void UpdateToast(NotificationData data, string id, string group, string? appId)
    {
        if (!string.IsNullOrEmpty(appId))
        {
            try
            {
                ToastNotificationManager.CreateToastNotifier(appId).Update(data, id, group);
                return;
            }
            catch { }
        }
        ToastNotificationManagerCompat.CreateToastNotifier().Update(data, id, group);
    }

    private void RemoveToast(string id, string group, string? appId)
    {
        if (!string.IsNullOrEmpty(appId))
        {
            try
            {
                ToastNotificationManager.History.Remove(id, group, appId);
                return;
            }
            catch { }
        }
        ToastNotificationManagerCompat.History.Remove(id, group);
    }

    private void RemoveGroupToast(string group, string? appId)
    {
        if (!string.IsNullOrEmpty(appId))
        {
            try
            {
                ToastNotificationManager.History.RemoveGroup(group, appId);
                return;
            }
            catch { }
        }
        ToastNotificationManagerCompat.History.RemoveGroup(group);
    }

    // -------------------------------------------------------------------------

    /// <summary>
    /// Show a toast notification
    /// </summary>
    public void Show(string id, ToastOptions options)
    {
        try
        {
            ToastNotification toast;

            if (!string.IsNullOrEmpty(options.Xml))
            {
                // Raw XML mode
                var doc = new Windows.Data.Xml.Dom.XmlDocument();
                doc.LoadXml(options.Xml);
                toast = new ToastNotification(doc);
            }
            else
            {
                // Build toast using toolkit
                var builder = new ToastContentBuilder();

                // Text content
                builder.AddText(options.Title);
                if (!string.IsNullOrEmpty(options.Message))
                    builder.AddText(options.Message);
                if (!string.IsNullOrEmpty(options.Subtitle))
                    builder.AddText(options.Subtitle);

                // Attribution
                if (!string.IsNullOrEmpty(options.Attribution))
                    builder.AddAttributionText(options.Attribution);

                // Images
                if (!string.IsNullOrEmpty(options.Icon) || !string.IsNullOrEmpty(options.AppLogo))
                {
                    var logoPath = options.AppLogo ?? options.Icon;
                    if (Uri.TryCreate(logoPath, UriKind.Absolute, out var uri))
                        builder.AddAppLogoOverride(uri);
                }

                if (!string.IsNullOrEmpty(options.HeroImage))
                {
                    if (Uri.TryCreate(options.HeroImage, UriKind.Absolute, out var uri))
                        builder.AddHeroImage(uri);
                }

                // Buttons
                if (options.Buttons != null)
                {
                    foreach (var btn in options.Buttons)
                    {
                        builder.AddButton(btn.Text, ToastActivationType.Foreground, $"action={btn.Id}&toastId={id}");
                    }
                }

                // Inputs
                if (options.Inputs != null)
                {
                    foreach (var input in options.Inputs)
                    {
                        if (input.Type == "selection" && input.Options != null)
                        {
                            var selection = new ToastSelectionBox(input.Id);
                            if (!string.IsNullOrEmpty(input.Title))
                                selection.Title = input.Title;
                            if (!string.IsNullOrEmpty(input.DefaultValue))
                                selection.DefaultSelectionBoxItemId = input.DefaultValue;

                            foreach (var opt in input.Options)
                                selection.Items.Add(new ToastSelectionBoxItem(opt.Id, opt.Content));

                            builder.AddToastInput(selection);
                        }
                        else
                        {
                            var textBox = new ToastTextBox(input.Id);
                            if (!string.IsNullOrEmpty(input.Placeholder))
                                textBox.PlaceholderContent = input.Placeholder;
                            if (!string.IsNullOrEmpty(input.DefaultValue))
                                textBox.DefaultInput = input.DefaultValue;
                            if (!string.IsNullOrEmpty(input.Title))
                                textBox.Title = input.Title;

                            builder.AddToastInput(textBox);
                        }
                    }
                }

                // Progress
                if (options.Progress != null)
                {
                    builder.AddVisualChild(new AdaptiveProgressBar()
                    {
                        Title = options.Progress.Title ?? options.Title,
                        Value = options.Progress.Indeterminate == true
                            ? AdaptiveProgressBarValue.Indeterminate
                            : new BindableProgressBarValue("progress"),
                        ValueStringOverride = options.Progress.ValueStringOverride != null
                            ? options.Progress.ValueStringOverride
                            : new BindableString("progressValueString"),
                        Status = new BindableString("progressStatus")
                    });
                }

                // Scenario
                if (!string.IsNullOrEmpty(options.Scenario))
                {
                    builder.SetToastScenario(options.Scenario switch
                    {
                        "alarm" => ToastScenario.Alarm,
                        "reminder" => ToastScenario.Reminder,
                        "incomingCall" => ToastScenario.IncomingCall,
                        _ => ToastScenario.Default
                    });
                }

                // Duration
                if (options.Duration == "long")
                {
                    builder.SetToastDuration(ToastDuration.Long);
                }

                var content = builder.GetToastContent();
                var doc = new Windows.Data.Xml.Dom.XmlDocument();
                doc.LoadXml(content.GetContent());
                toast = new ToastNotification(doc);
            }

            // Set tag and group
            toast.Tag = id;
            toast.Group = options.Group ?? "default";

            // Suppress popup if silent
            if (options.Silent == true)
                toast.SuppressPopup = true;

            // Store metadata
            _toastMeta[id] = new ToastMeta
            {
                Group = options.Group,
                AppId = options.AppId
            };

            // Set up progress data if needed
            if (options.Progress != null)
            {
                var data = new NotificationData { SequenceNumber = 0 };
                data.Values["progress"] = (options.Progress.Value ?? 0).ToString("F2");
                data.Values["progressStatus"] = options.Progress.Status ?? "";
                data.Values["progressValueString"] = options.Progress.ValueStringOverride ?? "";
                toast.Data = data;
                _progressData[id] = data;
            }

            // Event handlers
            toast.Activated += (s, e) =>
            {
                _activeToasts.TryRemove(id, out _);
            };

            toast.Dismissed += (s, e) =>
            {
                var meta = _toastMeta.GetValueOrDefault(id);
                var reason = e.Reason switch
                {
                    ToastDismissalReason.UserCanceled => "user",
                    ToastDismissalReason.TimedOut => "timeout",
                    ToastDismissalReason.ApplicationHidden => "programmatic",
                    _ => "user"
                };

                // Check if this is a progress toast
                if (_progressStates.TryGetValue(id, out var progressState))
                {
                    // Suppress during internal operations (pause/resume/reopen)
                    if (progressState.SuppressNextDismissDialog)
                    {
                        progressState.SuppressNextDismissDialog = false;
                        return; // Internal dismiss — don't fire any event to Node.js
                    }

                    // Notify Node.js that the toast was dismissed
                    // User can call reOpen() in the dismissed handler if needed
                    OnDismissed?.Invoke(new DismissedEvent
                    {
                        Id = id,
                        Reason = reason,
                        Group = meta?.Group,
                        AppId = meta?.AppId
                    });

                    _activeToasts.TryRemove(id, out _);
                    // Keep _progressData and _toastMeta alive so reOpen() works
                }
                else
                {
                    // Normal dismiss for non-progress toasts
                    OnDismissed?.Invoke(new DismissedEvent
                    {
                        Id = id,
                        Reason = reason,
                        Group = meta?.Group,
                        AppId = meta?.AppId
                    });

                    _activeToasts.TryRemove(id, out _);
                    _progressData.TryRemove(id, out _);
                    _toastMeta.TryRemove(id, out _);
                }
            };

            toast.Failed += (s, e) =>
            {
                OnFailed?.Invoke(new FailedEvent
                {
                    Id = id,
                    Error = e.ErrorCode.Message,
                    Code = e.ErrorCode.HResult.ToString()
                });

                _activeToasts.TryRemove(id, out _);
            };

            // ✅ Use raw Windows API notifier when appId is provided
            ShowToast(toast, options.AppId);
            _activeToasts[id] = toast;
        }
        catch (Exception ex)
        {
            OnFailed?.Invoke(new FailedEvent
            {
                Id = id,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Update an existing toast's progress
    /// </summary>
    public void UpdateProgress(string id, double? value, string? status, string? valueStringOverride = null)
    {
        try
        {
            // Update stored state
            if (_progressStates.TryGetValue(id, out var state))
            {
                if (value.HasValue)
                    state.Value = value.Value;
                if (status != null)
                    state.Status = status;
            }

            if (!_progressData.TryGetValue(id, out var data))
            {
                data = new NotificationData { SequenceNumber = 0 };
                _progressData[id] = data;
            }

            data.SequenceNumber++;

            if (value.HasValue)
                data.Values["progress"] = value.Value.ToString("F2");

            if (status != null)
                data.Values["progressStatus"] = status;

            if (valueStringOverride != null)
                data.Values["progressValueString"] = valueStringOverride;

            var meta = _toastMeta.GetValueOrDefault(id);

            // ✅ Use raw Windows API notifier when appId is provided
            UpdateToast(data, id, meta?.Group ?? "default", meta?.AppId);
        }
        catch (Exception ex)
        {
            OnFailed?.Invoke(new FailedEvent
            {
                Id = id,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Start a progress toast
    /// </summary>
    public void StartProgress(string id, ProgressStartOptions options)
    {
        // Store progress state for pause/resume
        _progressStates[id] = new ProgressState
        {
            Title = options.Title,
            Message = options.Message,
            Group = options.Group,
            AppId = options.AppId,
            Value = options.Value ?? 0,
            Status = options.Status,
            IsPaused = false,
            OriginalButtons = options.Buttons
        };

        var toastOptions = new ToastOptions
        {
            Id = id,
            Title = options.Title,
            Message = options.Message,
            Group = options.Group,
            AppId = options.AppId,   // ← passed through
            Buttons = options.Buttons,
            Duration = "long",
            Progress = new ProgressOptions
            {
                Value = options.Value ?? 0,
                Status = options.Status,
                Indeterminate = options.Indeterminate
            }
        };

        Show(id, toastOptions);
    }

    /// <summary>
    /// Pause a progress toast - re-shows with paused status and Resume button
    /// </summary>
    public void PauseProgress(string id, List<ToastButton>? pausedButtons, string? pausedMessage = null)
    {
        if (!_progressStates.TryGetValue(id, out var state))
            return;

        state.IsPaused = true;

        // Dismiss current notification first
        Dismiss(id);

        // Small delay to ensure dismiss completes
        Task.Delay(100).Wait();

        // Re-show with paused state
        var toastOptions = new ToastOptions
        {
            Id = id,
            Title = state.Title,
            Message = pausedMessage ?? "Paused",
            Group = state.Group,
            AppId = state.AppId,
            Buttons = pausedButtons ?? new List<ToastButton>
            {
                new() { Id = "resume", Text = "Resume" },
                new() { Id = "cancel", Text = "Cancel" }
            },
            Duration = "long",
            Progress = new ProgressOptions
            {
                Value = state.Value,
                Status = "Paused"
            }
        };

        Show(id, toastOptions);

        // Reset suppress flag so future user dismisses show the dialog
        state.SuppressNextDismissDialog = false;
    }

    /// <summary>
    /// Resume a paused progress toast - re-shows with original buttons
    /// </summary>
    public void ResumeProgress(string id, List<ToastButton>? resumeButtons, string? resumeMessage = null)
    {
        if (!_progressStates.TryGetValue(id, out var state))
            return;

        state.IsPaused = false;

        // Dismiss current notification first
        Dismiss(id);

        // Small delay to ensure dismiss completes
        Task.Delay(100).Wait();

        // Re-show with active state
        var toastOptions = new ToastOptions
        {
            Id = id,
            Title = state.Title,
            Message = resumeMessage ?? state.Message,
            Group = state.Group,
            AppId = state.AppId,
            Buttons = resumeButtons ?? state.OriginalButtons ?? new List<ToastButton>
            {
                new() { Id = "pause", Text = "Pause" },
                new() { Id = "cancel", Text = "Cancel" }
            },
            Duration = "long",
            Progress = new ProgressOptions
            {
                Value = state.Value,
                Status = state.Status
            }
        };

        Show(id, toastOptions);

        // Reset suppress flag so future user dismisses show the dialog
        state.SuppressNextDismissDialog = false;
    }

    /// <summary>
    /// Re-open a dismissed progress toast, restoring it in its previous state
    /// (paused or active) with the correct buttons and progress value.
    /// </summary>
    public void ReopenProgress(string id, bool isPaused)
    {
        if (!_progressStates.TryGetValue(id, out var state))
            return;

        if (isPaused)
        {
            var toastOptions = new ToastOptions
            {
                Id = id,
                Title = state.Title,
                Message = "Paused",
                Group = state.Group,
                AppId = state.AppId,
                Buttons = new List<ToastButton>
            {
                new() { Id = "resume", Text = "Resume" },
                new() { Id = "cancel", Text = "Cancel" }
            },
                Duration = "long",
                Progress = new ProgressOptions
                {
                    Value = state.Value,
                    Status = "Paused"
                }
            };
            Show(id, toastOptions);

            // Reset suppress flag so future user dismisses show the dialog
            state.SuppressNextDismissDialog = false;
        }
        else
        {
            var toastOptions = new ToastOptions
            {
                Id = id,
                Title = state.Title,
                Message = state.Message,
                Group = state.Group,
                AppId = state.AppId,
                Buttons = state.OriginalButtons ?? new List<ToastButton>
            {
                new() { Id = "pause", Text = "Pause" },
                new() { Id = "cancel", Text = "Cancel" }
            },
                Duration = "long",
                Progress = new ProgressOptions
                {
                    Value = state.Value,
                    Status = state.Status
                }
            };
            Show(id, toastOptions);

            // Reset suppress flag so future user dismisses show the dialog
            state.SuppressNextDismissDialog = false;
        }
    }

    /// <summary>
    /// Complete a progress toast
    /// </summary>
    public void CompleteProgress(string id, ProgressCompleteOptions? options)
    {
        // Update to 100%
        UpdateProgress(id, 1.0, "Complete");

        if (options?.ReplaceWithSuccessToast == true || options?.ShowSuccessToast == true)
        {
            Task.Run(async () =>
            {
                await Task.Delay(500);

                var meta = _toastMeta.GetValueOrDefault(id);
                Dismiss(id);

                Show($"{id}-success", new ToastOptions
                {
                    Title = options.SuccessTitle ?? "Complete",
                    Message = options.SuccessMessage ?? "Operation completed successfully",
                    Group = meta?.Group,
                    AppId = meta?.AppId  // ← kept on success toast
                });
            });
        }
    }

    /// <summary>
    /// Dismiss a single toast
    /// </summary>
    public void Dismiss(string id)
    {
        try
        {
            // Set suppress flag if this is a progress toast
            if (_progressStates.ContainsKey(id))
            {
                _progressStates[id].SuppressNextDismissDialog = true;
            }

            var meta = _toastMeta.GetValueOrDefault(id);
            RemoveToast(id, meta?.Group ?? "default", meta?.AppId);

            _activeToasts.TryRemove(id, out _);
            // Don't remove progress data/meta for progress toasts - they're being paused/resumed
            if (!_progressStates.ContainsKey(id))
            {
                _progressData.TryRemove(id, out _);
                _toastMeta.TryRemove(id, out _);
            }
        }
        catch { }
    }

    /// <summary>
    /// Dismiss all toasts
    /// </summary>
    public void DismissAll()
    {
        try
        {
            ToastNotificationManagerCompat.History.Clear();
            _activeToasts.Clear();
            _progressData.Clear();
            _toastMeta.Clear();
        }
        catch { }
    }

    /// <summary>
    /// Dismiss all toasts in a group
    /// </summary>
    public void DismissGroup(string group)
    {
        try
        {
            // Find any appId associated with this group
            var appId = _toastMeta.Values.FirstOrDefault(m => m.Group == group)?.AppId;
            RemoveGroupToast(group, appId);

            var toRemove = _toastMeta.Where(kv => kv.Value.Group == group).Select(kv => kv.Key).ToList();
            foreach (var id in toRemove)
            {
                _activeToasts.TryRemove(id, out _);
                _progressData.TryRemove(id, out _);
                _toastMeta.TryRemove(id, out _);
            }
        }
        catch { }
    }

    /// <summary>
    /// Handle toast activation from ToastNotificationManagerCompat.OnActivated
    /// </summary>
    public void HandleActivation(ToastNotificationActivatedEventArgsCompat args)
    {
        var argDict = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(args.Argument))
        {
            foreach (var part in args.Argument.Split('&'))
            {
                var kv = part.Split('=', 2);
                if (kv.Length == 2)
                    argDict[kv[0]] = Uri.UnescapeDataString(kv[1]);
            }
        }

        var toastId = argDict.GetValueOrDefault("toastId") ?? "unknown";
        var meta = _toastMeta.GetValueOrDefault(toastId);

        Dictionary<string, string>? inputs = null;
        if (args.UserInput?.Count > 0)
        {
            inputs = new Dictionary<string, string>();
            foreach (var kv in args.UserInput)
                inputs[kv.Key] = kv.Value?.ToString() ?? "";
        }

        if (argDict.TryGetValue("action", out var action))
        {
            OnAction?.Invoke(new ActionEvent
            {
                Id = toastId,
                Action = action,
                Inputs = inputs,
                Group = meta?.Group,
                AppId = meta?.AppId
            });
        }
        else
        {
            OnClick?.Invoke(new ClickEvent
            {
                Id = toastId,
                Inputs = inputs,
                Group = meta?.Group,
                AppId = meta?.AppId
            });
        }

        _activeToasts.TryRemove(toastId, out _);
    }
}