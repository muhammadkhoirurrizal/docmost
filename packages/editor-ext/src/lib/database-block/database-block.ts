import {
  mergeAttributes,
  Node,
} from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export type DatabasePropertyType = "text" | "number" | "select" | "multi_select" | "status" | "date" | "user" | "checkbox" | "url" | "email" | "phone";

export interface DatabasePropertyOption {
  id: string;
  label: string;
  color: string;
  group?: "todo" | "in_progress" | "complete";
}

export interface DatabasePropertySchema {
  id: string;
  name: string;
  type: DatabasePropertyType;
  options?: DatabasePropertyOption[];
}

export interface DatabaseRow {
  id: string;
  properties: Record<string, any>;
  content?: any; // Content for the side-peek (Tiptap JSON)
}

export type DatabaseViewLayout = "table" | "kanban" | "timeline" | "calendar";

export interface FilterRule {
  propId: string;
  op: "is" | "isNot" | "contains" | "isEmpty";
  value: any;
}

export interface SortRule {
  propId: string;
  dir: "asc" | "desc";
}

export interface DatabaseView {
  id: string;
  name: string;
  layout: DatabaseViewLayout;
  visibility: string[]; // Property IDs that are visible
  filter: FilterRule[];
  sort: SortRule[];
  groupBy: string | null;
}

export interface DatabaseBlockOptions {
  HTMLAttributes: Record<string, any>;
  view: any;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    databaseBlock: {
      insertDatabaseBlock: (options?: { initialLayout?: DatabaseViewLayout }) => ReturnType;
    };
  }
}

export const createDefaultProperty = (type: DatabasePropertyType, name?: string): DatabasePropertySchema => {
  const base: DatabasePropertySchema = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name || `New ${type}`,
    type,
  };

  if (type === "status") {
    base.options = [
      { id: "opt-todo", label: "Not started", color: "gray", group: "todo" },
      { id: "opt-prog", label: "In progress", color: "blue", group: "in_progress" },
      { id: "opt-done", label: "Done", color: "green", group: "complete" },
    ];
  }
  
  if (type === "select") {
    base.options = [];
  }

  return base;
};

const DEFAULT_PROPERTIES: DatabasePropertySchema[] = [
  { id: "title", name: "Name", type: "text" },
  { id: "status", name: "Status", type: "status", options: [
    { id: "todo", label: "Not started", color: "gray", group: "todo" },
    { id: "in-progress", label: "In progress", color: "blue", group: "in_progress" },
    { id: "done", label: "Done", color: "green", group: "complete" },
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
        default: "view-table",
        parseHTML: (element) => element.getAttribute("data-active-view-id"),
        renderHTML: (attributes) => ({ "data-active-view-id": attributes.activeViewId }),
      },
      isUninitialized: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-uninitialized") === "true",
        renderHTML: (attributes) => ({ "data-uninitialized": attributes.isUninitialized }),
      },
      views: {
        default: [
          { 
            id: "view-table", 
            name: "Table View", 
            layout: "table",
            visibility: ["title", "status", "date", "assignee"],
            filter: [], sort: [], groupBy: null
          }
        ],
        parseHTML: (element) => {
          const views = element.getAttribute("data-views");
          return views ? JSON.parse(views) : null;
        },
        renderHTML: (attributes) => ({ "data-views": JSON.stringify(attributes.views) }),
      },
      // Note: We keep the attribute name "data-properties" and "data-items" in HTML 
      // for backwards compatibility, but map them to schema/rows conceptually.
      schema: {
        default: DEFAULT_PROPERTIES,
        parseHTML: (element) => {
          // Backward compatibility: try properties first, then schema
          const props = element.getAttribute("data-properties") || element.getAttribute("data-schema");
          return props ? JSON.parse(props) : null;
        },
        renderHTML: (attributes) => ({ "data-schema": JSON.stringify(attributes.schema) }),
      },
      rows: {
        default: [],
        parseHTML: (element) => {
          // Backward compatibility: try items first, then rows
          const items = element.getAttribute("data-items") || element.getAttribute("data-rows");
          return items ? JSON.parse(items) : null;
        },
        renderHTML: (attributes) => ({ "data-rows": JSON.stringify(attributes.rows) }),
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
        (options: { initialLayout?: DatabaseViewLayout } = {}) =>
        ({ commands }) => {
          const initialLayout = options.initialLayout || "table";
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: `db-${Date.now()}`,
              isUninitialized: true,
              activeViewId: `view-${initialLayout}`,
              views: [{
                id: `view-${initialLayout}`,
                name: `${initialLayout.charAt(0).toUpperCase() + initialLayout.slice(1)} View`,
                layout: initialLayout,
                visibility: ["title", "status", "date", "assignee"],
                filter: [], sort: [], groupBy: null
              }],
              rows: [],
            },
          });
        },
    } as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(this.options.view);
  },
});
