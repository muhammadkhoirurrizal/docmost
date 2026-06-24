import { mergeAttributes } from "@tiptap/core";
import TiptapLink from "@tiptap/extension-link";
import { Plugin } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { TextSelection } from "@tiptap/pm/state";

export const LinkExtension = TiptapLink.extend({
  inclusive: false,

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-type="button"]):not([href *= "javascript:" i])',
        getAttrs: (element) => {
          if (
            element
              .getAttribute("href")
              ?.toLowerCase()
              .startsWith("javascript:")
          ) {
            return false;
          }

          return null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, any> = { ...HTMLAttributes, target: "_self" };

    if (attrs.href?.toLowerCase().startsWith("javascript:")) {
      return [
        "a",
        mergeAttributes(
          this.options.HTMLAttributes,
          { ...attrs, href: "" },
          { class: "link" },
        ),
        0,
      ];
    }

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, attrs, {
        class: "link",
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      ...(this.parent?.() || []),
      new Plugin({
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
            const { selection } = editor.state;

            if (event.key === "Escape" && selection.empty !== true) {
              editor.commands.focus(selection.to, { scrollIntoView: false });
              return true;
            }

            // Tab: convert inline link to InsertLink card
            if (event.key === "Tab" && !event.shiftKey && editor.isActive("link")) {
              event.preventDefault();

              const attrs = editor.getAttributes("link");
              const href = attrs.href as string;
              if (!href) return false;

              const { from } = selection;
              const $pos = editor.state.doc.resolve(from);

              // Find the link mark at cursor position
              const linkMark = $pos.marks().find(m => m.type.name === "link");
              if (!linkMark) return false;

              // Walk backwards to find the start of the link mark
              let start = from;
              while (start > 0) {
                const pos = editor.state.doc.resolve(start - 1);
                if (!pos.marks().some(m => m.type.name === "link")) break;
                start--;
              }

              // Walk forwards to find the end of the link mark
              let end = from;
              const docSize = editor.state.doc.content.size;
              while (end < docSize) {
                const pos = editor.state.doc.resolve(end);
                if (!pos.marks().some(m => m.type.name === "link")) break;
                end++;
              }

              // Get the link's display text
              const displayText = editor.state.doc.textBetween(start, end);

              // Replace inline link with InsertLink block node
              const tr = editor.state.tr;
              const insertLinkNode = editor.state.schema.nodes.insertLink;

              if (insertLinkNode) {
                tr.replaceWith(
                  start,
                  end,
                  insertLinkNode.create({
                    type: "url",
                    url: href,
                    title: displayText && displayText !== href ? displayText : "",
                  })
                );

                // Insert a new paragraph after the card for continuation
                const newPos = start + 1;
                tr.insert(newPos, editor.state.schema.nodes.paragraph.create());
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(newPos + 1))
                );

                view.dispatch(tr);
              }

              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
