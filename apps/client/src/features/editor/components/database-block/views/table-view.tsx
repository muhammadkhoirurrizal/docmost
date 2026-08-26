import { Table, UnstyledButton, Menu, Badge } from "@mantine/core";
import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import dayjs from "dayjs";

interface TableViewProps {
  items: DatabaseRow[];
  properties: DatabasePropertySchema[];
  visiblePropIds?: string[]; // If provided, only render these columns
  onUpdateItem: (item: DatabaseRow) => void;
  onOpenItem: (itemId: string) => void;
  onAddRow?: () => void;
}

export default function TableView({ items, properties, visiblePropIds, onUpdateItem, onOpenItem, onAddRow }: TableViewProps) {
  const { t } = useTranslation();

  // Filter visible columns. If no visibility list, show all.
  const visibleProps = visiblePropIds && visiblePropIds.length > 0
    ? properties.filter(p => visiblePropIds.includes(p.id))
    : properties;

  const updateProp = (item: DatabaseRow, propId: string, value: any) => {
    onUpdateItem({ ...item, properties: { ...item.properties, [propId]: value } });
  };

  const renderCell = (item: DatabaseRow, prop: DatabasePropertySchema) => {
    const value = item.properties[prop.id];

    // Title — click to open side peek
    if (prop.id === "title") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
          <UnstyledButton
            onClick={() => onOpenItem(item.id)}
            fw={500}
            style={{ flex: 1, padding: "2px 0", textAlign: "left", fontSize: 14 }}
          >
            {value || <span style={{ color: "var(--mantine-color-dimmed)", fontWeight: 400 }}>Untitled</span>}
          </UnstyledButton>
        </div>
      );
    }

    // Date — inline date range inputs
    if (prop.type === "date") {
      const dateVal = value as { start?: string; end?: string } | string | null;
      const startStr = typeof dateVal === "object" && dateVal?.start ? dateVal.start : (typeof dateVal === "string" ? dateVal : null);
      const endStr = typeof dateVal === "object" && dateVal?.end ? dateVal.end : startStr;
      const display = !startStr ? "" : startStr === endStr
        ? dayjs(startStr).format("MMM D, YYYY")
        : `${dayjs(startStr).format("MMM D")} → ${dayjs(endStr).format("MMM D, YYYY")}`;

      return (
        <div style={{ position: "relative", group: "date-cell" } as any}>
          <span style={{ fontSize: 13, color: display ? "inherit" : "var(--mantine-color-dimmed)" }}>
            {display || "Empty"}
          </span>
          <input
            type="date"
            defaultValue={startStr ? dayjs(startStr).format("YYYY-MM-DD") : ""}
            onChange={e => updateProp(item, prop.id, {
              start: e.target.value ? new Date(e.target.value).toISOString() : null,
              end: endStr
            })}
            style={{
              position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%",
            }}
          />
        </div>
      );
    }

    // Status / Select — dropdown badge
    if (prop.type === "status" || prop.type === "select") {
      const option = prop.options?.find(o => o.id === value);
      return (
        <Menu withinPortal position="bottom-start" width={200}>
          <Menu.Target>
            <UnstyledButton style={{ display: "flex" }}>
              {option ? (
                <Badge
                  size="sm"
                  variant="light"
                  color={option.color}
                  style={{ cursor: "pointer" }}
                >
                  {option.label}
                </Badge>
              ) : (
                <span style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>Empty</span>
              )}
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {prop.options?.map(opt => (
              <Menu.Item
                key={opt.id}
                onClick={() => updateProp(item, prop.id, opt.id)}
              >
                <Badge size="sm" variant="light" color={opt.color}>{opt.label}</Badge>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      );
    }

    // User — show name
    if (prop.type === "user") {
      const userName = typeof value === "object" && value !== null ? value.name : value;
      return <span style={{ fontSize: 13, color: userName ? "inherit" : "var(--mantine-color-dimmed)" }}>{userName || "Empty"}</span>;
    }

    // Checkbox
    if (prop.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => updateProp(item, prop.id, e.target.checked)}
          style={{ cursor: "pointer", width: 16, height: 16 }}
        />
      );
    }

    // Number
    if (prop.type === "number") {
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={e => updateProp(item, prop.id, e.target.value === "" ? null : Number(e.target.value))}
          placeholder="0"
          style={{
            border: "none", background: "transparent", color: "inherit",
            outline: "none", fontFamily: "inherit", fontSize: 13, width: "100%",
          }}
        />
      );
    }

    // URL / Email / Phone / Text — plain input
    return (
      <input
        type={prop.type === "url" ? "url" : prop.type === "email" ? "email" : prop.type === "phone" ? "tel" : "text"}
        value={value || ""}
        onChange={e => updateProp(item, prop.id, e.target.value)}
        placeholder="Empty"
        style={{
          border: "none", background: "transparent", color: "inherit",
          outline: "none", fontFamily: "inherit", fontSize: 13, width: "100%",
        }}
      />
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <Table
        verticalSpacing="sm"
        highlightOnHover
        style={{ minWidth: 500, tableLayout: "fixed" }}
      >
        <Table.Thead>
          <Table.Tr>
            {visibleProps.map(prop => (
              <Table.Th
                key={prop.id}
                style={{
                  color: "var(--mantine-color-dimmed)",
                  fontWeight: 500,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  width: prop.id === "title" ? "40%" : "auto",
                }}
              >
                {prop.name}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map(item => (
            <Table.Tr key={item.id}>
              {visibleProps.map(prop => (
                <Table.Td
                  key={prop.id}
                  style={{ verticalAlign: "middle", padding: "6px 12px" }}
                >
                  {renderCell(item, prop)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
          {/* Add row */}
          <Table.Tr>
            <Table.Td colSpan={visibleProps.length}>
              <UnstyledButton
                onClick={onAddRow}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 13, color: "var(--mantine-color-dimmed)",
                  padding: "4px 0", width: "100%",
                }}
              >
                <IconPlus size={14} />
                {t("New")}
              </UnstyledButton>
            </Table.Td>
          </Table.Tr>
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td
                colSpan={visibleProps.length}
                style={{ textAlign: "center", color: "var(--mantine-color-dimmed)", padding: "32px 0", fontSize: 13 }}
              >
                {t("No items yet. Click \"New\" to add one.")}
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}
