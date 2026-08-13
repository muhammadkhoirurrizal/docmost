import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Menu, UnstyledButton } from "@mantine/core";
import { IconDots, IconTable, IconCalendar, IconTimeline, IconPlus, IconShare, IconStar } from "@tabler/icons-react";
import { useState } from "react";
import TableView from "./views/table-view";
import CalendarView from "./views/calendar-view";
import TimelineCanvas from "./views/timeline-canvas";
import DatabaseItemDrawer from "./database-item-drawer";
import { DatabaseItem, DatabaseProperty, DatabaseView } from "@docmost/editor-ext";

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
        date: new Date().toISOString()
      }
    };
    props.updateAttributes({ items: [...items, newItem] });
    setSelectedItem(newItem);
  };

  return (
    <NodeViewWrapper className="database-block" data-drag-handle="true" style={{ width: '100%', margin: '2rem 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <div style={{ display: "flex", flexDirection: "column", background: "var(--mantine-color-body)", border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-md)", overflow: "hidden" }}>
        
        {/* Top Breadcrumb Bar */}
        <div style={{ height: "44px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--mantine-color-dimmed)" }}>
            <span style={{ cursor: "pointer" }}>Bumi Studio's HQ</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ cursor: "pointer", color: "var(--mantine-color-text)" }}>Test Timeline</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ActionIcon variant="subtle" size="sm" c="dimmed"><IconShare size={15} /></ActionIcon>
            <ActionIcon variant="subtle" size="sm" c="dimmed"><IconStar size={15} /></ActionIcon>
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm" c="dimmed"><IconDots size={15} /></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item>Add View</Menu.Item>
                <Menu.Item color="red" onClick={() => (props as any).deleteNode()}>Delete Database</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>

        {/* Page Title */}
        <div style={{ padding: "28px 40px 4px" }}>
          <input 
            type="text" 
            value={attrs.title} 
            onChange={(e) => props.updateAttributes({ title: e.target.value })}
            placeholder="New database" 
            style={{ fontSize: "28px", fontWeight: 700, color: "var(--mantine-color-text)", background: "transparent", border: "none", outline: "none", width: "100%" }} 
          />
        </div>

        {/* Views Tabs (Notion Style) */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "8px 40px", borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          {views.map(view => (
            <UnstyledButton
              key={view.id}
              onClick={() => props.updateAttributes({ activeViewId: view.id })}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "14px",
                color: activeViewId === view.id ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                background: activeViewId === view.id ? "var(--mantine-color-dark-6)" : "transparent",
                fontWeight: activeViewId === view.id ? 500 : 400
              }}
            >
              {view.type === "table" && <IconTable size={16} />}
              {view.type === "timeline" && <IconTimeline size={16} />}
              {view.type === "calendar" && <IconCalendar size={16} />}
              {view.name}
            </UnstyledButton>
          ))}
          <div style={{ width: "1px", height: "16px", background: "var(--mantine-color-default-border)", margin: "0 8px" }} />
          <UnstyledButton style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "6px", fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
            <IconPlus size={16} /> Add View
          </UnstyledButton>
        </div>

        {/* View Content */}
        <div style={{ minHeight: "400px" }}>
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
