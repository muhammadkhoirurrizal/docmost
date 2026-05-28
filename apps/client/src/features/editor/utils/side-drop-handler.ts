import type { EditorView } from "@tiptap/pm/view";
import { Slice } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

const SIDE_DROP_THRESHOLD = 0.2; // 20% of block width

export interface SideDropState {
  active: boolean;
  side: "left" | "right" | null;
  targetPos: number | null;
}

let sideDropState: SideDropState = {
  active: false,
  side: null,
  targetPos: null,
};

let draggedNodeInfo: { pos: number; nodeSize: number; typeName: string } | null =
  null;

let indicatorEl: HTMLElement | null = null;
let previewEl: HTMLElement | null = null;

function createPreviewOverlay(): HTMLElement {
  const el = document.createElement("div");
  el.className = "side-drop-preview";
  el.style.cssText = `
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    gap: 8px;
    padding: 4px;
    pointer-events: none;
    z-index: 50;
    opacity: 0;
    transition: opacity 0.15s ease;
  `;

  const leftCol = document.createElement("div");
  leftCol.style.cssText = `
    flex: 1;
    border-radius: 4px;
    border: 2px dashed var(--mantine-color-blue-3, #74c0fc);
    background: rgba(34, 139, 230, 0.06);
  `;

  const rightCol = document.createElement("div");
  rightCol.style.cssText = leftCol.style.cssText;

  el.appendChild(leftCol);
  el.appendChild(rightCol);

  return el;
}

function showPreview(targetEl: HTMLElement, side: "left" | "right") {
  if (!previewEl) {
    previewEl = createPreviewOverlay();
  }

  const cols = previewEl.children as HTMLCollectionOf<HTMLElement>;
  cols[0].style.opacity = side === "left" ? "1" : "0.3";
  cols[0].style.borderStyle = side === "left" ? "solid" : "dashed";
  cols[0].style.background =
    side === "left"
      ? "rgba(34, 139, 230, 0.12)"
      : "rgba(34, 139, 230, 0.04)";

  cols[1].style.opacity = side === "right" ? "1" : "0.3";
  cols[1].style.borderStyle = side === "right" ? "solid" : "dashed";
  cols[1].style.background =
    side === "right"
      ? "rgba(34, 139, 230, 0.12)"
      : "rgba(34, 139, 230, 0.04)";

  previewEl.style.opacity = "1";
  previewEl.style.left = "0";
  previewEl.style.right = "0";

  if (previewEl.parentElement !== targetEl) {
    targetEl.appendChild(previewEl);
  }
}

function hidePreview() {
  if (previewEl) {
    previewEl.style.opacity = "0";
  }
}

function cleanupPreview() {
  if (previewEl && previewEl.parentElement) {
    previewEl.parentElement.removeChild(previewEl);
  }
  previewEl = null;
}

function showIndicator(targetEl: HTMLElement, side: "left" | "right") {
  if (!indicatorEl) {
    indicatorEl = document.createElement("div");
    indicatorEl.style.cssText = `
      position: absolute;
      top: 4px;
      bottom: 4px;
      width: 3px;
      background-color: var(--mantine-color-blue-filled, #228be6);
      border-radius: 2px;
      pointer-events: none;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 0 6px rgba(34, 139, 230, 0.4);
    `;
  }

  indicatorEl.style.left = side === "left" ? "6px" : "auto";
  indicatorEl.style.right = side === "right" ? "6px" : "auto";
  indicatorEl.style.opacity = "1";

  if (indicatorEl.parentElement !== targetEl) {
    targetEl.appendChild(indicatorEl);
  }
}

function hideIndicator() {
  if (indicatorEl) {
    indicatorEl.style.opacity = "0";
  }
}

function cleanupIndicator() {
  if (indicatorEl && indicatorEl.parentElement) {
    indicatorEl.parentElement.removeChild(indicatorEl);
  }
  indicatorEl = null;
}

function cleanupAllVisuals() {
  hideIndicator();
  hidePreview();
  cleanupIndicator();
  cleanupPreview();
}

/**
 * Call this on dragstart to remember the dragged block.
 */
export function trackDragStart(view: EditorView) {
  const { selection } = view.state;
  let pos: number;
  let nodeSize: number;
  let typeName: string;

  if (selection instanceof NodeSelection) {
    pos = selection.from;
    nodeSize = selection.node.nodeSize;
    typeName = selection.node.type.name;
  } else {
    const $from = selection.$from;
    let depth = $from.depth;
    while (depth > 0 && $from.node(depth).isInline) {
      depth--;
    }
    const node = $from.node(depth);
    pos = $from.start(depth) - 1;
    nodeSize = node.nodeSize;
    typeName = node.type.name;
  }

  draggedNodeInfo = { pos, nodeSize, typeName };
}

/**
 * Find the dragged node in the current document by matching position + type.
 * Returns the current position if still valid, otherwise searches for a matching node.
 */
function findDraggedNodePos(state: EditorView["state"]): number | null {
  if (!draggedNodeInfo) return null;

  // First, check if the node is still at the tracked position
  const nodeAtPos = state.doc.nodeAt(draggedNodeInfo.pos);
  if (nodeAtPos && nodeAtPos.type.name === draggedNodeInfo.typeName) {
    return draggedNodeInfo.pos;
  }

  // If not, search the document for a node with the same type and size
  let foundPos: number | null = null;
  state.doc.descendants((node, pos) => {
    if (
      foundPos === null &&
      node.type.name === draggedNodeInfo!.typeName &&
      node.nodeSize === draggedNodeInfo!.nodeSize
    ) {
      foundPos = pos;
      return false; // stop searching
    }
  });

  return foundPos;
}

/**
 * Track drag movement to show side-drop indicators.
 */
export function handleSideDragOver(
  view: EditorView,
  event: DragEvent,
): SideDropState {
  const coords = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });

  if (!coords) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  const $pos = view.state.doc.resolve(coords.pos);

  // Find the top-level block node
  let blockDepth = $pos.depth;
  while (
    blockDepth > 0 &&
    $pos.node(blockDepth).type.name !== "doc" &&
    !$pos.node(blockDepth).type.isBlock
  ) {
    blockDepth--;
  }

  const blockNode = $pos.node(blockDepth);
  if (!blockNode || blockNode.type.name === "doc") {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  // Skip columns/column groups
  if (
    blockNode.type.name === "column" ||
    blockNode.type.name === "columnGroup"
  ) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  const blockPos = $pos.start(blockDepth) - 1;

  // Don't drop onto the dragged node itself
  const draggedPos = findDraggedNodePos(view.state);
  if (draggedPos !== null && blockPos === draggedPos) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  const dom = view.nodeDOM(blockPos) as HTMLElement;
  if (!dom) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  const rect = dom.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const width = rect.width;

  const leftZone = relativeX < width * SIDE_DROP_THRESHOLD;
  const rightZone = relativeX > width * (1 - SIDE_DROP_THRESHOLD);

  if (leftZone || rightZone) {
    const side = leftZone ? "left" : "right";
    showIndicator(dom, side);
    showPreview(dom, side);
    sideDropState = {
      active: true,
      side,
      targetPos: blockPos,
    };
    return sideDropState;
  }

  cleanupAllVisuals();
  sideDropState = { active: false, side: null, targetPos: null };
  return sideDropState;
}

/**
 * Handle a side-drop. Returns true if handled.
 */
export function handleSideDrop(
  view: EditorView,
  _event: DragEvent,
  slice: Slice,
  moved: boolean,
): boolean {
  if (!sideDropState.active || !sideDropState.targetPos || !moved) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return false;
  }

  const { targetPos, side } = sideDropState;
  const state = view.state;
  const targetNode = state.doc.nodeAt(targetPos);

  if (!targetNode) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return false;
  }

  const draggedNode = slice.content.firstChild;
  if (!draggedNode) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return false;
  }

  const { schema } = state;
  const columnType = schema.nodes.column;
  const columnGroupType = schema.nodes.columnGroup;

  if (!columnType || !columnGroupType) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return false;
  }

  // Build column contents based on drop side
  const firstColumnContent =
    side === "left"
      ? draggedNode
      : targetNode.copy(targetNode.content);
  const secondColumnContent =
    side === "right"
      ? draggedNode
      : targetNode.copy(targetNode.content);

  const columns = [
    columnType.create({ width: 50 }, firstColumnContent),
    columnType.create({ width: 50 }, secondColumnContent),
  ];

  const columnGroup = columnGroupType.create(null, columns);

  const tr = state.tr;

  // 1. Delete the original dragged node (MOVE, not copy)
  const draggedPos = findDraggedNodePos(state);
  if (draggedPos !== null && draggedPos !== targetPos) {
    const dragged = state.doc.nodeAt(draggedPos);
    if (dragged) {
      tr.delete(draggedPos, draggedPos + dragged.nodeSize);
    }
  }

  // 2. Map target position through the deletion
  const mappedTarget = tr.mapping.map(targetPos);

  // 3. Replace target with the column group
  const targetAfterDelete = tr.doc.nodeAt(mappedTarget);
  if (targetAfterDelete) {
    tr.replaceWith(
      mappedTarget,
      mappedTarget + targetAfterDelete.nodeSize,
      columnGroup,
    );
  }

  view.dispatch(tr);

  cleanupAllVisuals();
  sideDropState = { active: false, side: null, targetPos: null };
  draggedNodeInfo = null;
  return true;
}

/**
 * Clean up everything when drag ends or leaves.
 */
export function cleanupSideDrop() {
  cleanupAllVisuals();
  sideDropState = { active: false, side: null, targetPos: null };
  draggedNodeInfo = null;
}
