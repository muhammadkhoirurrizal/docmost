import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { applyGrouping } from "../data-engine";
import { Text, Group, UnstyledButton, Card, Badge, ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

interface KanbanBoardProps {
  items: DatabaseRow[];
  properties: DatabasePropertySchema[];
  onUpdateItem: (item: DatabaseRow) => void;
  onOpenItem: (itemId: string) => void;
  groupByPropId?: string; // Optional: specify which property to group by
}

export default function KanbanBoard({ items, properties, onUpdateItem, onOpenItem, groupByPropId }: KanbanBoardProps) {
  const { t } = useTranslation();

  // Find a valid property to group by if none provided
  const groupProp = groupByPropId 
    ? properties.find(p => p.id === groupByPropId)
    : properties.find(p => p.type === "status" || p.type === "select");

  if (!groupProp) {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>
        <Text c="dimmed">{t("No status or select property available to group by.")}</Text>
      </div>
    );
  }

  const groups = applyGrouping(items, groupProp.id, properties);

  // Determine columns to render
  const columns = groupProp.options ? [...groupProp.options] : [];
  
  // Add unassigned column
  const unassignedColumn = { id: "unassigned", label: t("No Status"), color: "gray" };

  const renderCard = (item: DatabaseRow) => {
    return (
      <Card 
        key={item.id} 
        withBorder 
        shadow="sm" 
        p="sm" 
        radius="md" 
        mb="sm"
        style={{ cursor: "pointer", transition: "box-shadow 0.2s" }}
        onClick={() => onOpenItem(item.id)}
        className="hover:shadow-md"
      >
        <Text fw={500} size="sm" mb="xs" style={{ wordBreak: "break-word" }}>
          {item.properties.title || "Untitled"}
        </Text>
        <Group gap="xs" mt="md">
          {/* Render other properties, e.g., Date and Assignee */}
          {properties.filter(p => p.id !== "title" && p.id !== groupProp.id).map(prop => {
            const val = item.properties[prop.id];
            if (!val) return null;
            
            if (prop.type === "date") {
              const dateVal = val as { start?: string, end?: string } | string;
              const startStr = typeof dateVal === 'object' ? dateVal.start : dateVal;
              if (startStr) {
                return <Badge key={prop.id} variant="light" color="gray" size="xs">{dayjs(startStr).format("MMM D")}</Badge>;
              }
            }
            if (prop.type === "user") {
              const userName = typeof val === "object" ? (val as any).name : val;
              return <Badge key={prop.id} variant="outline" color="blue" size="xs">{userName}</Badge>;
            }
            return null;
          })}
        </Group>
      </Card>
    );
  };

  return (
    <div style={{ display: "flex", gap: "16px", padding: "16px", overflowX: "auto", minHeight: "300px" }}>
      {columns.map(col => {
        const colItems = groups[col.id] || [];
        return (
          <div key={col.id} style={{ minWidth: "260px", width: "260px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <Badge color={col.color} variant="light">{col.label}</Badge>
                <Text size="xs" c="dimmed" fw={600}>{colItems.length}</Text>
              </Group>
              <ActionIcon variant="subtle" size="sm" color="gray"><IconPlus size={14} /></ActionIcon>
            </Group>
            <div style={{ flex: 1, paddingBottom: "24px" }}>
              {colItems.map(renderCard)}
            </div>
          </div>
        );
      })}

      {/* Unassigned column */}
      <div style={{ minWidth: "260px", width: "260px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Badge color={unassignedColumn.color} variant="light">{unassignedColumn.label}</Badge>
            <Text size="xs" c="dimmed" fw={600}>{(groups["unassigned"] || []).length}</Text>
          </Group>
          <ActionIcon variant="subtle" size="sm" color="gray"><IconPlus size={14} /></ActionIcon>
        </Group>
        <div style={{ flex: 1, paddingBottom: "24px" }}>
          {(groups["unassigned"] || []).map(renderCard)}
        </div>
      </div>
    </div>
  );
}
