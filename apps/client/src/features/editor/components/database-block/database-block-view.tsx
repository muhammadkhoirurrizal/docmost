import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Menu, UnstyledButton, Group, Button, TextInput } from "@mantine/core";
import { IconDots, IconTable, IconCalendar, IconTimeline, IconPlus, IconSearch, IconFilter, IconArrowsSort } from "@tabler/icons-react";
import { useState } from "react";
import TableView from "./views/table-view";
import CalendarView from "./views/calendar-view";
import TimelineCanvas from "./views/timeline-canvas";
import DatabaseItemDrawer from "./database-item-drawer";
import { DatabaseItem, DatabaseProperty, DatabaseView } from "@docmost/editor-ext";
import dayjs from "dayjs";

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
    const newItems = items.map(item => item.id === updatedItem.id ? updatedItem : item);
    props.updateAttributes({ items: newItems });
  };

  const addItem = () => {
    const newItem: DatabaseItem = {
      id: Math.random().toString(36).substr(2, 9),
      properties: {
        title: "",
        status: "not-started",
        date: { start: dayjs().toISOString(), end: dayjs().toISOString() }
      }
    };
    props.updateAttributes({ items: [...items, newItem] });
    setSelectedItem(newItem);
  };

  return (
    <NodeViewWrapper className="database-block" data-drag-handle="true" style={{ width: '100%', margin: '2rem 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <div style={{ display: "flex", flexDirection: "column", background: "var(--mantine-color-body)", borderRadius: "var(--mantine-radius-md)" }}>
        
        {/* Title Area */}
        <div style={{ padding: "0 8px 12px 8px" }}>
          <input 
            type="text" 
            value={attrs.title} 
            onChange={(e) => props.updateAttributes({ title: e.target.value })}
            placeholder="Untitled database" 
            style={{ fontSize: "20px", fontWeight: 600, color: "var(--mantine-color-text)", background: "transparent", border: "none", outline: "none", width: "100%" }} 
          />
        </div>

        {/* Toolbar (Notion Style) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--mantine-color-default-border)", borderTop: "1px solid var(--mantine-color-default-border)" }}>
          
          {/* Left: Views Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            {views.map(view => (
              <UnstyledButton
                key={view.id}
                onClick={() => props.updateAttributes({ activeViewId: view.id })}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "4px 10px",
                  borderBottom: activeViewId === view.id ? "2px solid var(--mantine-color-text)" : "2px solid transparent",
                  fontSize: "13px",
                  color: activeViewId === view.id ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                  fontWeight: activeViewId === view.id ? 500 : 400,
                  transition: "color 0.1s ease"
                }}
                className="hover-text-primary"
              >
                {view.type === "table" && <IconTable size={15} />}
                {view.type === "timeline" && <IconTimeline size={15} />}
                {view.type === "calendar" && <IconCalendar size={15} />}
                {view.name}
              </UnstyledButton>
            ))}
            <ActionIcon variant="subtle" size="sm" c="dimmed" style={{ marginLeft: "4px" }}>
              <IconPlus size={15} />
            </ActionIcon>
          </div>

          {/* Right: Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingRight: "8px" }}>
            <UnstyledButton style={{ fontSize: "13px", color: "var(--mantine-color-dimmed)", display: "flex", alignItems: "center", gap: "4px" }}>
              <IconFilter size={14} /> Filter
            </UnstyledButton>
            <UnstyledButton style={{ fontSize: "13px", color: "var(--mantine-color-dimmed)", display: "flex", alignItems: "center", gap: "4px" }}>
              <IconArrowsSort size={14} /> Sort
            </UnstyledButton>
            <ActionIcon variant="subtle" size="sm" c="dimmed">
              <IconSearch size={15} />
            </ActionIcon>
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm" c="dimmed"><IconDots size={15} /></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item color="red" onClick={() => (props as any).deleteNode()}>Delete Database</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button size="xs" color="blue" variant="filled" onClick={addItem} style={{ height: "24px", padding: "0 10px", fontSize: "13px", fontWeight: 500 }}>
              New
            </Button>
          </div>
        </div>

        {/* View Content */}
        <div style={{ minHeight: "400px", border: "1px solid var(--mantine-color-default-border)", borderTop: "none", borderBottomLeftRadius: "var(--mantine-radius-md)", borderBottomRightRadius: "var(--mantine-radius-md)", overflow: "hidden" }}>
          {activeView.type === "table" && <TableView items={items} properties={properties} onUpdateItem={updateItem} onOpenItem={(id) => setSelectedItem(items.find(i => i.id === id) || null)} />}
          {activeView.type === "calendar" && <CalendarView items={items} properties={properties} onUpdateItem={updateItem} onOpenItem={(id) => setSelectedItem(items.find(i => i.id === id) || null)} />}
          {activeView.type === "timeline" && <TimelineCanvas items={items} properties={properties} onUpdateItem={updateItem} onOpenItem={(id) => setSelectedItem(items.find(i => i.id === id) || null)} />}
        </div>

      </div>

      <DatabaseItemDrawer
        item={selectedItem}
        properties={properties}
        opened={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={updateItem}
      />
    </NodeViewWrapper>
  );
}
