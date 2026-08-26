import { Table, UnstyledButton, Menu, Badge, Popover, Progress, Slider, Text } from "@mantine/core";
import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { IconPlus, IconTextSize, IconCalendar, IconCircleDot, IconUser, IconLink, IconHash, IconLayoutBoard, IconCheckbox, IconPercentage, IconMail, IconPhone } from "@tabler/icons-react";
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
  onAddProperty?: (type: string) => void;
}

export default function TableView({ items, properties, visiblePropIds, onUpdateItem, onOpenItem, onAddRow, onAddProperty }: TableViewProps) {
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

    // Multi-Select
    if (prop.type === "multi_select") {
      const selectedIds = Array.isArray(value) ? value : [];
      return (
        <Menu withinPortal position="bottom-start" width={200} closeOnItemClick={false}>
          <Menu.Target>
            <UnstyledButton style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {selectedIds.length > 0 ? (
                selectedIds.map((id: string) => {
                  const option = prop.options?.find(o => o.id === id);
                  if (!option) return null;
                  return (
                    <Badge
                      key={id}
                      size="sm"
                      variant="light"
                      color={option.color}
                      style={{ cursor: "pointer" }}
                    >
                      {option.label}
                    </Badge>
                  );
                })
              ) : (
                <span style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>Empty</span>
              )}
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {prop.options?.map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <Menu.Item
                  key={opt.id}
                  onClick={() => {
                    if (isSelected) {
                      updateProp(item, prop.id, selectedIds.filter((id: string) => id !== opt.id));
                    } else {
                      updateProp(item, prop.id, [...selectedIds, opt.id]);
                    }
                  }}
                  leftSection={<input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: "none" }} />}
                >
                  <Badge size="sm" variant="light" color={opt.color}>{opt.label}</Badge>
                </Menu.Item>
              );
            })}
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

    // Progress
    if (prop.type === "progress") {
      const val = typeof value === "number" ? value : 0;
      return (
        <Popover width={200} position="bottom" withArrow shadow="md">
          <Popover.Target>
            <UnstyledButton style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
              <Progress value={val} size="sm" style={{ flex: 1 }} color={val === 100 ? "green" : "blue"} />
              <span style={{ fontSize: 12, color: "var(--mantine-color-dimmed)", width: 28, textAlign: "right" }}>{val}%</span>
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown>
            <Text size="xs" fw={500} mb="xs" c="dimmed">Set Progress</Text>
            <Slider
              value={val}
              onChange={(v) => updateProp(item, prop.id, v)}
              marks={[
                { value: 0, label: "0%" },
                { value: 50, label: "50%" },
                { value: 100, label: "100%" }
              ]}
              mb="xl"
            />
          </Popover.Dropdown>
        </Popover>
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
            <Table.Th style={{ width: 40, padding: 0 }}>
              <Menu withinPortal position="bottom-start" width={220}>
                <Menu.Target>
                  <UnstyledButton style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 32, color: "var(--mantine-color-dimmed)" }}>
                    <IconPlus size={16} />
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Type</Menu.Label>
                  <Menu.Item leftSection={<IconTextSize size={14} />} onClick={() => onAddProperty?.("text")}>Text</Menu.Item>
                  <Menu.Item leftSection={<IconHash size={14} />} onClick={() => onAddProperty?.("number")}>Number</Menu.Item>
                  <Menu.Item leftSection={<IconCalendar size={14} />} onClick={() => onAddProperty?.("date")}>Date</Menu.Item>
                  <Menu.Item leftSection={<IconCircleDot size={14} />} onClick={() => onAddProperty?.("status")}>Status</Menu.Item>
                  <Menu.Item leftSection={<IconCircleDot size={14} />} onClick={() => onAddProperty?.("select")}>Select</Menu.Item>
                  <Menu.Item leftSection={<IconLayoutBoard size={14} />} onClick={() => onAddProperty?.("multi_select")}>Multi-select</Menu.Item>
                  <Menu.Item leftSection={<IconCheckbox size={14} />} onClick={() => onAddProperty?.("checkbox")}>Checkbox</Menu.Item>
                  <Menu.Item leftSection={<IconPercentage size={14} />} onClick={() => onAddProperty?.("progress")}>Progress</Menu.Item>
                  <Menu.Item leftSection={<IconUser size={14} />} onClick={() => onAddProperty?.("user")}>Person</Menu.Item>
                  <Menu.Item leftSection={<IconLink size={14} />} onClick={() => onAddProperty?.("url")}>URL</Menu.Item>
                  <Menu.Item leftSection={<IconMail size={14} />} onClick={() => onAddProperty?.("email")}>Email</Menu.Item>
                  <Menu.Item leftSection={<IconPhone size={14} />} onClick={() => onAddProperty?.("phone")}>Phone</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Table.Th>
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
              <Table.Td style={{ width: 40 }} />
            </Table.Tr>
          ))}
          {/* Add row */}
          <Table.Tr>
            <Table.Td colSpan={visibleProps.length + 1}>
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
                colSpan={visibleProps.length + 1}
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
