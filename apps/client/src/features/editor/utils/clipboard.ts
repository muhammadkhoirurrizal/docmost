export async function copyToClipboard(text: string): Promise<void> {
  // Modern API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // lanjut ke fallback
    }
  }

  // Legacy fallback (HTTP-safe)
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const success = document.execCommand("copy");
    if (!success) {
      throw new Error("Copy command failed");
    }
  } catch {
    throw new Error("Failed to copy to clipboard");
  } finally {
    document.body.removeChild(textarea);
  }
}
