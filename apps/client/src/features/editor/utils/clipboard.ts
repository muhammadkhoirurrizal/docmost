export async function copyToClipboard(text: string): Promise<void> {
  // Modern API - requires secure context (HTTPS) and user gesture
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback to legacy method
    }
  }

  // Legacy fallback - works on HTTP and is more reliable with proper focus handling
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);

  // Save current selection to restore later
  const selection = document.getSelection();
  const selectedRange = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand("copy");
    if (!success) {
      throw new Error("Copy command failed");
    }
  } catch {
    throw new Error("Failed to copy to clipboard");
  } finally {
    document.body.removeChild(textarea);

    // Restore previous selection
    if (selectedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
  }
}
