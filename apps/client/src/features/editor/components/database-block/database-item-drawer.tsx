import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { Drawer, Text, Group, ActionIcon, Tooltip, Loader } from "@mantine/core";
import {
  IconX, IconShare, IconStar, IconDots, IconCalendar, IconUser,
  IconCircleDot, IconPlus, IconMaximize, IconFileText, IconTextSize
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { mainExtensions } from "@/features/editor/extensions/extensions";
import { EditorBubbleMenu } from "@/features/editor/components/bubble-menu/bubble-menu";
import { parseDateProp } from "./date-prop-utils";
import classes from "./database-item-drawer.module.css";

interface DatabaseItemDrawerProps {
  item: DatabaseItem | null;
  properties: DatabaseProperty[];
  opened: boolean;
  onClose: () => void;
  onUpdate: (item: DatabaseItem) => void;
  parentEditor?: any; // Parent Tiptap editor to inherit pageId
}

export default function DatabaseItemDrawer({
  item, properties, opened, onClose, onUpdate, parentEditor
}: DatabaseItemDrawerProps) {

  const itemRef = useRef<DatabaseItem | null>(null);
  itemRef.current = item;

  // Mini Tiptap editor — same pattern as data-table-view.tsx row editor
  const bodyEditor = useEditor({
    extensions: mainExtensions,
    content: item?.content ?? "",
    immediatelyRender: false,
    onCreate({ editor: e }) {
      // Inherit pageId from parent editor so slash command image uploads etc work
      if (parentEditor?.storage?.pageId) {
        queueMicrotask(() => {
          // @ts-ignore
          e.storage.pageId = parentEditor.storage.pageId;
        });
      }
    },
    onUpdate: ({ editor: e }) => {
      const current = itemRef.current;
      if (!current) return;
      onUpdate({ ...current, content: e.getJSON() });
    },
  }, [item?.id]); // Re-create editor when switching cards

  // Load content whenever the item changes
  useEffect(() => {
    if (!bodyEditor || bodyEditor.isDestroyed) return;
    if (!item) return;
    const newContent = item.content ?? "";
    const currentJSON = JSON.stringify(bodyEditor.getJSON());
    const newJSON = JSON.stringify(newContent);
    if (currentJSON !== newJSON) {
      bodyEditor.commands.setContent(newContent);
    }
  }, [item?.id, item?.content]);

  if (!item) return null;

  const updateProperty = (propId: string, value: any) => {
    onUpdate({ ...item, properties: { ...item.properties, [propId]: value } });
  };

  // --- Property Renderers ---
  const renderDateProp = (propId: string) => {
    const { start, end } = parseDateProp(item.properties[propId]);
    const fmtStart = start ? dayjs(start).format("MMM D, YYYY") : null;
    const fmtEnd = end ? dayjs(end).format("MMM D, YYYY") : null;

    const displayLabel = !fmtStart
      ? <span style={{ color: "var(--mantine-color-dimmed)", fontSize: 14 }}>Empty</span>
      : fmtStart === fmtEnd
        ? <span style={{ fontSize: 14 }}>{fmtStart}</span>
        : <span style={{ fontSize: 14 }}>{fmtStart} → {fmtEnd}</span>;

    return (
      <Group gap={4} align="center" wrap="nowrap">
        {displayLabel}
        <Group gap={4} wrap="nowrap" style={{ opacity: 0, transition: "opacity .15s" }} className={classes.dateInputsHover}>
          <input type="date" value={start ? dayjs(start).format("YYYY-MM-DD") : ""}
            onChange={e => updateProperty(propId, { start: e.target.value ? new Date(e.target.value).toISOString() : null, end })}
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontSize: 13, colorScheme: "dark" }} />
          <Text size="xs" c="dimmed">→</Text>
          <input type="date" value={end ? dayjs(end).format("YYYY-MM-DD") : ""}
            onChange={e => updateProperty(propId, { start, end: e.target.value ? new Date(e.target.value).toISOString() : null })}
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontSize: 13, colorScheme: "dark" }} />
        </Group>
      </Group>
    );
  };

  const renderStatusProp = (prop: DatabaseProperty) => {
    const value = item.properties[prop.id];
    const active = prop.options?.find(o => o.id === value);
    return (
      <select value={value || ""} onChange={e => updateProperty(prop.id, e.target.value)}
        style={{
          border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 13, fontWeight: 500,
          cursor: "pointer", outline: "none", fontFamily: "inherit",
          background: active ? `var(--mantine-color-${active.color}-light)` : "var(--mantine-color-dark-5)",
          color: active ? `var(--mantine-color-${active.color}-filled)` : "var(--mantine-color-dimmed)",
        }}>
        <option value="" style={{ background: "var(--mantine-color-dark-6)", color: "var(--mantine-color-text)" }}>Empty</option>
        {prop.options?.map(opt => (
          <option key={opt.id} value={opt.id} style={{ background: "var(--mantine-color-dark-6)", color: "var(--mantine-color-text)" }}>{opt.label}</option>
        ))}
      </select>
    );
  };

  const renderPropValue = (prop: DatabaseProperty) => {
    const value = item.properties[prop.id];
    switch (prop.type) {
      case "date": return renderDateProp(prop.id);
      case "status":
      case "select": return renderStatusProp(prop);
      case "user":
        return <span style={{ fontSize: 14, color: "var(--mantine-color-dimmed)" }}>Empty</span>;
      case "text":
      default:
        return (
          <input type="text" value={value || ""} onChange={e => updateProperty(prop.id, e.target.value)}
            placeholder="Empty"
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontFamily: "inherit", fontSize: 14, width: "100%" }} />
        );
    }
  };

  const propIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      date: <IconCalendar size={14} />, user: <IconUser size={14} />,
      status: <IconCircleDot size={14} />, select: <IconCircleDot size={14} />,
      text: <IconTextSize size={14} />,
    };
    return icons[type] ?? <IconFileText size={14} />;
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={560}
      padding={0}
      withCloseButton={false}
      overlayProps={{ opacity: 0.25 }}
      styles={{
        content: {
          background: "var(--mantine-color-body)",
          borderLeft: "1px solid var(--mantine-color-default-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
        }
      }}
    >
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", flexShrink: 0 }}>
        <Group gap={4}>
          <Tooltip label="Expand" position="bottom" withArrow>
            <ActionIcon variant="subtle" size="md" c="dimmed"><IconMaximize size={16} /></ActionIcon>
          </Tooltip>
        </Group>
        <Group gap={4}>
          <ActionIcon variant="subtle" size="md" c="dimmed"><IconShare size={16} /></ActionIcon>
          <ActionIcon variant="subtle" size="md" c="dimmed"><IconStar size={16} /></ActionIcon>
          <ActionIcon variant="subtle" size="md" c="dimmed"><IconDots size={16} /></ActionIcon>
          <div style={{ width: 1, height: 16, background: "var(--mantine-color-default-border)", margin: "0 4px" }} />
          <ActionIcon variant="subtle" size="md" onClick={onClose} c="dimmed"><IconX size={16} /></ActionIcon>
        </Group>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 56px 60px" }}>

        {/* Title */}
        <input
          type="text"
          value={item.properties.title || ""}
          onChange={e => updateProperty("title", e.target.value)}
          placeholder="Untitled"
          style={{ fontSize: 32, fontWeight: 700, color: "var(--mantine-color-text)", background: "transparent", border: "none", outline: "none", width: "100%", marginBottom: 24, lineHeight: 1.2 }}
        />

        {/* Properties */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
          {properties.filter(p => p.id !== "title").map(prop => (
            <div key={prop.id} style={{ display: "flex", alignItems: "center", minHeight: 34, padding: "2px 0" }}>
              <div style={{ width: 130, display: "flex", alignItems: "center", gap: 7, color: "var(--mantine-color-dimmed)", fontSize: 14, flexShrink: 0 }}>
                {propIcon(prop.type)}
                <span>{prop.name}</span>
              </div>
              <div style={{ flex: 1, padding: "2px 8px", borderRadius: 4, cursor: "text" }}>
                {renderPropValue(prop)}
              </div>
            </div>
          ))}
        </div>

        {/* Add property */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 4px 0", marginBottom: 8, cursor: "pointer", color: "var(--mantine-color-dimmed)", fontSize: 13 }}>
          <IconPlus size={14} /> Add a property
        </div>

        <div style={{ height: 1, background: "var(--mantine-color-default-border)", margin: "16px 0 20px" }} />

        {/* Real Tiptap Editor for body content */}
        <div style={{ minHeight: 200, cursor: "text" }} onClick={() => bodyEditor?.commands.focus()}>
          {!bodyEditor ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader size="sm" /></div>
          ) : (
            <>
              {bodyEditor && <EditorBubbleMenu editor={bodyEditor} />}
              <EditorContent
                editor={bodyEditor}
                style={{ fontSize: 15, lineHeight: 1.6 }}
              />
            </>
          )}
        </div>

      </div>
    </Drawer>
  );
}
