import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Menu, UnstyledButton, Button } from "@mantine/core";
import {
  IconDots, IconTable, IconCalendar, IconTimeline, IconPlus,
  IconSearch, IconFilter, IconArrowsSort, IconChevronDown
} from "@tabler/icons-react";
import { useState } from "react";
import TableView from "./views/table-view";
import CalendarView from "./views/calendar-view";
import TimelineCanvas from "./views/timeline-canvas";
import DatabaseItemDrawer from "./database-item-drawer";
import { DatabaseItem, DatabaseProperty, DatabaseView } from "@docmost/editor-ext";
import dayjs from "dayjs";

const VIEW_ICONS: Record<string, JSX.Element> = {
  table: <IconTable size={14} />,
  timeline: <IconTimeline size={14} />,
  calendar: <IconCalendar size={14} />,
};

export default function DatabaseBlockView(props: NodeViewProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<DatabaseItem | null>(null);

  const attrs = props.node.attrs;
  const properties = attrs.properties as DatabaseProperty[];
  const items = attrs.items as DatabaseItem[];
  const views = attrs.views as DatabaseView[];
  const activeViewId = attrs.activeViewId as string;
  const activeView = views.find(v => v.id === activeViewId) || views[0];

  const updateItem = (updatedItem: DatabaseItem) => {
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    props.updateAttributes({ items: newItems });
    // keep selectedItem in sync if it's the one being updated
    if (selectedItem?.id === updatedItem.id) setSelectedItem(updatedItem);
  };

  const addItem = () => {
    const newItem: DatabaseItem = {
      id: `item-${Date.now()}`,
      properties: {
        title: "",
        status: "todo",
        date: { start: dayjs().toISOString(), end: dayjs().add(1, "day").toISOString() },
        assignee: null,
      },
      content: null,
    };
    props.updateAttributes({ items: [...items, newItem] });
    setSelectedItem(newItem);
  };

  const openItem = (id: string) => {
    const found = items.find(i => i.id === id) || null;
    setSelectedItem(found);
  };

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
                  {VIEW_ICONS[view.type]}
                  {view.name}
                  {isActive && <IconChevronDown size={12} style={{ opacity: 0.5 }} />}
                </UnstyledButton>
              );
            })}
            <ActionIcon variant="subtle" size="sm" c="dimmed" style={{ marginLeft: 4 }}>
              <IconPlus size={14} />
            </ActionIcon>
          </div>

          {/* Right: Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, paddingRight: 8 }}>
            <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, fontSize: 13, color: "var(--mantine-color-dimmed)" }}>
              <IconFilter size={13} /> Filter
            </UnstyledButton>
            <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, fontSize: 13, color: "var(--mantine-color-dimmed)" }}>
              <IconArrowsSort size={13} /> Sort
            </UnstyledButton>
            <ActionIcon variant="subtle" size="sm" c="dimmed">
              <IconSearch size={14} />
            </ActionIcon>
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm" c="dimmed"><IconDots size={14} /></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item color="red" onClick={() => (props as any).deleteNode()}>Delete Database</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            {/* Blue "New" button with dropdown */}
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
          {activeView.type === "table" && (
            <TableView items={items} properties={properties} onUpdateItem={updateItem} onOpenItem={openItem} />
          )}
          {activeView.type === "calendar" && (
            <CalendarView items={items} properties={properties} onUpdateItem={updateItem} onOpenItem={openItem} />
          )}
          {activeView.type === "timeline" && (
            <TimelineCanvas items={items} properties={properties} onUpdateItem={updateItem} onOpenItem={openItem} />
          )}
        </div>

      </div>

      <DatabaseItemDrawer
        item={selectedItem}
        properties={properties}
        opened={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={updateItem}
        onAddProperty={(type) => {
          const newProp: DatabaseProperty = {
            id: `prop-${Date.now()}`,
            name: `New ${type}`,
            type: type as any,
          };
          props.updateAttributes({ properties: [...properties, newProp] });
        }}
        parentEditor={props.editor}
      />
    </NodeViewWrapper>
  );
}
