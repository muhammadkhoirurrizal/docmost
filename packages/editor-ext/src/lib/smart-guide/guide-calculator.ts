import { ImageRect, GuideLine } from "./types";

const EDGE_THRESHOLD = 4;
const CENTER_THRESHOLD = 4;
const SPACING_THRESHOLD = 6;
const SIZE_THRESHOLD = 4; // pixels threshold for matching sizes

function verticalLine(x: number, y1: number, y2: number): GuideLine {
  return {
    x1: x,
    y1: Math.min(y1, y2),
    x2: x,
    y2: Math.max(y1, y2),
    type: 'edge',
    orientation: 'vertical',
  };
}

function horizontalLine(y: number, x1: number, x2: number): GuideLine {
  return {
    x1: Math.min(x1, x2),
    y1: y,
    x2: Math.max(x1, x2),
    y2: y,
    type: 'edge',
    orientation: 'horizontal',
  };
}

export function computeEdgeGuides(
  interacting: ImageRect,
  others: ImageRect[]
): GuideLine[] {
  const guides: GuideLine[] = [];

  for (const other of others) {
    if (other.pos === interacting.pos) continue;

    // Left edges aligned
    if (Math.abs(interacting.left - other.left) < EDGE_THRESHOLD) {
      guides.push({
        ...verticalLine(interacting.left, interacting.top, other.bottom),
        type: 'edge',
      });
    }

    // Right edges aligned
    if (Math.abs(interacting.right - other.right) < EDGE_THRESHOLD) {
      guides.push({
        ...verticalLine(interacting.right, interacting.top, other.bottom),
        type: 'edge',
      });
    }

    // Center X aligned
    if (Math.abs(interacting.centerX - other.centerX) < CENTER_THRESHOLD) {
      guides.push({
        ...verticalLine(interacting.centerX, interacting.top, other.bottom),
        type: 'center',
      });
    }

    // Top edges aligned
    if (Math.abs(interacting.top - other.top) < EDGE_THRESHOLD) {
      guides.push({
        ...horizontalLine(interacting.top, interacting.left, other.right),
        type: 'edge',
      });
    }

    // Bottom edges aligned
    if (Math.abs(interacting.bottom - other.bottom) < EDGE_THRESHOLD) {
      guides.push({
        ...horizontalLine(interacting.bottom, interacting.left, other.right),
        type: 'edge',
      });
    }

    // Center Y aligned
    if (Math.abs(interacting.centerY - other.centerY) < CENTER_THRESHOLD) {
      guides.push({
        ...horizontalLine(interacting.centerY, interacting.left, other.right),
        type: 'center',
      });
    }
  }

  return guides;
}

export function computeSizeGuides(
  interacting: ImageRect,
  others: ImageRect[]
): GuideLine[] {
  const guides: GuideLine[] = [];

  for (const other of others) {
    if (other.pos === interacting.pos) continue;

    // Same width - show vertical guides at both edges
    if (Math.abs(interacting.width - other.width) < SIZE_THRESHOLD) {
      // Left edge guide for same width
      guides.push({
        ...verticalLine(interacting.left, interacting.top, other.bottom),
        type: 'size',
      });

      // Right edge guide for same width
      guides.push({
        ...verticalLine(interacting.right, interacting.top, other.bottom),
        type: 'size',
      });
    }

    // Same height - show horizontal guides at both edges
    if (Math.abs(interacting.height - other.height) < SIZE_THRESHOLD) {
      // Top edge guide for same height
      guides.push({
        ...horizontalLine(interacting.top, interacting.left, other.right),
        type: 'size',
      });

      // Bottom edge guide for same height
      guides.push({
        ...horizontalLine(interacting.bottom, interacting.left, other.right),
        type: 'size',
      });
    }
  }

  return guides;
}

export function computePageCenterGuide(
  interacting: ImageRect,
  editorRect: DOMRect
): GuideLine | null {
  const pageCenterX = editorRect.left + editorRect.width / 2;

  if (Math.abs(interacting.centerX - pageCenterX) < CENTER_THRESHOLD) {
    return {
      x1: pageCenterX,
      y1: editorRect.top,
      x2: pageCenterX,
      y2: editorRect.bottom,
      type: 'page-center',
      orientation: 'vertical',
    };
  }

  return null;
}

export function computeSpacingGuides(
  interacting: ImageRect,
  others: ImageRect[]
): GuideLine[] {
  const guides: GuideLine[] = [];

  // Find images that are vertically adjacent (overlapping horizontally)
  const verticallyAdjacent = others.filter(
    (other) =>
      other.pos !== interacting.pos &&
      !(other.right < interacting.left || other.left > interacting.right)
  );

  // Check for images above and below
  const above = verticallyAdjacent.filter((other) => other.bottom <= interacting.top);
  const below = verticallyAdjacent.filter((other) => other.top >= interacting.bottom);

  for (const topImg of above) {
    for (const bottomImg of below) {
      const gapAbove = interacting.top - topImg.bottom;
      const gapBelow = bottomImg.top - interacting.bottom;

      if (Math.abs(gapAbove - gapBelow) < SPACING_THRESHOLD) {
        // Show spacing indicator lines
        const midY1 = topImg.bottom + gapAbove / 2;
        const midY2 = interacting.bottom + gapBelow / 2;
        const minX = Math.min(interacting.left, topImg.left, bottomImg.left);
        const maxX = Math.max(interacting.right, topImg.right, bottomImg.right);

        guides.push({
          x1: minX - 20,
          y1: midY1,
          x2: maxX + 20,
          y2: midY1,
          type: 'spacing',
          orientation: 'horizontal',
        });
      }
    }
  }

  return guides;
}

export function computeAllGuides(
  interacting: ImageRect,
  allImages: ImageRect[],
  editorRect: DOMRect
): GuideLine[] {
  const edgeGuides = computeEdgeGuides(interacting, allImages);
  const sizeGuides = computeSizeGuides(interacting, allImages);
  const pageCenterGuide = computePageCenterGuide(interacting, editorRect);
  const spacingGuides = computeSpacingGuides(interacting, allImages);

  const allGuides = [...edgeGuides, ...sizeGuides, ...spacingGuides];
  if (pageCenterGuide) {
    allGuides.push(pageCenterGuide);
  }

  return allGuides;
}
