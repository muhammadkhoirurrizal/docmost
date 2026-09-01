import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { applyGrouping } from "../data-engine";
import { Text, Group, UnstyledButton, ActionIcon, Avatar, Checkbox, Progress } from "@mantine/core";
import { IconPlus, IconMaximize, IconCalendar, IconUser, IconCheckbox, IconHash, IconAlignLeft, IconDots, IconList, IconLink, IconMail, IconPhone, IconPercentage } from "@tabler/icons-react";
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
  onAddRow?: (propId: string, val: any) => void;
}

const KanbanCard = ({ 
  item, 
  extraProps, 
  onOpenItem, 
  onDragStart 
}: { 
  item: DatabaseRow, 
  extraProps: DatabasePropertySchema[], 
  onOpenItem: (id: string) => void, 
  onDragStart: (e: React.DragEvent, id: string) => void
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, item.id)}
      style={{
        position: "relative",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: 8,
        marginBottom: 8,
        background: isHovered ? "var(--mantine-color-default-hover)" : "var(--mantine-color-body)",
        cursor: "grab",
        transition: "background 0.1s ease-in-out",
        boxShadow: "0px 2px 3px 0px rgba(0, 0, 0, 0.05)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenItem(item.id)}
    >
      {/* Header/Title */}
      <div style={{ padding: 8, paddingBottom: extraProps.length > 0 ? 4 : 8 }}>
        <Text size="sm" fw={500} style={{ lineHeight: 1.4 }}>
          {item.properties.title || <span style={{ color: "var(--mantine-color-dimmed)", fontWeight: 400 }}>Untitled</span>}
        </Text>
      </div>

      {/* Properties (Body) */}
      {extraProps.length > 0 && (
        <div style={{ padding: "0 8px 8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {extraProps.map(prop => {
            const val = item.properties[prop.id];
            if (val == null || val === "") return null;

            // Render value
            let renderedVal: React.ReactNode = null;
            if (prop.type === "date") {
              const dateVal = val as { start?: string } | string;
              const startStr = typeof dateVal === "object" ? dateVal?.start : dateVal;
              if (startStr) renderedVal = dayjs(startStr).format("MMM D");
            } else if (prop.type === "user") {
              renderedVal = typeof val === "object" ? val.name : val;
            } else if (prop.type === "select" || prop.type === "status") {
              const opt = prop.options?.find(o => o.id === val);
              if (opt) {
                renderedVal = (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: `var(--mantine-color-${opt.color}-light)`, color: `var(--mantine-color-${opt.color}-filled)`, padding: "0 6px", borderRadius: 4, fontSize: 12, fontWeight: 500, lineHeight: "18px" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                    {opt.label}
                  </div>
                );
              }
            } else if (prop.type === "checkbox") {
              renderedVal = <Checkbox readOnly checked={!!val} size="xs" />;
            } else if (prop.type === "multi_select") {
              const arr = Array.isArray(val) ? val : [];
              renderedVal = (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {arr.map((id: string) => {
                    const opt = prop.options?.find(o => o.id === id);
                    if (!opt) return null;
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 4, background: `var(--mantine-color-${opt.color}-light)`, color: `var(--mantine-color-${opt.color}-filled)`, padding: "0 6px", borderRadius: 4, fontSize: 12, fontWeight: 500, lineHeight: "18px" }}>
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              );
            } else if (prop.type === "progress") {
              const numVal = parseFloat(String(val));
              if (!isNaN(numVal)) {
                renderedVal = (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", height: 20 }}>
                    <Progress value={numVal} size="sm" style={{ flex: 1 }} color={numVal === 100 ? "teal" : "blue"} />
                    <Text size="xs" c="dimmed" style={{ width: 32, textAlign: "right" }}>{numVal}%</Text>
                  </div>
                );
              }
            } else if (typeof val === "string" || typeof val === "number") {
              renderedVal = <Text size="xs" truncate="end" c="dimmed" style={{ flex: 1 }}>{val}</Text>;
            }

            if (!renderedVal) return null;

            // Icon for property
            const PropIcon = prop.type === "date" ? IconCalendar : prop.type === "user" ? IconUser : prop.type === "checkbox" ? null : prop.type === "number" ? IconHash : prop.type === "text" ? IconAlignLeft : prop.type === "multi_select" ? IconList : prop.type === "url" ? IconLink : prop.type === "email" ? IconMail : prop.type === "phone" ? IconPhone : prop.type === "progress" ? IconPercentage : null;

            return (
              <div key={prop.id} style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20, width: "100%" }}>
                {PropIcon && <PropIcon size={14} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />}
                {renderedVal}
              </div>
            );
          })}
        </div>
      )}

      {/* Hover actions */}
      {isHovered && (
        <div style={{ position: "absolute", right: 6, top: 6, display: "flex", gap: 4 }}>
          <ActionIcon size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onOpenItem(item.id); }} style={{ boxShadow: "0 0 4px rgba(0,0,0,0.1)", background: "var(--mantine-color-body)" }}>
            <IconMaximize size={14} />
          </ActionIcon>
        </div>
      )}
    </div>
  );
};

const KanbanColumn = ({ 
  colId, 
  label, 
  color, 
  colItems, 
  onDrop, 
  dragOverCol, 
  onDragOver, 
  onDragLeave, 
  onAddRow, 
  renderCard 
}: {
  colId: string, label: string, color: string, colItems: DatabaseRow[],
  onDrop: (e: React.DragEvent, id: string) => void, dragOverCol: string | null,
  onDragOver: (e: React.DragEvent, id: string) => void, onDragLeave: () => void,
  onAddRow: (colId: string) => void, renderCard: (item: DatabaseRow) => React.ReactNode
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{ minWidth: 260, width: 260, flexShrink: 0, display: "flex", flexDirection: "column" }}
      onDragOver={(e) => onDragOver(e, colId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, colId)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column header */}
      <div style={{ height: 32, padding: "6px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: color ? `var(--mantine-color-${color}-light)` : "var(--mantine-color-default-border)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color ? `var(--mantine-color-${color}-filled)` : "var(--mantine-color-dimmed)" }} />
          </div>
          <Text size="sm" fw={500} truncate="end">{label}</Text>
          <Text size="xs" c="dimmed">{colItems.length}</Text>
        </div>
        <ActionIcon
          variant="subtle"
          size="sm"
          color="gray"
          onClick={() => onAddRow(colId)}
          style={{ opacity: isHovered ? 1 : 0, transition: "opacity 0.15s" }}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </div>

      {/* Cards drop zone */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "0 4px",
          gap: 0,
          minHeight: 80,
          transition: "background 0.15s",
          background: dragOverCol === colId ? "var(--mantine-color-gray-light)" : "transparent",
          borderRadius: 8,
        }}
      >
        {colItems.map(renderCard)}

        {/* Add Card Footer */}
        <UnstyledButton
          onClick={() => onAddRow(colId)}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 4,
            fontSize: 13, color: "var(--mantine-color-dimmed)",
            opacity: isHovered ? 1 : 0,
            visibility: isHovered ? "visible" : "hidden",
            transition: "all 150ms",
            marginTop: 4
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--mantine-color-default-hover)"; e.currentTarget.style.color = "var(--mantine-color-text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--mantine-color-dimmed)"; }}
        >
          <IconPlus size={14} />
          New
        </UnstyledButton>
      </div>
    </div>
  );
};

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
    let newVal: any = targetColId === "__unassigned__" ? null : targetColId;
    if (groupProp.type === "date" && targetColId !== "__unassigned__") {
      // Date group drop mapping would need dayjs logic if we want to change date based on drop, 
      // but for now, we leave it null or map to targetColId as string. 
      // Kanban date drag/drop is complex. We'll fallback to not modifying date for now if it's dynamic.
      // AFFiNE doesn't fully support dragging cards across date columns without changing dates, actually they might.
      if (isDynamicGroups) {
        // Skip updating date on drop for now to avoid complexity of interpreting "Tomorrow" to a real Date string.
        setDragItemId(null);
        return;
      }
    }
    onUpdateItem({ ...item, properties: { ...item.properties, [groupProp.id]: newVal } });
    setDragItemId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleAddRow = (colId: string) => {
    if (onAddRow && groupProp) {
      if (colId === "__unassigned__" || isDynamicGroups) {
        onAddRow(groupProp.id, null);
      } else {
        onAddRow(groupProp.id, colId);
      }
    }
  };

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
      {columns.map(col => (
        <KanbanColumn
          key={col.id}
          colId={col.id}
          label={col.label}
          color={col.color}
          colItems={groups[col.id] || []}
          onDrop={handleDrop}
          dragOverCol={dragOverCol}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOverCol(null)}
          onAddRow={handleAddRow}
          renderCard={(item) => (
            <KanbanCard
              key={item.id}
              item={item}
              extraProps={extraProps}
              onOpenItem={onOpenItem}
              onDragStart={handleDragStart}
            />
          )}
        />
      ))}
      <KanbanColumn
        colId="__unassigned__"
        label={t("No status")}
        color="gray"
        colItems={unassignedItems}
        onDrop={handleDrop}
        dragOverCol={dragOverCol}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOverCol(null)}
        onAddRow={handleAddRow}
        renderCard={(item) => (
          <KanbanCard
            key={item.id}
            item={item}
            extraProps={extraProps}
            onOpenItem={onOpenItem}
            onDragStart={handleDragStart}
          />
        )}
      />
    </div>
  );
}
