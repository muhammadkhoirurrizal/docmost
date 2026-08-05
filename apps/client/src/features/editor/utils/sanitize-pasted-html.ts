/**
 * Sanitize HTML pasted from external sources (Google Docs, Word, etc.)
 * so it renders correctly in both light and dark themes.
 *
 * 1. Strips Windows CF_HTML headers (StartFragment / EndFragment)
 * 2. Removes explicit black/white inline text colors so text inherits
 *    the editor theme color instead of forcing light-mode black on
 *    dark-mode backgrounds.
 */
export function sanitizePastedHtml(html: string): string {
  // --- 1. Strip CF_HTML headers ---
  let clean = html;
  if (clean.trimStart().startsWith("Version:")) {
    const startFrag = clean.indexOf("<!--StartFragment-->");
    const endFrag = clean.indexOf("<!--EndFragment-->");
    if (startFrag !== -1 && endFrag !== -1 && endFrag > startFrag) {
      clean = clean.slice(
        startFrag + "<!--StartFragment-->".length,
        endFrag,
      );
    } else {
      const firstTag = clean.indexOf("<");
      if (firstTag !== -1) clean = clean.slice(firstTag);
    }
  }

  // --- 2. Parse and strip black/white text colors ---
  const parser = new DOMParser();
  const doc = parser.parseFromString(clean, "text/html");

  const elementsWithStyle = doc.querySelectorAll("[style], font[color]");

  elementsWithStyle.forEach((el) => {
    if (el.hasAttribute("style")) {
      const style = el.getAttribute("style") || "";

      // Matches explicit black text colors
      const blackColorRe =
        /color\s*:\s*(#000000(?:ff)?|#000|black|rgb\(0\s*,\s*0\s*,\s*0\)|rgba\(0\s*,\s*0\s*,\s*0\s*,\s*(?:1|0?\.\d+)\)|hsl\(0\s*,\s*0%\s*,\s*0%\));?/gi;

      // Matches explicit white text colors
      const whiteColorRe =
        /color\s*:\s*(#ffffff(?:ff)?|#fff|white|rgb\(255\s*,\s*255\s*,\s*255\)|rgba\(255\s*,\s*255\s*,\s*255\s*,\s*(?:1|0?\.\d+)\)|hsl\(0\s*,\s*0%\s*,\s*100%\));?/gi;

      const newStyle = style
        .replace(blackColorRe, "")
        .replace(whiteColorRe, "");

      if (newStyle.trim() === "") {
        el.removeAttribute("style");
      } else {
        el.setAttribute("style", newStyle);
      }
    }

    if (
      el.tagName.toLowerCase() === "font" &&
      el.hasAttribute("color")
    ) {
      const color = el.getAttribute("color")?.toLowerCase() || "";
      const blackish = [
        "#000000",
        "#000000ff",
        "#000",
        "black",
      ];
      const whitish = [
        "#ffffff",
        "#ffffffff",
        "#fff",
        "white",
      ];
      if (blackish.includes(color) || whitish.includes(color)) {
        el.removeAttribute("color");
      }
    }
  });

  // --- 3. Normalize Toggle Blocks (Details) ---
  // External apps (Notion, Confluence) use standard <details> and <summary>.
  // Docmost Tiptap schema STRICTLY requires <summary data-type="detailsSummary"> 
  // and <div data-type="detailsContent"> as children.
  const detailsElements = doc.querySelectorAll("details");
  detailsElements.forEach((details) => {
    let summary = details.querySelector("summary");
    if (summary) {
      summary.setAttribute("data-type", "detailsSummary");
    } else {
      summary = doc.createElement("summary");
      summary.setAttribute("data-type", "detailsSummary");
      summary.textContent = "Toggle";
      details.insertBefore(summary, details.firstChild);
    }

    let contentDiv = details.querySelector('div[data-type="detailsContent"]');
    if (!contentDiv) {
      contentDiv = doc.createElement("div");
      contentDiv.setAttribute("data-type", "detailsContent");
      
      const children = Array.from(details.childNodes);
      children.forEach((child) => {
        if (child !== summary) {
          contentDiv.appendChild(child);
        }
      });
      details.appendChild(contentDiv);
    }
  });

  return doc.body.innerHTML;
}
