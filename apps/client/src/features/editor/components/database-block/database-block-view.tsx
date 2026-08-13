import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Tabs, Group, TextInput, ActionIcon, Menu, Button, Text } from "@mantine/core";
import { IconTable, IconCalendarEvent, IconPlus, IconDots, IconTimeline } from "@tabler/icons-react";
import TimelineView from "./views/timeline-view";
import TableView from "./views/table-view";
import CalendarView from "./views/calendar-view";
import { DatabaseItem, DatabaseProperty, DatabaseView } from "@docmost/editor-ext";
import DatabaseItemDrawer from "./database-item-drawer";

export default function DatabaseBlockView(props: NodeViewProps) {
  const { node, updateAttributes, editor } = props;
  
  const title = node.attrs.title as string;
  const views = node.attrs.views as DatabaseView[];
  const activeViewId = node.attrs.activeViewId as string;
  const properties = node.attrs.properties as DatabaseProperty[];
  const items = node.attrs.items as DatabaseItem[];

  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);

  const updateTitle = (newTitle: string) => updateAttributes({ title: newTitle });
  
  const setActiveView = (viewId: string) => updateAttributes({ activeViewId: viewId });

  const handleCreateItem = () => {
    const newItem: DatabaseItem = {
      id: `item-${Date.now()}`,
      properties: {
        title: "Untitled",
        status: "todo",
        date: new Date().toISOString(),
      },
      content: "",
    };
    updateAttributes({ items: [...items, newItem] });
    setDrawerItemId(newItem.id);
  };

  const handleUpdateItem = (updatedItem: DatabaseItem) => {
    const newItems = items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
    updateAttributes({ items: newItems });
  };

  const handleUpdateProperties = (newProps: DatabaseProperty[]) => {
    updateAttributes({ properties: newProps });
  };

  const activeView = views.find((v) => v.id === activeViewId) || views[0];

  const getIconForViewType = (type: string) => {
    switch (type) {
      case "table": return <IconTable size={16} />;
      case "timeline": return <IconTimeline size={16} />;
      case "calendar": return <IconCalendarEvent size={16} />;
      default: return <IconTable size={16} />;
    }
  };

  return (
    <NodeViewWrapper className="docmost-database-block" style={{ margin: "24px 0", border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-md)", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--mantine-color-default-border)", background: "var(--mantine-color-body)" }}>
        <TextInput
          variant="unstyled"
          size="lg"
          styles={{ input: { fontSize: "24px", fontWeight: 700, padding: 0, minHeight: "auto" } }}
          value={title}
          onChange={(e) => updateTitle(e.currentTarget.value)}
          placeholder="New Database"
        />
        
        <Group justify="space-between" mt="md">
          <Tabs value={activeViewId} onChange={(val) => val && setActiveView(val)} variant="pills" radius="sm">
            <Tabs.List>
              {views.map((view) => (
                <Tabs.Tab key={view.id} value={view.id} leftSection={getIconForViewType(view.type)}>
                  {view.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          <Group gap="xs">
            <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={handleCreateItem}>
              New
            </Button>
            <Menu>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray"><IconDots size={16} /></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item>Add View</Menu.Item>
                <Menu.Item color="red" onClick={() => (props as any).deleteNode()}>Delete Database</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </div>

      <div style={{ background: "var(--mantine-color-body)" }}>
        {activeView?.type === "timeline" && (
          <TimelineView items={items} properties={properties} onUpdateItem={handleUpdateItem} onOpenItem={setDrawerItemId} />
        )}
        {activeView?.type === "table" && (
          <TableView items={items} properties={properties} onUpdateItem={handleUpdateItem} onOpenItem={setDrawerItemId} />
        )}
        {activeView?.type === "calendar" && (
          <CalendarView items={items} properties={properties} onUpdateItem={handleUpdateItem} onOpenItem={setDrawerItemId} />
        )}
      </div>

      <DatabaseItemDrawer
        isOpen={!!drawerItemId}
        onClose={() => setDrawerItemId(null)}
        itemId={drawerItemId}
        items={items}
        properties={properties}
        onUpdateItem={handleUpdateItem}
        onUpdateProperties={handleUpdateProperties}
      />
    </NodeViewWrapper>
  );
}
