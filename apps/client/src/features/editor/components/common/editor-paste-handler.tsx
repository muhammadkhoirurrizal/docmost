import type { EditorView } from "@tiptap/pm/view";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { uploadImageAction } from "@/features/editor/components/image/upload-image-action.tsx";
import { uploadVideoAction } from "@/features/editor/components/video/upload-video-action.tsx";
import { uploadAttachmentAction } from "../attachment/upload-attachment-action";
import { createMentionAction } from "@/features/editor/components/link/internal-link-paste.ts";
import { INTERNAL_LINK_REGEX } from "@/lib/constants.ts";
import { uploadFile } from "@/features/page/services/page-service.ts";
import { sanitizePastedHtml } from "@/features/editor/utils/sanitize-pasted-html.ts";
import { find } from "linkifyjs";

const LOCAL_IMAGE_PREFIX = "/api/files/";

function isLocalImageSrc(src: string): boolean {
  return (
    src.startsWith(LOCAL_IMAGE_PREFIX) ||
    src.startsWith(window.location.origin + LOCAL_IMAGE_PREFIX)
  );
}

function htmlContainsImages(html: string): boolean {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.querySelectorAll("img").length > 0;
}

function insertHtmlSlice(view: EditorView, html: string) {
  const sanitized = sanitizePastedHtml(html);
  const doc = new DOMParser().parseFromString(sanitized, "text/html");
  const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(
    doc.body,
    { preserveWhitespace: true },
  );
  const { from, to } = view.state.selection;
  view.dispatch(view.state.tr.replaceRange(from, to, slice));
}

/**
 * Convert a data URI to a File object.
 */
async function dataUriToFile(dataUri: string): Promise<File | null> {
  try {
    const res = await fetch(dataUri);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1] || "png";
    return new File([blob], `pasted-image.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

async function processAndInsertHtml(
  view: EditorView,
  rawHtml: string,
  pageId: string,
) {
  const html = sanitizePastedHtml(rawHtml);

  const parserDoc = new DOMParser().parseFromString(html, "text/html");
  const images = parserDoc.querySelectorAll("img");

  // Process each image: data URIs -> upload; external URLs -> try fetch, else keep
  for (const img of images) {
    const src = img.getAttribute("src");
    if (!src) continue;

    if (src.startsWith("data:")) {
      const file = await dataUriToFile(src);
      if (file) {
        try {
          const attachment = await uploadFile(file, pageId);
          img.setAttribute(
            "src",
            `/api/files/${attachment.id}/${attachment.fileName}`,
          );
        } catch {
          // If upload fails, remove the image so we don't show broken base64
          img.remove();
        }
      } else {
        img.remove();
      }
    } else if (!isLocalImageSrc(src)) {
      // External URL: try to fetch and re-host
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(src, {
          mode: "cors",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const blob = await response.blob();
          const urlObj = new URL(src);
          const fileName =
            urlObj.pathname.split("/").pop() || "image.png";
          const file = new File([blob], fileName, {
            type: blob.type || "image/png",
          });
          const attachment = await uploadFile(file, pageId);
          img.setAttribute(
            "src",
            `/api/files/${attachment.id}/${attachment.fileName}`,
          );
        }
        // If fetch fails (e.g., CORS), keep the original src
        // The browser may still be able to display it if the user has cookies/session
      } catch {
        // Fetch failed (CORS, network, etc.) — keep original src
      }
    }
  }

  const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(
    parserDoc.body,
    { preserveWhitespace: true },
  );

  const { from, to } = view.state.selection;
  view.dispatch(view.state.tr.replaceRange(from, to, slice));
}

export const handlePaste = (
  view: EditorView,
  event: ClipboardEvent,
  pageId: string,
  creatorId?: string,
) => {
  // Debug logging
  const types = event.clipboardData?.types || [];
  const plainText = event.clipboardData?.getData("text/plain") || "";
  const rawHtml = event.clipboardData?.getData("text/html") || "";
  const filesCount = event.clipboardData?.files.length || 0;
  const itemsCount = event.clipboardData?.items.length || 0;

  const htmlPreview = rawHtml
    ? sanitizePastedHtml(rawHtml).substring(0, 800)
    : "(none)";
  const hasImgs = rawHtml ? htmlContainsImages(rawHtml) : false;

  console.log("[Paste Debug] types:", types);
  console.log("[Paste Debug] plainText preview:", plainText.substring(0, 200));
  console.log("[Paste Debug] html preview:", htmlPreview);
  console.log("[Paste Debug] hasImages:", hasImgs);
  console.log("[Paste Debug] files:", filesCount, "items:", itemsCount);

  const clipboardData = event.clipboardData.getData("text/plain");

  if (INTERNAL_LINK_REGEX.test(clipboardData)) {
    // we have to do this validation here to allow the default link extension to takeover if needs be
    event.preventDefault();
    const url = clipboardData.trim();
    const { from: pos, empty } = view.state.selection;
    const match = INTERNAL_LINK_REGEX.exec(url);
    const currentPageMatch = INTERNAL_LINK_REGEX.exec(window.location.href);

    // pasted link must be from the same workspace/domain and must not be on a selection
    if (!empty || match[2] !== window.location.host) {
      // allow the default link extension to handle this
      return false;
    }

    // for now, we only support internal links from the same space
    // compare space name
    if (currentPageMatch[4].toLowerCase() !== match[4].toLowerCase()) {
      return false;
    }

    const anchorId = match[6] ? match[6].split("#")[0] : undefined;
    const urlWithoutAnchor = anchorId
      ? url.substring(0, url.indexOf("#"))
      : url;
    createMentionAction(urlWithoutAnchor, view, pos, creatorId, anchorId);
    return true;
  }

  // If text is selected and a URL is pasted, turn the selection into a hyperlink (like Discord)
  if (!view.state.selection.empty) {
    const url = clipboardData.trim();
    const links = find(url, { defaultProtocol: "https" });
    const isUrl = links.some((item) => item.isLink && item.value === url);

    if (isUrl) {
      event.preventDefault();
      const { from, to } = view.state.selection;
      const href = links[0].href;
      const linkMark = view.state.schema.marks.link?.create({ href });
      if (linkMark) {
        view.dispatch(view.state.tr.addMark(from, to, linkMark));
      }
      return true;
    }
  }

  // If there are direct file blobs (e.g., copy-image from file system), upload them
  if (event.clipboardData?.files.length) {
    event.preventDefault();
    for (const file of event.clipboardData.files) {
      const pos = view.state.selection.from;
      uploadImageAction(file, view, pos, pageId);
      uploadVideoAction(file, view, pos, pageId);
      uploadAttachmentAction(file, view, pos, pageId);
    }
    return true;
  }

  // If HTML contains images (external URLs or data URIs), process them
  if (rawHtml && htmlContainsImages(rawHtml)) {
    event.preventDefault();
    processAndInsertHtml(view, rawHtml, pageId).catch(() => {
      // Fallback: insert sanitized HTML as-is
      try {
  const html = sanitizePastedHtml(rawHtml);
        insertHtmlSlice(view, html);
      } catch {
        // Last resort: plain text
        try {
          const text = event.clipboardData?.getData("text/plain") || "";
          const { from, to } = view.state.selection;
          view.dispatch(
            view.state.tr.replaceWith(from, to, view.state.schema.text(text)),
          );
        } catch {
          // Nothing we can do
        }
      }
    });
    return true;
  }

  // Check clipboard items for image blobs (screenshots, some browser copy behavior)
  if (event.clipboardData?.items.length) {
    const imageFiles: File[] = [];
    for (let i = 0; i < event.clipboardData.items.length; i++) {
      const item = event.clipboardData.items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      event.preventDefault();
      for (const file of imageFiles) {
        const pos = view.state.selection.from;
        uploadImageAction(file, view, pos, pageId);
      }
      return true;
    }
  }

  return false;
};

export const handleFileDrop = (
  view: EditorView,
  event: DragEvent,
  moved: boolean,
  pageId: string,
) => {
  if (!moved && event.dataTransfer?.files.length) {
    event.preventDefault();

    for (const file of event.dataTransfer.files) {
      const coordinates = view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });

      uploadImageAction(file, view, coordinates?.pos ?? 0 - 1, pageId);
      uploadVideoAction(file, view, coordinates?.pos ?? 0 - 1, pageId);
      uploadAttachmentAction(file, view, coordinates?.pos ?? 0 - 1, pageId);
    }
    return true;
  }
  return false;
};
