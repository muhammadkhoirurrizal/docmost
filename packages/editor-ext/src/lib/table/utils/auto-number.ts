import type { Editor } from "@tiptap/core";
import { TableMap } from "@tiptap/pm/tables";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node } from "@tiptap/pm/model";

const NUMBER_COLUMN_WIDTH = 60;

export interface NumberColumnReference {
  index: number;
  cellCount: number;
  numberCount: number;
  hasNo: boolean;
  startFrom: number;
}

interface TableInfo {
  node: Node;
  start: number;
}

interface ColumnCell {
  offset: number;
  node: Node;
}

/**
 * Add a number column, or refresh the existing number column, for the table
 * containing the current selection.
 */
export function autoNumberCells(editor: Editor, startFrom: number = 1): void {
  if (!editor.isActive("table")) return;

  const { state } = editor;
  const table = findTableNode(state.doc.resolve(state.selection.anchor));
  if (!table) return;

  const map = TableMap.get(table.node);
  const firstCellOffset = map.map[0];
  if (firstCellOffset === undefined) return;

  const numberedColumn = findValidNumberColumn(table.node, map);
  if (numberedColumn) {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        updateAutoNumberCells(editor, startFrom, tr, false, numberedColumn);
        return true;
      })
      .run();
    return;
  }

  // A marker is an explicit integrity signal. Never create or adopt a
  // different column when the marked column is malformed.
  if (hasAnyRowNumberMarker(table.node)) return;

  const legacyHeader = findLegacyNumberHeader(table.node, map);
  if (legacyHeader) {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        const currentTable = findTableNode(tr.doc.resolve(tr.selection.anchor));
        if (!currentTable) return false;

        const currentMap = TableMap.get(currentTable.node);
        const currentLegacyHeader = findLegacyNumberHeader(
          currentTable.node,
          currentMap,
        );
        if (!currentLegacyHeader) return false;

        updateNumberColumn(editor, currentTable, tr, startFrom, 0, false);
        return true;
      })
      .run();
    return;
  }

  const createHeader =
    table.node.nodeAt(firstCellOffset)?.type.name === "tableHeader";

  // Keep the selection behavior of the table command while doing the column
  // initialization in the same transaction as the column insertion.
  editor
    .chain()
    .focus()
    .setTextSelection(table.start + firstCellOffset + 1)
    .addColumnBefore()
    .command(({ tr }) => {
      const newTable = findTableNode(tr.doc.resolve(tr.selection.anchor));
      if (!newTable) return false;

      updateNumberColumn(
        editor,
        newTable,
        tr,
        startFrom,
        0,
        true,
        true,
        createHeader,
      );
      return true;
    })
    .run();
}

/**
 * Return the valid attributed number column in the selected table. A
 * reference contains the pre-command shape needed to safely refresh the same
 * column after a row insertion, deletion, or move.
 */
export function getValidNumberColumn(
  editor: Editor,
  state: EditorState = editor.state,
): NumberColumnReference | null {
  const table = findTableNode(state.doc.resolve(state.selection.anchor));
  if (!table) return null;

  return findValidNumberColumn(table.node, TableMap.get(table.node));
}

export function getValidNumberColumnIndex(
  editor: Editor,
  state: EditorState = editor.state,
): number | null {
  return getValidNumberColumn(editor, state)?.index ?? null;
}

/**
 * Refresh the attributed number column for the table containing the current
 * selection. This helper never creates or adopts a column.
 *
 * The optional transaction lets table commands update numbering before their
 * transaction is dispatched, avoiding a second nested transaction. When a
 * reference is supplied, it must be a valid column captured before a row
 * command; the post-command shape is checked before any content is changed.
 */
export function updateAutoNumberCells(
  editor: Editor,
  startFrom?: number,
  transaction?: Transaction,
  setWidth = false,
  column?: NumberColumnReference,
): void {
  const doc = transaction?.doc ?? editor.state.doc;
  const selection = transaction?.selection ?? editor.state.selection;
  const table = findTableNode(doc.resolve(selection.anchor));
  if (!table) return;

  const map = TableMap.get(table.node);
  const numberedColumn = column ?? findValidNumberColumn(table.node, map);
  if (!numberedColumn) return;

  const canRefresh = column
    ? canRefreshCapturedColumn(table.node, map, column)
    : true;
  if (!canRefresh) return;

  const tr = transaction ?? editor.state.tr;
  updateNumberColumn(
    editor,
    table,
    tr,
    startFrom ?? numberedColumn.startFrom,
    numberedColumn.index,
    false,
    setWidth,
  );

  if (!transaction && tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

/**
 * Return whether the current table is using row numbers. Only a valid,
 * attributed generated column counts; legacy text alone is not enough.
 */
export function isTableNumbered(
  editor: Editor,
  state: EditorState = editor.state,
): boolean {
  return getValidNumberColumn(editor, state) !== null;
}

function updateNumberColumn(
  editor: Editor,
  table: TableInfo,
  tr: Transaction,
  startFrom: number,
  columnIndex: number,
  initialize: boolean,
  setWidth = initialize,
  createHeader = initialize,
): void {
  const { schema } = editor.state;
  const map = TableMap.get(table.node);
  const cells = getColumnCells(table.node, map, columnIndex);
  if (!cells) return;

  const numberHeaderOffset = initialize
    ? createHeader
      ? (cells[0]?.offset ?? null)
      : null
    : findNumberHeaderOffset(cells);
  const mappingStart = tr.mapping.maps.length;
  let counter = startFrom;

  for (const [row, cell] of cells.entries()) {
    const cellPos = tr.mapping
      .slice(mappingStart)
      .map(table.start + cell.offset);
    const currentCell = tr.doc.nodeAt(cellPos);
    if (!currentCell) continue;

    const isNumberHeader = cell.offset === numberHeaderOffset;
    const cellType =
      initialize && createHeader && row === 0
        ? (schema.nodes.tableHeader ?? currentCell.type)
        : currentCell.type;
    const attrs = {
      ...currentCell.attrs,
      isRowNumber: true,
      ...(setWidth ? { colwidth: [NUMBER_COLUMN_WIDTH] } : {}),
    };

    tr.setNodeMarkup(cellPos, cellType, attrs);

    const updatedCell = tr.doc.nodeAt(cellPos);
    if (!updatedCell) continue;

    const text = isNumberHeader ? "No" : String(counter++);
    const paragraphNode = schema.nodes.paragraph?.create(
      null,
      schema.text(text),
    );
    if (!paragraphNode) continue;

    tr.replaceWith(
      cellPos + 1,
      cellPos + updatedCell.nodeSize - 1,
      paragraphNode,
    );
  }
}

function findValidNumberColumn(
  table: Node,
  map: TableMap,
): NumberColumnReference | null {
  if (!hasOnlyUnitSpans(table)) return null;

  const markedColumns: number[] = [];
  const columns: ColumnCell[][] = [];

  for (let column = 0; column < map.width; column++) {
    const cells = getColumnCells(table, map, column);
    if (!cells) return null;
    columns.push(cells);

    const markedCount = cells.filter(
      (cell) => cell.node.attrs.isRowNumber === true,
    ).length;
    if (markedCount > 0) markedColumns.push(column);
  }

  const validColumns = columns.filter((cells) =>
    cells.every((cell) => cell.node.attrs.isRowNumber === true),
  );
  if (validColumns.length !== 1 || markedColumns.length !== 1) return null;

  const index = columns.indexOf(validColumns[0]!);
  const cells = validColumns[0]!;
  let numberHeaderCount = 0;
  let numberCount = 0;
  let startFrom: number | null = null;
  let nextNumber: number | null = null;

  for (const cell of cells) {
    if (isGeneratedNoCell(cell.node)) {
      numberHeaderCount++;
      continue;
    }

    const value = generatedNumberValue(cell.node);
    if (value === null) return null;

    if (startFrom === null) {
      startFrom = value;
    } else if (value !== nextNumber) {
      return null;
    }

    nextNumber = value + 1;
    numberCount++;
  }

  if (numberHeaderCount > 1 || numberCount === 0 || startFrom === null) {
    return null;
  }

  return {
    index,
    cellCount: cells.length,
    numberCount,
    hasNo: numberHeaderCount === 1,
    startFrom,
  };
}

function findLegacyNumberHeader(table: Node, map: TableMap): ColumnCell | null {
  if (!hasOnlyUnitSpans(table)) return null;

  if (hasAnyRowNumberMarker(table)) return null;

  const firstColumn = getColumnCells(table, map, 0);
  if (!firstColumn) return null;

  const header = firstColumn[0];
  if (!header || !isLegacyNoCell(header.node)) return null;

  let expectedNumber = 1;
  let sawEmptyCell = false;

  for (const cell of firstColumn.slice(1)) {
    if (isEmptyCell(cell.node)) {
      sawEmptyCell = true;
      continue;
    }

    if (
      sawEmptyCell ||
      !isGeneratedCellContent(cell.node, String(expectedNumber))
    ) {
      return null;
    }

    expectedNumber++;
  }

  return header;
}

function canRefreshCapturedColumn(
  table: Node,
  map: TableMap,
  reference: NumberColumnReference,
): boolean {
  if (!hasOnlyUnitSpans(table)) return false;

  const cells = getColumnCells(table, map, reference.index);
  if (!cells) return false;
  if (!hasNoMarkedCellsOutsideColumn(table, map, reference.index)) {
    return false;
  }

  const delta = cells.length - reference.cellCount;
  const markedCells = cells.filter(
    (cell) => cell.node.attrs.isRowNumber === true,
  );
  const unmarkedCells = cells.filter(
    (cell) => cell.node.attrs.isRowNumber !== true,
  );

  if (delta > 0) {
    if (
      markedCells.length !== reference.cellCount ||
      unmarkedCells.length !== delta ||
      !unmarkedCells.every((cell) => isEmptyCell(cell.node))
    ) {
      return false;
    }
  } else if (delta <= 0) {
    if (markedCells.length !== cells.length || unmarkedCells.length !== 0) {
      return false;
    }
  }

  const numberValues: number[] = [];
  let noCount = 0;
  for (const cell of markedCells) {
    if (isGeneratedNoCell(cell.node)) {
      noCount++;
      continue;
    }

    const value = generatedNumberValue(cell.node);
    if (value === null) return false;
    numberValues.push(value);
  }

  if (noCount > 1 || (reference.hasNo === false && noCount !== 0)) {
    return false;
  }
  if (reference.hasNo && noCount === 0 && delta >= 0) return false;

  const uniqueValues = new Set(numberValues);
  const lastNumber = reference.startFrom + reference.numberCount - 1;
  if (
    uniqueValues.size !== numberValues.length ||
    numberValues.some(
      (value) => value < reference.startFrom || value > lastNumber,
    )
  ) {
    return false;
  }

  const missingNumbers = reference.numberCount - numberValues.length;
  if (delta === 0) {
    return noCount === (reference.hasNo ? 1 : 0) && missingNumbers === 0;
  }

  if (delta > 0) {
    return noCount === (reference.hasNo ? 1 : 0) && missingNumbers === 0;
  }

  const deletedNo = reference.hasNo && noCount === 0 ? 1 : 0;
  return missingNumbers === -delta - deletedNo;
}

function getColumnCells(
  table: Node,
  map: TableMap,
  column: number,
): ColumnCell[] | null {
  if (column < 0 || column >= map.width) return null;

  const seen = new Set<number>();
  const cells: ColumnCell[] = [];
  for (let row = 0; row < map.height; row++) {
    const offset = map.map[row * map.width + column];
    if (offset === undefined || seen.has(offset)) return null;

    const node = table.nodeAt(offset);
    if (!node) return null;

    seen.add(offset);
    cells.push({ offset, node });
  }

  return cells;
}

function hasNoMarkedCellsOutsideColumn(
  table: Node,
  map: TableMap,
  column: number,
): boolean {
  for (let currentColumn = 0; currentColumn < map.width; currentColumn++) {
    if (currentColumn === column) continue;
    const cells = getColumnCells(table, map, currentColumn);
    if (!cells || cells.some((cell) => cell.node.attrs.isRowNumber === true)) {
      return false;
    }
  }
  return true;
}

function hasOnlyUnitSpans(table: Node): boolean {
  let valid = true;
  table.forEach((row) => {
    row.forEach((cell) => {
      if (cell.attrs.colspan !== 1 || cell.attrs.rowspan !== 1) {
        valid = false;
      }
    });
  });
  return valid;
}

function findNumberHeaderOffset(cells: ColumnCell[]): number | null {
  let headerOffset: number | null = null;
  for (const cell of cells) {
    if (!isGeneratedNoCell(cell.node) && !isLegacyNoCell(cell.node)) {
      continue;
    }
    if (headerOffset !== null) return null;
    headerOffset = cell.offset;
  }
  return headerOffset;
}

function isGeneratedNoCell(node: Node): boolean {
  return isGeneratedCellContent(node, "No");
}

function isLegacyNoCell(node: Node): boolean {
  return (
    node.type.name === "tableHeader" &&
    node.textContent.trim().toLowerCase() === "no"
  );
}

function isGeneratedCellContent(node: Node, expected: string): boolean {
  const paragraph = node.childCount === 1 ? node.firstChild : null;
  const text = paragraph?.childCount === 1 ? paragraph.firstChild : null;

  return (
    paragraph?.type.name === "paragraph" &&
    text?.isText === true &&
    text.marks.length === 0 &&
    text.text === expected
  );
}

function generatedNumberValue(node: Node): number | null {
  if (!node.textContent.match(/^\d+$/)) return null;

  const value = Number(node.textContent);
  if (!Number.isSafeInteger(value)) return null;
  if (String(value) !== node.textContent) return null;
  if (!isGeneratedCellContent(node, node.textContent)) return null;
  return value;
}

function isEmptyCell(node: Node): boolean {
  const paragraph = node.childCount === 1 ? node.firstChild : null;
  return paragraph?.isTextblock === true && paragraph.childCount === 0;
}

function hasAnyRowNumberMarker(table: Node): boolean {
  let hasMarker = false;
  table.forEach((row) => {
    row.forEach((cell) => {
      if (cell.attrs.isRowNumber === true) {
        hasMarker = true;
      }
    });
  });
  return hasMarker;
}

function findTableNode($pos: {
  depth: number;
  node: (depth: number) => Node;
  start: (depth: number) => number;
}): TableInfo | null {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "table") {
      return { node, start: $pos.start(depth) };
    }
  }

  return null;
}
