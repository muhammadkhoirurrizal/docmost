import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnGroup: {
      insertColumns: (attributes?: { widths?: number[] }) => ReturnType;
      updateColumnLayout: (widths: number[]) => ReturnType;
      setColumnCount: (count: number) => ReturnType;
      deleteColumnGroup: () => ReturnType;
      convertToColumns: (attributes?: { columnCount?: number; widths?: number[] }) => ReturnType;
    };
  }
}

export const ColumnGroup = Node.create({
  name: "columnGroup",

  group: "block",

  content: "column+",

  isolating: true,

  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'section[data-type="columns"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "columns" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertColumns:
        (attributes?: { widths?: number[] }) =>
        ({ commands }) => {
          const widths = attributes?.widths || [50, 50];
          const content = widths.map((width) => ({
            type: "column",
            attrs: { width },
            content: [
              {
                type: "paragraph",
              },
            ],
          }));

          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content,
          });
        },

      updateColumnLayout:
        (widths: number[]) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          let columnGroupPos = -1;
          let columnGroupNode: any = null;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === this.name) {
              columnGroupPos = pos;
              columnGroupNode = node;
              return false;
            }
          });

          if (columnGroupPos === -1) {
            return false;
          }

          if (dispatch) {
            const tr = state.tr;
            columnGroupNode.content.forEach(
              (column: any, offset: number, index: number) => {
                if (widths[index] !== undefined) {
                  const pos = columnGroupPos + 1 + offset;
                  tr.setNodeMarkup(pos, undefined, {
                    ...column.attrs,
                    width: widths[index],
                  });
                }
              },
            );
            dispatch(tr);
          }

          return true;
        },

      setColumnCount:
        (count: number) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          let columnGroupPos = -1;
          let columnGroupNode: any = null;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === this.name) {
              columnGroupPos = pos;
              columnGroupNode = node;
              return false;
            }
          });

          if (columnGroupPos === -1) {
            return false;
          }

          if (dispatch) {
            const tr = state.tr;
            const currentContent: any[] = [];
            columnGroupNode.content.forEach((column: any) => {
              currentContent.push(column.content);
            });

            const newWidth = 100 / count;
            const newColumns = [];

            for (let i = 0; i < count; i++) {
              newColumns.push(
                state.schema.nodes.column.create(
                  { width: newWidth },
                  currentContent[i] || state.schema.nodes.paragraph.create(),
                ),
              );
            }

            // If we are reducing columns, append leftover content to the last column
            if (currentContent.length > count) {
              const lastColumn = newColumns[newColumns.length - 1];
              let combinedContent = lastColumn.content;
              for (let i = count; i < currentContent.length; i++) {
                combinedContent = combinedContent.append(currentContent[i]);
              }
              newColumns[newColumns.length - 1] =
                state.schema.nodes.column.create(
                  { width: newWidth },
                  combinedContent,
                );
            }

            tr.replaceWith(
              columnGroupPos,
              columnGroupPos + columnGroupNode.nodeSize,
              state.schema.nodes.columnGroup.create(
                columnGroupNode.attrs,
                newColumns,
              ),
            );
            dispatch(tr);
          }

          return true;
        },

      deleteColumnGroup:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          let columnGroupPos = -1;
          let columnGroupNode: any = null;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === this.name) {
              columnGroupPos = pos;
              columnGroupNode = node;
              return false;
            }
          });

          if (columnGroupPos === -1) {
            return false;
          }

          if (dispatch) {
            const tr = state.tr;
            tr.delete(
              columnGroupPos,
              columnGroupPos + columnGroupNode.nodeSize,
            );
            dispatch(tr);
          }

          return true;
        },

      convertToColumns:
        (attributes?: { columnCount?: number; widths?: number[] }) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;

          // Find the depth of the current block (paragraph, heading, etc.)
          let blockDepth = $from.depth;
          while (blockDepth > 0 && $from.node(blockDepth).isInline) {
            blockDepth--;
          }

          const blockStart = $from.start(blockDepth);
          const blockEnd = $from.end(blockDepth);
          const blockNode = $from.node(blockDepth);

          if (!blockNode || blockNode.type.name === "columnGroup") {
            return false;
          }

          const columnCount = attributes?.columnCount || 2;
          const widths =
            attributes?.widths ||
            Array(columnCount).fill(100 / columnCount);

          const columns = [];

          // First column gets the existing block content
          columns.push(
            state.schema.nodes.column.create(
              { width: widths[0] },
              blockNode.copy(blockNode.content),
            ),
          );

          // Remaining columns get empty paragraphs
          for (let i = 1; i < columnCount; i++) {
            columns.push(
              state.schema.nodes.column.create(
                { width: widths[i] },
                state.schema.nodes.paragraph.create(),
              ),
            );
          }

          const columnGroup = state.schema.nodes.columnGroup.create(
            null,
            columns,
          );

          if (dispatch) {
            const tr = state.tr.replaceWith(
              blockStart - 1,
              blockEnd + 1,
              columnGroup,
            );
            dispatch(tr);
          }

          return true;
        },
    };
  },
});
