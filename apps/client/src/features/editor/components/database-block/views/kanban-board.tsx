import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { applyGrouping } from "../data-engine";
import { Text, Group, UnstyledButton, Badge, ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import dayjs from "dayjs";

interface KanbanBoardProps {
  items: DatabaseRow[];
  properties: DatabasePropertySchema[];
  visiblePropIds?: string[];
  onUpdateItem: (item: DatabaseRow) => void;
  onOpenItem: (itemId: string) => void;
  groupByPropId?: string | null;
  dateGroupMode?: string;
  onAddRow?: () => void;
}

export default function KanbanBoard({ items, properties, visiblePropIds, onUpdateItem, onOpenItem, groupByPropId, dateGroupMode, onAddRow }: KanbanBoardProps) {
  const { t } = useTranslation();
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Find group property
  const groupProp = groupByPropId
    ? properties.find(p => p.id === groupByPropId)
    : properties.find(p => p.type === "status" || p.type === "select");

  const groups = groupProp
    ? applyGrouping(items, groupProp.id, properties, dateGroupMode)
    : { "ungrouped": items };

  const isDynamicGroups = groupProp?.type === "date";
  const columns = isDynamicGroups 
    ? Object.keys(groups).filter(k => k !== "__unassigned__").map(k => ({ id: k, label: k, color: "gray" })) 
    : (groupProp?.options ? [...groupProp.options] : []);
  const unassignedItems = groups["__unassigned__"] || [];

  // Visible extra properties (exclude title and group prop)
  const extraProps = (visiblePropIds
    ? properties.filter(p => visiblePropIds.includes(p.id))
    : properties
  ).filter(p => p.id !== "title" && p.id !== groupProp?.id);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragItemId || !groupProp) return;

    const item = items.find(i => i.id === dragItemId);
    if (!item) return;

    // If dropping into __unassigned__, clear the group prop value
    const newVal = targetColId === "__unassigned__" ? null : targetColId;
    onUpdateItem({ ...item, properties: { ...item.properties, [groupProp.id]: newVal } });
    setDragItemId(null);
  };

  const renderCard = (item: DatabaseRow) => (
    <div
      key={item.id}
      draggable
      onDragStart={e => handleDragStart(e, item.id)}
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 8,
        background: "var(--mantine-color-body)",
        cursor: "grab",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <UnstyledButton
        onClick={() => onOpenItem(item.id)}
        fw={500}
        style={{ display: "block", width: "100%", textAlign: "left", fontSize: 13, marginBottom: extraProps.length ? 8 : 0 }}
      >
        {item.properties.title || <span style={{ color: "var(--mantine-color-dimmed)", fontWeight: 400 }}>Untitled</span>}
      </UnstyledButton>

      {/* Extra property badges */}
      {extraProps.length > 0 && (
        <Group gap={4} wrap="wrap">
          {extraProps.map(prop => {
            const val = item.properties[prop.id];
            if (!val) return null;

            if (prop.type === "date") {
              const dateVal = val as { start?: string } | string;
              const startStr = typeof dateVal === "object" ? dateVal?.start : dateVal;
              if (!startStr) return null;
              return (
                <Badge key={prop.id} size="xs" variant="light" color="gray">
                  {dayjs(startStr).format("MMM D")}
                </Badge>
              );
            }
            if (prop.type === "user") {
              const name = typeof val === "object" ? val.name : val;
              return <Badge key={prop.id} size="xs" variant="outline" color="blue">{name}</Badge>;
            }
            if (prop.type === "select" || prop.type === "status") {
              const opt = prop.options?.find(o => o.id === val);
              if (!opt) return null;
              return <Badge key={prop.id} size="xs" variant="light" color={opt.color}>{opt.label}</Badge>;
            }
            if (prop.type === "checkbox") {
              return val ? <Badge key={prop.id} size="xs" variant="light" color="green">✓ {prop.name}</Badge> : null;
            }
            return null;
          })}
        </Group>
      )}
    </div>
  );

  const renderColumn = (colId: string, label: string, color: string, colItems: DatabaseRow[]) => (
    <div
      key={colId}
      style={{ minWidth: 260, width: 260, flexShrink: 0, display: "flex", flexDirection: "column" }}
      onDragOver={e => { e.preventDefault(); setDragOverCol(colId); }}
      onDragLeave={() => setDragOverCol(null)}
      onDrop={e => handleDrop(e, colId)}
    >
      {/* Column header */}
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Badge color={color} variant="light">{label}</Badge>
          <Text size="xs" c="dimmed" fw={600}>{colItems.length}</Text>
        </Group>
        <ActionIcon
          variant="subtle"
          size="sm"
          color="gray"
          onClick={onAddRow}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Group>

      {/* Cards drop zone */}
      <div
        style={{
          flex: 1,
          minHeight: 80,
          borderRadius: 8,
          padding: 4,
          transition: "background 0.15s",
          background: dragOverCol === colId ? "var(--mantine-color-blue-light)" : "transparent",
        }}
      >
        {colItems.map(renderCard)}
      </div>
    </div>
  );

  if (!groupProp) {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>
        <Text c="dimmed" size="sm">
          {t("No status or select property available. Add a Status property to enable board grouping.")}
        </Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 16, padding: 16, overflowX: "auto", minHeight: 300, alignItems: "flex-start" }}>
      {columns.map(col => renderColumn(col.id, col.label, col.color, groups[col.id] || []))}
      {renderColumn("__unassigned__", t("No status"), "gray", unassignedItems)}
    </div>
  );
}
