import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export interface DateOptions {
  HTMLAttributes: Record<string, any>;
  view: any;
}

export const TiptapDate = Node.create<DateOptions>({
  name: "tiptapDate",

  addOptions() {
    return {
      HTMLAttributes: {},
      view: null,
    };
  },

  group: "inline",
  inline: true,
  selectable: true,
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      start: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-start"),
        renderHTML: (attributes) => ({ "data-start": attributes.start }),
      },
      end: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-end"),
        renderHTML: (attributes) => ({ "data-end": attributes.end }),
      },
      includeTime: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-include-time") === "true",
        renderHTML: (attributes) => ({ "data-include-time": attributes.includeTime }),
      },
      format: {
        default: "full",
        parseHTML: (element) => element.getAttribute("data-format"),
        renderHTML: (attributes) => ({ "data-format": attributes.format }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-type": this.name, class: "tiptap-date" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(this.options.view);
  },
});
