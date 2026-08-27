import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ActionIcon, UnstyledButton, Button, Menu } from "@mantine/core";
import {
  IconTable, IconCalendar, IconTimeline, IconColumns, IconPlus, IconChevronDown
} from "@tabler/icons-react";
import { useState } from "react";
import TableView from "./views/table-view";
import CalendarView from "./views/calendar-view";
import TimelineCanvas from "./views/timeline-canvas";
import KanbanBoard from "./views/kanban-board";
import DatabaseRowDrawer from "./database-item-drawer";
import DatabaseInitSelector from "./database-init-selector";
import ViewSettingsPanel from "./view-settings-panel";
import { applyFilters, applySorts } from "./data-engine";
import { DatabaseRow, DatabasePropertySchema, DatabaseView, createDefaultProperty, DatabasePropertyType, DatabaseViewLayout } from "@docmost/editor-ext";
import dayjs from "dayjs";

const VIEW_ICONS: Record<string, JSX.Element> = {
  table: <IconTable size={14} />,
  kanban: <IconColumns size={14} />,
  timeline: <IconTimeline size={14} />,
  calendar: <IconCalendar size={14} />,
};

export default function DatabaseBlockView(props: NodeViewProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<DatabaseRow | null>(null);

  const attrs = props.node.attrs;
  const properties = attrs.schema as DatabasePropertySchema[];
  const items = attrs.rows as DatabaseRow[];
  const views = attrs.views as DatabaseView[];
  const activeViewId = attrs.activeViewId as string;
  const isUninitialized = attrs.isUninitialized as boolean;
  const activeView = views.find(v => v.id === activeViewId) || views[0];

  // Process data with engine
  const filteredItems = applyFilters(items, activeView.filter || [], properties);
  const processedItems = applySorts(filteredItems, activeView.sort || [], properties);

  // Compute which property IDs are visible in this view
  // visibility = [] means all visible; otherwise it's an explicit allow-list
  const visiblePropIds: string[] | undefined = (activeView.visibility && activeView.visibility.length > 0)
    ? activeView.visibility
    : undefined;

  const updateItem = (updatedItem: DatabaseRow) => {
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    props.updateAttributes({ rows: newItems });
    // keep selectedItem in sync if it's the one being updated
    if (selectedItem?.id === updatedItem.id) setSelectedItem(updatedItem);
  };

  const addItem = () => {
    addItemWithProps({});
  };

  const addItemWithProps = (overrideProps: Record<string, any>) => {
    // Generate initial properties dynamically from schema
    const initProps: Record<string, any> = {};
    properties.forEach(prop => {
      if (overrideProps[prop.id] !== undefined) {
        initProps[prop.id] = overrideProps[prop.id];
      } else if (prop.type === "date") {
        initProps[prop.id] = { start: dayjs().toISOString(), end: dayjs().add(1, "day").toISOString() };
      } else if (prop.type === "status" || prop.type === "select") {
        // Default to first option if available
        initProps[prop.id] = prop.options?.[0]?.id ?? null;
      } else {
        initProps[prop.id] = prop.id === "title" ? "" : null;
      }
    });
    const newItem: DatabaseRow = {
      id: `item-${Date.now()}`,
      properties: initProps,
      content: null,
    };
    props.updateAttributes({ rows: [...items, newItem] });
    setSelectedItem(newItem);
  };

  const openItem = (id: string) => {
    const found = items.find(i => i.id === id) || null;
    setSelectedItem(found);
  };

  const handleAddView = (layout: DatabaseViewLayout) => {
    const newViewId = `view-${Date.now()}`;
    const newView: DatabaseView = {
      id: newViewId,
      name: layout.charAt(0).toUpperCase() + layout.slice(1),
      layout,
      visibility: properties.map(p => p.id),
      filter: [],
      sort: [],
      groupBy: null,
    };
    props.updateAttributes({ 
      views: [...views, newView],
      activeViewId: newViewId
    });
  };

  const handleCreateDateProperty = (target: "calendarBy" | "calendarEnd") => {
    const newProp = createDefaultProperty("date");
    newProp.name = "Date";
    const newProperties = [...properties, newProp];
    const newViews = views.map(v => {
      if (v.id === activeView.id) {
        return { ...v, [target]: newProp.id };
      }
      return v;
    });
    props.updateAttributes({ schema: newProperties, views: newViews });
  };

  if (isUninitialized) {
    return (
      <NodeViewWrapper
        className="database-block"
        data-drag-handle="true"
        style={{ width: "100%", margin: "2rem 0" }}
      >
        <DatabaseInitSelector 
          layoutName={activeView.name}
          onNewDatabase={() => {
            props.updateAttributes({ isUninitialized: false });
          }}
          onSelectDataSource={() => {}}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="database-block"
      data-drag-handle="true"
      style={{ width: "100%", margin: "2rem 0", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
      <div style={{ display: "flex", flexDirection: "column", background: "var(--mantine-color-body)" }}>

        {/* Database Title */}
        <input
          type="text"
          value={attrs.title}
          onChange={e => props.updateAttributes({ title: e.target.value })}
          placeholder="Untitled database"
          style={{
            fontSize: 20, fontWeight: 600, color: "var(--mantine-color-text)",
            background: "transparent", border: "none", outline: "none",
            width: "100%", padding: "0 0 10px 0",
          }}
        />

        {/* Toolbar — matches Notion exactly: views left, actions right */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: "1px solid var(--mantine-color-default-border)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          padding: "2px 0",
        }}>
          {/* Left: View tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {views.map(view => {
              const isActive = view.id === activeViewId;
              return (
                <UnstyledButton
                  key={view.id}
                  onClick={() => props.updateAttributes({ activeViewId: view.id })}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px",
                    fontSize: 13, fontWeight: isActive ? 500 : 400,
                    color: isActive ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                    borderBottom: isActive ? "2px solid var(--mantine-color-text)" : "2px solid transparent",
                    transition: "color .1s ease",
                  }}
                >
                  {VIEW_ICONS[view.layout]}
                  {view.name}
                  {isActive && <IconChevronDown size={12} style={{ opacity: 0.5 }} />}
                </UnstyledButton>
              );
            })}
            <Menu withinPortal position="bottom-start" width={160}>
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm" c="dimmed" style={{ marginLeft: 4 }}>
                  <IconPlus size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconTable size={14} />} onClick={() => handleAddView("table")}>Table</Menu.Item>
                <Menu.Item leftSection={<IconColumns size={14} />} onClick={() => handleAddView("kanban")}>Board</Menu.Item>
                <Menu.Item leftSection={<IconCalendar size={14} />} onClick={() => handleAddView("calendar")}>Calendar</Menu.Item>
                <Menu.Item leftSection={<IconTimeline size={14} />} onClick={() => handleAddView("timeline")}>Timeline</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>

          {/* Right: Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, paddingRight: 8 }}>
            <ViewSettingsPanel 
              view={activeView}
              schema={properties}
              onUpdateView={(updates) => {
                const newViews = views.map(v => v.id === activeView.id ? { ...v, ...updates } : v);
                props.updateAttributes({ views: newViews });
              }}
              onDeleteView={views.length > 1 ? () => {
                const newViews = views.filter(v => v.id !== activeView.id);
                props.updateAttributes({ views: newViews, activeViewId: newViews[0].id });
              } : undefined}
              onCreateDateProperty={(target) => handleCreateDateProperty(target as "calendarBy" | "calendarEnd")}
            />
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", marginLeft: 4 }}>
              <Button
                size="xs"
                color="blue"
                variant="filled"
                onClick={addItem}
                style={{ height: 26, padding: "0 10px", fontSize: 13, borderRadius: "6px 0 0 6px" }}
              >
                New
              </Button>
              <Button size="xs" color="blue" variant="filled" style={{ height: 26, padding: "0 6px", borderRadius: "0 6px 6px 0", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>
                <IconChevronDown size={12} />
              </Button>
            </div>
          </div>
        </div>

        {/* View Content */}
        <div style={{
          minHeight: 300,
          border: "1px solid var(--mantine-color-default-border)",
          borderTop: "none",
          borderRadius: "0 0 var(--mantine-radius-md) var(--mantine-radius-md)",
          overflow: "hidden",
        }}>
          {activeView.layout === "table" && (
            <TableView
              items={processedItems}
              properties={properties}
              visiblePropIds={visiblePropIds}
              onUpdateItem={updateItem}
              onOpenItem={openItem}
              onAddRow={addItem}
              onAddProperty={(type) => {
                const newProp = createDefaultProperty(type as DatabasePropertyType);
                props.updateAttributes({ schema: [...properties, newProp] });
              }}
            />
          )}
          {activeView.layout === "kanban" && (
            <KanbanBoard
              items={processedItems}
              properties={properties}
              visiblePropIds={visiblePropIds}
              onUpdateItem={updateItem}
              onOpenItem={openItem}
              groupByPropId={activeView.groupBy || undefined}
              dateGroupMode={activeView.dateGroupMode}
              onAddRow={(propId, val) => addItemWithProps({ [propId]: val })}
            />
          )}
          {activeView.layout === "calendar" && (
            <CalendarView
              view={activeView}
              items={processedItems}
              properties={properties}
              onUpdateItem={updateItem}
              onOpenItem={openItem}
              onAddItem={addItemWithProps}
            />
          )}
          {activeView.layout === "timeline" && (
            <TimelineCanvas
              items={processedItems}
              properties={properties}
              onUpdateItem={updateItem}
              onOpenItem={openItem}
            />
          )}
        </div>

      </div>

      <DatabaseRowDrawer
        item={selectedItem}
        properties={properties}
        opened={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={updateItem}
        onAddProperty={(type) => {
          const newProp = createDefaultProperty(type as DatabasePropertyType);
          props.updateAttributes({ schema: [...properties, newProp] });
        }}
        onUpdatePropertySchema={(propId, updatedProp) => {
          const newProps = properties.map(p => p.id === propId ? updatedProp : p);
          props.updateAttributes({ schema: newProps });
        }}
        onDeletePropertySchema={(propId) => {
          const newProps = properties.filter(p => p.id !== propId);
          props.updateAttributes({ schema: newProps });
        }}
        parentEditor={props.editor}
      />
    </NodeViewWrapper>
  );
}
