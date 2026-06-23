import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

function findActiveColumnGroup(state: any) {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 1; depth--) {
    const node = $from.node(depth);
    const parent = $from.node(depth - 1);

    if (node.type.name === "column" && parent?.type.name === "columnGroup") {
      return {
        pos: $from.before(depth - 1),
        node: parent,
      };
    }
  }

  return null;
}

export const Column = Node.create({
  name: "column",

  content: "block+",

  isolating: true,

  priority: 2000,

  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            "data-width": attributes.width,
            style: `flex: 0 0 ${attributes.width}%; max-width: ${attributes.width}%;`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column",
        placeholder: "Type / to insert",
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Shift-Enter": () => {
        const columnGroup = findActiveColumnGroup(this.editor.state);
        if (!columnGroup) {
          return false;
        }

        const { tr } = this.editor.state;
        const pos = columnGroup.pos + columnGroup.node.nodeSize;

        tr.insert(pos, this.editor.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, pos + 1));
        this.editor.view.dispatch(tr);

        return true;
      },
    };
  },
});
