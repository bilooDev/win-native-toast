using System.Runtime.InteropServices;

namespace ToastBridge;

/// <summary>
/// Shows native Win32 dialogs without requiring WinForms or WPF.
/// </summary>
public static class DialogService
{
    // Win32 MessageBox constants
    private const uint MB_YESNO = 0x00000004;
    private const uint MB_ICONQUESTION = 0x00000020;
    private const uint MB_TOPMOST = 0x00040000;
    private const uint MB_SETFOREGROUND = 0x00010000;
    private const int IDYES = 6;

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int MessageBox(
        IntPtr hWnd,
        string lpText,
        string lpCaption,
        uint uType);

    /// <summary>
    /// Shows a "Resume or Cancel?" confirmation dialog when the user swipes
    /// away a progress notification. Returns true if the user wants to resume,
    /// false if they want to cancel.
    /// </summary>
    /// <param name="title">The download/task title shown in the dialog body.</param>
    public static bool ShowCancelConfirmation(string title)
    {
        var text = $"\"{title}\" is still in progress.\n\nDo you want to resume it?";
        var caption = "Continue in background?";
        var flags = MB_YESNO | MB_ICONQUESTION | MB_TOPMOST | MB_SETFOREGROUND;

        var result = MessageBox(IntPtr.Zero, text, caption, flags);
        return result == IDYES; // Yes = resume, No = cancel
    }
}