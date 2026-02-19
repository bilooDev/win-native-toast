using System.Text.Json;
using System.Text.Json.Serialization;

namespace ToastBridge;

// ============================================================================
// Incoming Messages (Node → C#)
// ============================================================================

public class IpcMessage
{
    [JsonPropertyName("protocol")]
    public int Protocol { get; set; } = 1;

    [JsonPropertyName("cmd")]
    public string Cmd { get; set; } = "";

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("payload")]
    public JsonElement? Payload { get; set; }
}

public class ToastOptions
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("subtitle")]
    public string? Subtitle { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("heroImage")]
    public string? HeroImage { get; set; }

    [JsonPropertyName("appLogo")]
    public string? AppLogo { get; set; }

    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("appId")]
    public string? AppId { get; set; }

    [JsonPropertyName("silent")]
    public bool? Silent { get; set; }

    [JsonPropertyName("duration")]
    public string? Duration { get; set; }

    [JsonPropertyName("scenario")]
    public string? Scenario { get; set; }

    [JsonPropertyName("buttons")]
    public List<ToastButton>? Buttons { get; set; }

    [JsonPropertyName("inputs")]
    public List<ToastInput>? Inputs { get; set; }

    [JsonPropertyName("progress")]
    public ProgressOptions? Progress { get; set; }

    [JsonPropertyName("xml")]
    public string? Xml { get; set; }

    [JsonPropertyName("attribution")]
    public string? Attribution { get; set; }

    [JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }
}

public class ToastButton
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("text")]
    public string Text { get; set; } = "";

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("style")]
    public string? Style { get; set; }
}

public class ToastInput
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("placeholder")]
    public string? Placeholder { get; set; }

    [JsonPropertyName("defaultValue")]
    public string? DefaultValue { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("options")]
    public List<SelectionOption>? Options { get; set; }
}

public class SelectionOption
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}

public class ProgressOptions
{
    [JsonPropertyName("value")]
    public double? Value { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("indeterminate")]
    public bool? Indeterminate { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("valueStringOverride")]
    public string? ValueStringOverride { get; set; }
}

public class ProgressStartOptions : ProgressOptions
{
    [JsonPropertyName("title")]
    public new string Title { get; set; } = "";

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("appId")]
    public string? AppId { get; set; }

    [JsonPropertyName("buttons")]
    public List<ToastButton>? Buttons { get; set; }
}

public class ProgressCompleteOptions
{
    [JsonPropertyName("showSuccessToast")]
    public bool? ShowSuccessToast { get; set; }

    [JsonPropertyName("replaceWithSuccessToast")]
    public bool? ReplaceWithSuccessToast { get; set; }

    [JsonPropertyName("successTitle")]
    public string? SuccessTitle { get; set; }

    [JsonPropertyName("successMessage")]
    public string? SuccessMessage { get; set; }

    [JsonPropertyName("dismissDelay")]
    public int? DismissDelay { get; set; }
}

public class ProgressUpdatePayload
{
    [JsonPropertyName("value")]
    public double? Value { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("buttons")]
    public List<ToastButton>? Buttons { get; set; }
}

public class DismissGroupPayload
{
    [JsonPropertyName("group")]
    public string Group { get; set; } = "";
}

// ============================================================================
// Outgoing Events (C# → Node)
// ============================================================================

public class IpcEvent
{
    [JsonPropertyName("event")]
    public string Event { get; init; } = "";

    [JsonPropertyName("id")]
    public string? Id { get; set; }
}

public class ReadyEvent : IpcEvent
{
    public ReadyEvent() { }

    [JsonPropertyName("event")]
    public new string Event { get; init; } = "ready";

    [JsonPropertyName("capabilities")]
    public List<string> Capabilities { get; set; } = new() { "progress", "buttons", "inputs", "images" };
}

public class ActionEvent : IpcEvent
{
    public ActionEvent() { }

    [JsonPropertyName("event")]
    public new string Event { get; init; } = "action";

    [JsonPropertyName("action")]
    public string Action { get; set; } = "";

    [JsonPropertyName("inputs")]
    public Dictionary<string, string>? Inputs { get; set; }

    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("appId")]
    public string? AppId { get; set; }
}

public class ClickEvent : IpcEvent
{
    public ClickEvent() { }

    [JsonPropertyName("event")]
    public new string Event { get; init; } = "click";

    [JsonPropertyName("inputs")]
    public Dictionary<string, string>? Inputs { get; set; }

    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("appId")]
    public string? AppId { get; set; }
}

public class DismissedEvent : IpcEvent
{
    public DismissedEvent() { }

    [JsonPropertyName("event")]
    public new string Event { get; init; } = "dismissed";

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = "user";

    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("appId")]
    public string? AppId { get; set; }
}

public class FailedEvent : IpcEvent
{
    public FailedEvent() { }

    [JsonPropertyName("event")]
    public new string Event { get; init; } = "failed";

    [JsonPropertyName("error")]
    public string Error { get; set; } = "";

    [JsonPropertyName("code")]
    public string? Code { get; set; }
}

public class ErrorEvent : IpcEvent
{
    public ErrorEvent() { }

    [JsonPropertyName("event")]
    public new string Event { get; init; } = "error";

    [JsonPropertyName("error")]
    public string Error { get; set; } = "";

    [JsonPropertyName("fatal")]
    public bool? Fatal { get; set; }
}

public class ProgressReopenPayload
{
    [JsonPropertyName("isPaused")]
    public bool IsPaused { get; set; }
}
