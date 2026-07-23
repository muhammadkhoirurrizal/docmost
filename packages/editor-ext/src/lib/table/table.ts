import { Table } from "@tiptap/extension-table";
import { Editor } from "@tiptap/core";
import { DOMOutputSpec } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { updateAutoNumberCells } from "./utils/auto-number";

const LIST_TYPES = ["bulletList", "orderedList", "taskList"];
const rowNumberingPluginKey = new PluginKey("tableRowNumbering");

function isInList(editor: Editor): boolean {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (LIST_TYPES.includes(node.type.name)) {
      return true;
    }
  }

  return false;
}

function handleListIndent(editor: Editor): boolean {
  return (
    editor.commands.sinkListItem("listItem") ||
    editor.commands.sinkListItem("taskItem")
  );
}

function handleListOutdent(editor: Editor): boolean {
  return (
    editor.commands.liftListItem("listItem") ||
    editor.commands.liftListItem("taskItem")
  );
}

export const CustomTable = Table.extend({
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      ...(this.parent?.() || []),
      new Plugin({
        key: rowNumberingPluginKey,
        appendTransaction: (transactions, oldState, newState) => {
          // Only react when the document actually changed.
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          // Skip transactions we generated ourselves to avoid loops.
          if (transactions.some((tr) => tr.getMeta(rowNumberingPluginKey))) {
            return null;
          }

          // Refresh the row-number column on the table at the current
          // selection. updateAutoNumberCells is a no-op when the cursor is
          // not in a numbered table, so this is safe to call broadly.
          const tr = newState.tr;
          updateAutoNumberCells(editor, undefined, tr, false);

          if (!tr.docChanged) return null;

          tr.setMeta(rowNumberingPluginKey, true);
          return tr;
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => {
        // If we're in a list within a table, handle list indentation
        if (isInList(this.editor) && this.editor.isActive("table")) {
          if (handleListIndent(this.editor)) {
            return true;
          }
        }

        // Otherwise, use default table navigation
        if (this.editor.commands.goToNextCell()) {
          return true;
        }

        if (!this.editor.can().addRowAfter()) {
          return false;
        }

        return this.editor.chain().addRowAfter().goToNextCell().run();
      },
      "Shift-Tab": () => {
        // If we're in a list within a table, handle list outdentation
        if (isInList(this.editor) && this.editor.isActive("table")) {
          if (handleListOutdent(this.editor)) {
            return true;
          }
        }

        // Otherwise, use default table navigation
        return this.editor.commands.goToPreviousCell();
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    // https://github.com/ueberdosis/tiptap/issues/4872#issuecomment-2717554498
    const originalRender = this.parent?.({ node, HTMLAttributes });
    const wrapper: DOMOutputSpec = [
      "div",
      { class: "tableWrapper" },
      originalRender,
    ];
    return wrapper;
  },
});
