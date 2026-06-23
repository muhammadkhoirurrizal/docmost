import type { EditorView } from "@tiptap/pm/view";
import { Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { Fragment, Schema } from "@tiptap/pm/model";

const SIDE_DROP_THRESHOLD = 0.2; // 20% of block width
const SIDE_DROP_OUTSIDE_GUTTER = 180;
const MAX_COLUMNS = 5;

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

let draggedNodeInfo: {
  pos: number;
  nodeSize: number;
  typeName: string;
  json: unknown;
} | null = null;

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

function toColumnContent(node: ProseMirrorNode, schema: Schema): ProseMirrorNode {
  if (node.isBlock) {
    return node.copy(node.content);
  }

  const paragraphType = schema.nodes.paragraph;
  return paragraphType?.create(null, node) ?? node;
}

function ensureColumnContent(
  column: ProseMirrorNode,
  schema: Schema,
): Fragment | ProseMirrorNode {
  if (column.content.size > 0) {
    return column.content;
  }

  return schema.nodes.paragraph.create();
}

function getColumnContext(
  state: EditorView["state"],
  pos: number,
):
  | {
      columnGroupPos: number;
      columnGroupNode: ProseMirrorNode;
      columnPos: number;
      columnIndex: number;
    }
  | null {
  const resolvedPos = Math.min(pos + 1, state.doc.content.size);
  const $pos = state.doc.resolve(resolvedPos);

  for (let depth = $pos.depth; depth > 0; depth--) {
    const column = $pos.node(depth);
    const columnGroup = depth > 0 ? $pos.node(depth - 1) : null;

    if (column.type.name !== "column" || columnGroup?.type.name !== "columnGroup") {
      continue;
    }

    const columnPos = $pos.before(depth);
    const columnGroupPos = $pos.before(depth - 1);
    let columnIndex = 0;
    let found = false;

    columnGroup.forEach((child, _offset, index) => {
      if (!found && child === column) {
        columnIndex = index;
        found = true;
      }
    });

    return {
      columnGroupPos,
      columnGroupNode: columnGroup,
      columnPos,
      columnIndex,
    };
  }

  return null;
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
 * Find the block node at screen coordinates.
 */
function getBlockAtCoords(
  view: EditorView,
  event: DragEvent,
  xOffset = 0,
): { pos: number; node: ProseMirrorNode; dom: HTMLElement } | null {
  const coords = view.posAtCoords({
    left: event.clientX + xOffset,
    top: event.clientY,
  });

  if (!coords) return null;

  const $pos = view.state.doc.resolve(coords.pos);

  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (!node.type.isBlock || node.type.name === "doc") continue;

    const pos = $pos.before(depth);
    const dom = view.nodeDOM(pos) as HTMLElement;
    if (dom) {
      return { pos, node, dom };
    }
  }

  return null;
}

function getBlockNearCoords(
  view: EditorView,
  event: DragEvent,
): { pos: number; node: ProseMirrorNode; dom: HTMLElement } | null {
  const x = event.clientX;
  const y = event.clientY;
  let closest:
    | {
        pos: number;
        node: ProseMirrorNode;
        dom: HTMLElement;
        distance: number;
      }
    | null = null;

  view.state.doc.descendants((node, pos) => {
    if (!node.type.isBlock || node.type.name === "doc") return true;

    const dom = view.nodeDOM(pos) as HTMLElement | null;
    if (!dom) return true;

    const rect = dom.getBoundingClientRect();
    const isVerticallyAligned = y >= rect.top - 8 && y <= rect.bottom + 8;
    const isInSideGutter =
      x >= rect.left - SIDE_DROP_OUTSIDE_GUTTER &&
      x <= rect.right + SIDE_DROP_OUTSIDE_GUTTER;

    if (!isVerticallyAligned || !isInSideGutter) return true;

    const horizontalDistance =
      x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    const verticalDistance = Math.abs(y - (rect.top + rect.height / 2));
    const distance = horizontalDistance * 2 + verticalDistance;

    if (!closest || distance < closest.distance) {
      closest = { pos, node, dom, distance };
    }

    return true;
  });

  return closest
    ? { pos: closest.pos, node: closest.node, dom: closest.dom }
    : null;
}

function getDraggedNodeFromState(
  state: EditorView["state"],
): { pos: number; node: ProseMirrorNode } | null {
  const trackedPos = findDraggedNodePos(state);
  if (trackedPos !== null) {
    const trackedNode = state.doc.nodeAt(trackedPos);
    if (trackedNode) {
      return { pos: trackedPos, node: trackedNode };
    }
  }

  if (state.selection instanceof NodeSelection) {
    return {
      pos: state.selection.from,
      node: state.selection.node,
    };
  }

  return null;
}

/**
 * Call this on dragstart to remember the dragged block.
 */
export function trackDragStart(view: EditorView, event?: DragEvent) {
  if (event) {
    const target = event.target as HTMLElement | null;
    const isDragHandle = !!target?.closest?.(".drag-handle");
    const block =
      getBlockAtCoords(view, event) ||
      (isDragHandle
        ? getBlockAtCoords(view, event, 40) ||
          getBlockAtCoords(view, event, 80) ||
          getBlockAtCoords(view, event, 120)
        : null);
    if (block) {
      draggedNodeInfo = {
        pos: block.pos,
        nodeSize: block.node.nodeSize,
        typeName: block.node.type.name,
        json: block.node.toJSON(),
      };
      return;
    }
  }

  const { selection } = view.state;
  let pos: number;
  let nodeSize: number;
  let typeName: string;
  let json: unknown;

  if (selection instanceof NodeSelection) {
    pos = selection.from;
    nodeSize = selection.node.nodeSize;
    typeName = selection.node.type.name;
    json = selection.node.toJSON();
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
    json = node.toJSON();
  }

  draggedNodeInfo = { pos, nodeSize, typeName, json };
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

  // If not, search the document for the same serialized node.
  let foundPos: number | null = null;
  state.doc.descendants((node, pos) => {
    if (
      foundPos === null &&
      node.type.name === draggedNodeInfo!.typeName &&
      node.nodeSize === draggedNodeInfo!.nodeSize &&
      JSON.stringify(node.toJSON()) === JSON.stringify(draggedNodeInfo!.json)
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
  const hoveredBlock = getBlockAtCoords(view, event) || getBlockNearCoords(view, event);

  if (!hoveredBlock) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  const { pos: blockPos, node: blockNode, dom } = hoveredBlock;

  // Skip columns/column groups
  if (
    blockNode.type.name === "column" ||
    blockNode.type.name === "columnGroup"
  ) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  // Don't drop onto the dragged node itself
  const draggedPos = getDraggedNodeFromState(view.state)?.pos ?? null;
  if (draggedPos !== null && blockPos === draggedPos) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    return sideDropState;
  }

  const rect = dom.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const width = rect.width;

  const leftZone =
    relativeX < width * SIDE_DROP_THRESHOLD &&
    relativeX >= -SIDE_DROP_OUTSIDE_GUTTER;
  const rightZone =
    relativeX > width * (1 - SIDE_DROP_THRESHOLD) &&
    relativeX <= width + SIDE_DROP_OUTSIDE_GUTTER;

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
  const hasInternalDrag = !!draggedNodeInfo || view.state.selection instanceof NodeSelection;
  if (!sideDropState.active || sideDropState.targetPos === null || (!moved && !hasInternalDrag)) {
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

  const dragged = getDraggedNodeFromState(state);
  const draggedNode = dragged?.node ?? slice.content.firstChild;
  if (!draggedNode) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return false;
  }

  const draggedPos = dragged?.pos ?? null;
  if (
    draggedPos !== null &&
    draggedPos >= targetPos &&
    draggedPos < targetPos + targetNode.nodeSize
  ) {
    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    draggedNodeInfo = null;
    return true;
  }

  const { schema } = state;
  const columnType = schema.nodes.column;
  const columnGroupType = schema.nodes.columnGroup;

  if (!columnType || !columnGroupType) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return false;
  }

  const columnContext = getColumnContext(state, targetPos);
  if (columnContext) {
    if (columnContext.columnGroupNode.childCount >= MAX_COLUMNS) {
      cleanupAllVisuals();
      sideDropState = { active: false, side: null, targetPos: null };
      draggedNodeInfo = null;
      return true;
    }

    const tr = state.tr;

    if (draggedPos !== null && draggedPos !== targetPos) {
      tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
    }

    const mappedColumnGroupPos = tr.mapping.map(columnContext.columnGroupPos);
    const columnGroupAfterDelete = tr.doc.nodeAt(mappedColumnGroupPos);

    if (!columnGroupAfterDelete || columnGroupAfterDelete.type.name !== "columnGroup") {
      cleanupAllVisuals();
      sideDropState = { active: false, side: null, targetPos: null };
      draggedNodeInfo = null;
      return true;
    }

    const nextColumnCount = columnGroupAfterDelete.childCount + 1;
    const nextWidth = 100 / nextColumnCount;
    const insertIndex = side === "left" ? columnContext.columnIndex : columnContext.columnIndex + 1;
    const columns: ProseMirrorNode[] = [];

    columnGroupAfterDelete.forEach((column, _offset, index) => {
      if (index === insertIndex) {
        columns.push(
          columnType.create(
            { width: nextWidth },
            toColumnContent(draggedNode, schema),
          ),
        );
      }

      columns.push(
        columnType.create(
          { ...column.attrs, width: nextWidth },
          ensureColumnContent(column, schema),
        ),
      );
    });

    if (insertIndex >= columnGroupAfterDelete.childCount) {
      columns.push(
        columnType.create(
          { width: nextWidth },
          toColumnContent(draggedNode, schema),
        ),
      );
    }

    const nextColumnGroup = columnGroupType.create(
      columnGroupAfterDelete.attrs,
      columns,
    );

    tr.replaceWith(
      mappedColumnGroupPos,
      mappedColumnGroupPos + columnGroupAfterDelete.nodeSize,
      nextColumnGroup,
    );

    view.dispatch(tr);

    cleanupAllVisuals();
    sideDropState = { active: false, side: null, targetPos: null };
    draggedNodeInfo = null;
    return true;
  }

  // Build column contents based on drop side
  const firstColumnContent =
    side === "left"
      ? toColumnContent(draggedNode, schema)
      : toColumnContent(targetNode, schema);
  const secondColumnContent =
    side === "right"
      ? toColumnContent(draggedNode, schema)
      : toColumnContent(targetNode, schema);

  const columns = [
    columnType.create({ width: 50 }, firstColumnContent),
    columnType.create({ width: 50 }, secondColumnContent),
  ];

  const columnGroup = columnGroupType.create(null, columns);

  const tr = state.tr;

  // 1. Delete the original dragged node (MOVE, not copy)
  if (draggedPos !== null && draggedPos !== targetPos) {
    tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);
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
 * Handle normal block move drops so dragged blocks are moved, not duplicated.
 * Returns false for non-block drops so ProseMirror/file-drop can handle them.
 */
export function handleBlockMoveDrop(
  view: EditorView,
  event: DragEvent,
  slice: Slice,
  _moved: boolean,
): boolean {
  if (slice.content.childCount === 0 && !(view.state.selection instanceof NodeSelection)) {
    return false;
  }

  const state = view.state;
  const dragged = getDraggedNodeFromState(state);
  if (!dragged) return false;

  const { pos: draggedPos, node: draggedNode } = dragged;

  const dropTarget = getBlockAtCoords(view, event);
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!dropTarget && !coords) return false;

  const dropPos = dropTarget?.pos ?? coords!.pos;
  if (dropPos >= draggedPos && dropPos < draggedPos + draggedNode.nodeSize) {
    cleanupAllVisuals();
    draggedNodeInfo = null;
    return true;
  }

  let rawInsertPos: number;
  let insertBefore = false;

  if (dropTarget) {
    const rect = dropTarget.dom.getBoundingClientRect();
    insertBefore = event.clientY < rect.top + rect.height / 2;
    rawInsertPos = insertBefore
      ? dropTarget.pos
      : dropTarget.pos + dropTarget.node.nodeSize;
  } else {
    rawInsertPos = coords!.pos;
  }

  const tr = state.tr;
  tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);

  const mappedInsertPos = tr.mapping.map(rawInsertPos, insertBefore ? -1 : 1);
  tr.insert(mappedInsertPos, draggedNode);

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
