import { Editor } from "@tiptap/core";
import { TableMap } from "@tiptap/pm/tables";
import { Node } from "@tiptap/pm/model";

const NUMBER_COLUMN_WIDTH = 60;

/**
 * Insert a narrow numbering column at the leftmost position of the table.
 *
 * If the first row is a header row the top cell receives the label "No"
 * and body rows receive sequential integers (1, 2, 3, …).
 */
export function autoNumberCells(editor: Editor, startFrom: number = 1): void {
  if (!editor.isActive("table")) return;

  const { state } = editor;
  const { selection, schema } = state;

  // ---- Locate the table containing the cursor ----
  const table = findTableNode(state.doc.resolve(selection.anchor));
  if (!table) return;

  const map = TableMap.get(table.node);
  const firstCellOffset = map.map[0]; // row 0, col 0
  if (firstCellOffset === undefined) return;

  // ---- Step 1: insert a column to the left of the first column ----
  editor
    .chain()
    .focus()
    .setTextSelection(table.start + firstCellOffset + 1)
    .addColumnBefore()
    .run();

  // ---- Step 2: re-locate the table now that the column was added ----
  const newState = editor.state;
  const newTable = findTableNode(newState.doc.resolve(newState.selection.anchor));
  if (!newTable) return;

  const newMap = TableMap.get(newTable.node);

  const columnCells = newMap.cellsInRect({
    left: 0,
    right: 1,
    top: 0,
    bottom: newMap.height,
  });

  const tr = newState.tr;
  let counter = startFrom;

  for (const cellMapPos of columnCells) {
    const absPos = tr.mapping.map(newTable.start + cellMapPos);
    const cellNode = newTable.node.nodeAt(cellMapPos);

    if (!cellNode) continue;

    const isHeader = cellNode.type.name === "tableHeader";

    // Set a narrow column width
    tr.setNodeMarkup(absPos, null, {
      ...cellNode.attrs,
      colwidth: [NUMBER_COLUMN_WIDTH],
    });

    // Replace cell content
    const contentFrom = tr.mapping.map(newTable.start + cellMapPos + 1);
    const contentTo = tr.mapping.map(
      newTable.start + cellMapPos + cellNode.nodeSize - 1,
    );

    const text = isHeader ? "No" : String(counter);
    const paragraphNode = schema.nodes.paragraph?.create(null, schema.text(text));

    if (paragraphNode) {
      tr.replaceWith(contentFrom, contentTo, paragraphNode);
    }

    if (!isHeader) counter++;
  }

  editor.view.dispatch(tr);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface TableInfo {
  node: Node;
  start: number;
  depth: number;
}

function findTableNode($pos: {
  depth: number;
  node: (depth: number) => Node;
  start: (depth: number) => number;
}): TableInfo | null {
  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === "table") {
      return { node, start: $pos.start(d), depth: d };
    }
  }
  return null;
}
