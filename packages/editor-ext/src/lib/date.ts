import { Node, mergeAttributes, InputRule } from "@tiptap/core";
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

  addInputRules() {
    const dateRegex = /(?:^|\s)((\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|May|June|July|August|October|December|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)(?:\s+(\d{4}))?)\s$/i;

    return [
      new InputRule({
        find: dateRegex,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          // match[0] is the full match including preceding space and trailing space
          // match[1] is the exact date string e.g. "8 Feb"
          // match[2] is the day e.g. "8"
          // match[3] is the month e.g. "Feb"
          // match[4] is the year (optional)
          
          const [, fullDateStr, dayStr, monthStr, yearStr] = match;
          const day = parseInt(dayStr, 10);

          const indonesianMonths: Record<string, number> = {
            januari: 0, jan: 0, january: 0,
            februari: 1, feb: 1, february: 1,
            maret: 2, mar: 2, march: 2,
            april: 3, apr: 3,
            mei: 4, may: 4,
            juni: 5, jun: 5, june: 5,
            juli: 6, jul: 6, july: 6,
            agustus: 7, agu: 7, aug: 7, august: 7,
            september: 8, sep: 8,
            oktober: 9, okt: 9, oct: 9, october: 9,
            november: 10, nov: 10,
            desember: 11, des: 11, dec: 11, december: 11
          };

          const month = indonesianMonths[monthStr.toLowerCase()];
          const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
          const date = new Date(year, month, day);

          // Calculate replacement range
          // We want to replace the fullDateStr and the trailing space, but KEEP the preceding space if any.
          const hasPrecedingSpace = match[0].match(/^\s/);
          const start = range.from + (hasPrecedingSpace ? 1 : 0);
          const end = range.to;

          const node = this.type.create({
            start: date.toISOString(),
            includeTime: false,
            format: "full",
          });

          tr.replaceWith(start, end, node);
        },
      }),
    ];
  },

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
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
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
