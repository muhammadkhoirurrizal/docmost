import { EditorView } from "@tiptap/pm/view";
import { ImageRect, GuideLine } from "./types";
import { computeAllGuides } from "./guide-calculator";

export class SmartGuideController {
  private svg: SVGSVGElement | null = null;
  private isActive = false;
  private cachedImageRects: ImageRect[] = [];
  private rafId: number | null = null;
  private editorView: EditorView;

  constructor(view: EditorView) {
    this.editorView = view;
  }

  startInteraction(pos: number): void {
    if (this.isActive) return;
    this.isActive = true;

    // Collect all image rects
    this.cachedImageRects = this.collectImageRects();

    // Create SVG overlay
    this.createSVG();
  }

  updateGuides(currentRect: DOMRect): void {
    if (!this.isActive || !this.svg) return;

    // Cancel previous frame if pending
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.renderGuides(currentRect);
    });
  }

  endInteraction(): void {
    if (!this.isActive) return;
    this.isActive = false;

    // Cancel pending frame
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Remove SVG
    this.removeSVG();
    this.cachedImageRects = [];
  }

  private collectImageRects(): ImageRect[] {
    const rects: ImageRect[] = [];
    const view = this.editorView;
    const doc = view.state.doc;

    doc.descendants((node, pos) => {
      if (node.type.name === "image") {
        const dom = view.nodeDOM(pos) as HTMLElement;
        if (dom) {
          const rect = dom.getBoundingClientRect();
          rects.push({
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
            pos,
          });
        }
      }
      return true;
    });

    return rects;
  }

  private createSVG(): void {
    if (this.svg) return;

    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(this.svg.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "9999",
    });

    document.body.appendChild(this.svg);
  }

  private removeSVG(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
  }

  private renderGuides(currentRect: DOMRect): void {
    if (!this.svg) return;

    // Build ImageRect from current rect
    const interacting: ImageRect = {
      left: currentRect.left,
      right: currentRect.right,
      top: currentRect.top,
      bottom: currentRect.bottom,
      centerX: currentRect.left + currentRect.width / 2,
      centerY: currentRect.top + currentRect.height / 2,
      width: currentRect.width,
      height: currentRect.height,
      pos: -1, // placeholder
    };

    // Get editor content rect
    const editorElement = this.editorView.dom;
    const editorRect = editorElement.getBoundingClientRect();

    // Compute guides
    const guides = computeAllGuides(interacting, this.cachedImageRects, editorRect);

    // Clear previous lines
    this.svg.innerHTML = "";

    // Render new guide lines
    for (const guide of guides) {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", String(guide.x1));
      line.setAttribute("y1", String(guide.y1));
      line.setAttribute("x2", String(guide.x2));
      line.setAttribute("y2", String(guide.y2));

      const color =
        guide.type === "page-center"
          ? "#70CFF8"
          : guide.type === "center"
            ? "#70CFF8"
            : guide.type === "spacing"
              ? "#FF9F43"
              : guide.type === "size"
                ? "#51CF66"  // Green for size matching
                : "#70CFF8";

      const opacity = guide.type === "page-center" ? "0.5" : "0.8";

      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "1");
      line.setAttribute("stroke-dasharray", "4,4");
      line.setAttribute("opacity", opacity);

      this.svg.appendChild(line);
    }
  }

  destroy(): void {
    this.endInteraction();
  }
}
