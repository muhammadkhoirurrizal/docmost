import { mergeAttributes } from "@tiptap/core";
import TiptapLink from "@tiptap/extension-link";
import { Plugin } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

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
            }

            return false;
          },
        },
      }),
    ];
  },
});
