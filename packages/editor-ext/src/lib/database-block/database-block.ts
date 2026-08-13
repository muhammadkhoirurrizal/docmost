import {
  mergeAttributes,
  Node,
} from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export type DatabasePropertyType = "text" | "select" | "date" | "user" | "status";

export interface DatabasePropertyOption {
  id: string;
  label: string;
  color: string;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: DatabasePropertyType;
  options?: DatabasePropertyOption[];
}

export interface DatabaseItem {
  id: string;
  properties: Record<string, any>;
  content?: any; // Content for the side-peek (Tiptap JSON)
}

export type DatabaseViewType = "table" | "timeline" | "calendar";

export interface DatabaseView {
  id: string;
  name: string;
  type: DatabaseViewType;
}

export interface DatabaseBlockOptions {
  HTMLAttributes: Record<string, any>;
  view: any;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    databaseBlock: {
      insertDatabaseBlock: () => ReturnType;
    };
  }
}

const DEFAULT_PROPERTIES: DatabaseProperty[] = [
  { id: "title", name: "Name", type: "text" },
  { id: "status", name: "Status", type: "status", options: [
    { id: "todo", label: "To Do", color: "gray" },
    { id: "in-progress", label: "In Progress", color: "blue" },
    { id: "done", label: "Done", color: "green" },
  ]},
  { id: "date", name: "Date", type: "date" },
  { id: "assignee", name: "Assignee", type: "user" }
];

export const DatabaseBlock = Node.create<DatabaseBlockOptions>({
  name: "databaseBlock",

  addOptions() {
    return {
      HTMLAttributes: {},
      view: null,
    };
  },

  group: "block",
  atom: true,
  draggable: true,
  selectable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({ "data-id": attributes.id }),
      },
      title: {
        default: "New Database",
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
      activeViewId: {
        default: "view-timeline",
        parseHTML: (element) => element.getAttribute("data-active-view-id"),
        renderHTML: (attributes) => ({ "data-active-view-id": attributes.activeViewId }),
      },
      views: {
        default: [
          { id: "view-timeline", name: "Timeline", type: "timeline" },
          { id: "view-table", name: "Table", type: "table" },
          { id: "view-calendar", name: "Calendar", type: "calendar" },
        ],
        parseHTML: (element) => {
          const views = element.getAttribute("data-views");
          return views ? JSON.parse(views) : null;
        },
        renderHTML: (attributes) => ({ "data-views": JSON.stringify(attributes.views) }),
      },
      properties: {
        default: DEFAULT_PROPERTIES,
        parseHTML: (element) => {
          const props = element.getAttribute("data-properties");
          return props ? JSON.parse(props) : null;
        },
        renderHTML: (attributes) => ({ "data-properties": JSON.stringify(attributes.properties) }),
      },
      items: {
        default: [],
        parseHTML: (element) => {
          const items = element.getAttribute("data-items");
          return items ? JSON.parse(items) : null;
        },
        renderHTML: (attributes) => ({ "data-items": JSON.stringify(attributes.items) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addCommands() {
    return {
      insertDatabaseBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: `db-${Date.now()}`,
              items: [],
            },
          });
        },
    } as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(this.options.view);
  },
});
