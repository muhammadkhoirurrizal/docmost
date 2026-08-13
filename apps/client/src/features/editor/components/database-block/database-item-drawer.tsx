import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { Drawer, Text, Group, ActionIcon, Tooltip, Loader, Menu, UnstyledButton, Avatar } from "@mantine/core";
import {
  IconX, IconShare, IconStar, IconDots, IconCalendar, IconUser,
  IconCircleDot, IconPlus, IconMaximize, IconFileText, IconTextSize,
  IconChevronsRight, IconClock, IconLink
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useRef, useState } from "react";

dayjs.extend(relativeTime);
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
  onAddProperty?: (type: string) => void;
  parentEditor?: any;
}

export default function DatabaseItemDrawer({
  item, properties, opened, onClose, onUpdate, onAddProperty, parentEditor
}: DatabaseItemDrawerProps) {

  const itemRef = useRef<DatabaseItem | null>(null);
  itemRef.current = item;
  const [commentText, setCommentText] = useState("");

  const bodyEditor = useEditor({
    extensions: mainExtensions,
    content: item?.content ?? "",
    immediatelyRender: false,
    onCreate({ editor: e }) {
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
  }, [item?.id]);

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

  const comments: any[] = item.properties._comments || [];

  const handleAddComment = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && commentText.trim() !== "") {
      const newComment = { id: Date.now().toString(), text: commentText, date: dayjs().toISOString() };
      onUpdate({ ...item, properties: { ...item.properties, _comments: [...comments, newComment] } });
      setCommentText("");
    }
  };

  const updateProperty = (propId: string, value: any) => {
    onUpdate({ ...item, properties: { ...item.properties, [propId]: value } });
  };

  const renderDateProp = (propId: string) => {
    const { start, end } = parseDateProp(item.properties[propId]);
    const fmtStart = start ? dayjs(start).format("MMM D, YYYY") : null;
    const fmtEnd = end ? dayjs(end).format("MMM D, YYYY") : null;

    const displayLabel = !fmtStart
      ? <span style={{ color: "var(--mantine-color-dimmed)", fontSize: 13 }}>Empty</span>
      : fmtStart === fmtEnd
        ? <span style={{ fontSize: 13 }}>{fmtStart}</span>
        : <span style={{ fontSize: 13 }}>{fmtStart} → {fmtEnd}</span>;

    return (
      <Group gap={4} align="center" wrap="nowrap" style={{ height: "100%", width: "100%" }}>
        {displayLabel}
        <Group gap={4} wrap="nowrap" style={{ opacity: 0, transition: "opacity .15s" }} className={classes.dateInputsHover}>
          <input type="date" value={start ? dayjs(start).format("YYYY-MM-DD") : ""}
            onChange={e => updateProperty(propId, { start: e.target.value ? new Date(e.target.value).toISOString() : null, end })}
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontSize: 12, colorScheme: "dark" }} />
          <Text size="xs" c="dimmed">→</Text>
          <input type="date" value={end ? dayjs(end).format("YYYY-MM-DD") : ""}
            onChange={e => updateProperty(propId, { start, end: e.target.value ? new Date(e.target.value).toISOString() : null })}
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontSize: 12, colorScheme: "dark" }} />
        </Group>
      </Group>
    );
  };

  const renderStatusProp = (prop: DatabaseProperty) => {
    const value = item.properties[prop.id];
    const active = prop.options?.find(o => o.id === value);
    
    const todoOptions = prop.options?.filter(o => o.label.toLowerCase().includes('not started') || o.label.toLowerCase().includes('to-do')) || [];
    const inProgressOptions = prop.options?.filter(o => o.label.toLowerCase().includes('progress')) || [];
    const doneOptions = prop.options?.filter(o => o.label.toLowerCase().includes('done') || o.label.toLowerCase().includes('complete')) || [];
    
    const hasGroups = todoOptions.length > 0 || inProgressOptions.length > 0 || doneOptions.length > 0;

    return (
      <Menu withinPortal position="bottom-start" width={220}>
        <Menu.Target>
          <UnstyledButton style={{
            display: "flex", alignItems: "center", gap: 6,
            borderRadius: 14, padding: "2px 8px 2px 6px", fontSize: 13, fontWeight: 500,
            background: active ? `var(--mantine-color-${active.color}-filled)` : "var(--mantine-color-dark-5)",
            color: active ? "white" : "var(--mantine-color-dimmed)",
            height: 24, opacity: active ? 0.85 : 1
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "white" : "var(--mantine-color-dimmed)", opacity: 0.8 }} />
            {active ? active.label : "Empty"}
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {hasGroups ? (
            <>
              {todoOptions.length > 0 && <Menu.Label>To-do</Menu.Label>}
              {todoOptions.map(opt => (
                <Menu.Item key={opt.id} onClick={() => updateProperty(prop.id, opt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
                    <span style={{ fontSize: 13 }}>{opt.label}</span>
                  </div>
                </Menu.Item>
              ))}
              
              {inProgressOptions.length > 0 && <Menu.Label>In progress</Menu.Label>}
              {inProgressOptions.map(opt => (
                <Menu.Item key={opt.id} onClick={() => updateProperty(prop.id, opt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
                    <span style={{ fontSize: 13 }}>{opt.label}</span>
                  </div>
                </Menu.Item>
              ))}

              {doneOptions.length > 0 && <Menu.Label>Complete</Menu.Label>}
              {doneOptions.map(opt => (
                <Menu.Item key={opt.id} onClick={() => updateProperty(prop.id, opt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
                    <span style={{ fontSize: 13 }}>{opt.label}</span>
                  </div>
                </Menu.Item>
              ))}
            </>
          ) : (
            prop.options?.map(opt => (
              <Menu.Item key={opt.id} onClick={() => updateProperty(prop.id, opt.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
                  <span style={{ fontSize: 13 }}>{opt.label}</span>
                </div>
              </Menu.Item>
            ))
          )}
        </Menu.Dropdown>
      </Menu>
    );
  };

  const renderPropValue = (prop: DatabaseProperty) => {
    const value = item.properties[prop.id];
    switch (prop.type) {
      case "date": return renderDateProp(prop.id);
      case "status":
      case "select": return renderStatusProp(prop);
      case "user":
        return (
          <Menu withinPortal position="bottom-start" width={220}>
            <Menu.Target>
              <UnstyledButton style={{
                display: "flex", alignItems: "center", gap: 6,
                borderRadius: 4, padding: "2px 6px", fontSize: 13,
                color: value ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                background: "transparent",
              }}>
                {value ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--mantine-color-dark-6)", padding: "2px 6px", borderRadius: 4 }}>
                    <Avatar size={16} radius="xl" color="blue" /> {value}
                  </div>
                ) : "Empty"}
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <div style={{ padding: "4px 8px", fontSize: 12, color: "var(--mantine-color-dimmed)" }}>Search person or group...</div>
              <Menu.Divider />
              {/* Dummy data for functionality demonstration */}
              <Menu.Item onClick={() => updateProperty(prop.id, "Jane Doe")}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar size={20} radius="xl" color="blue" /> Jane Doe</div>
              </Menu.Item>
              <Menu.Item onClick={() => updateProperty(prop.id, "John Smith")}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar size={20} radius="xl" color="green" /> John Smith</div>
              </Menu.Item>
              <Menu.Item onClick={() => updateProperty(prop.id, "Alice Cooper")}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar size={20} radius="xl" color="red" /> Alice Cooper</div>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        );
      case "text":
      default:
        return (
          <input type="text" value={value || ""} onChange={e => updateProperty(prop.id, e.target.value)}
            placeholder="Empty"
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontFamily: "inherit", fontSize: 13, width: "100%", height: "100%" }} />
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
      size={720}
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
      {/* ══ TOP BAR ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", flexShrink: 0, position: "sticky", top: 0, background: "var(--mantine-color-body)", zIndex: 10 }}>
        {/* Left: Open as Page */}
        <Group gap={4}>
          <Tooltip label="Open as page" position="bottom" withArrow>
            <ActionIcon variant="subtle" size="sm" c="dimmed"><IconMaximize size={15} /></ActionIcon>
          </Tooltip>
        </Group>

        {/* Right: Actions & Close */}
        <Group gap={6}>
          <Text size="xs" c="dimmed" style={{ marginRight: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <IconClock size={12} /> Edited just now
          </Text>
          <ActionIcon variant="subtle" size="sm" c="dimmed" title="Share"><IconShare size={15} /></ActionIcon>
          <ActionIcon variant="subtle" size="sm" c="dimmed" title="Favorite"><IconStar size={15} /></ActionIcon>
          <ActionIcon variant="subtle" size="sm" c="dimmed" title="More"><IconDots size={15} /></ActionIcon>
          <ActionIcon variant="subtle" size="sm" c="dimmed" onClick={onClose} title="Close side peek" style={{ marginLeft: 4 }}>
            <IconChevronsRight size={16} />
          </ActionIcon>
        </Group>
      </div>

      {/* ══ SCROLLABLE BODY ══ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 48px 80px" }}>

        {/* Title */}
        <input
          type="text"
          value={item.properties.title || ""}
          onChange={e => updateProperty("title", e.target.value)}
          placeholder="Untitled"
          style={{ fontSize: 40, fontWeight: 700, color: "var(--mantine-color-text)", background: "transparent", border: "none", outline: "none", width: "100%", marginBottom: 32, lineHeight: 1.1, letterSpacing: "-0.02em" }}
        />

        {/* Property Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {properties.filter(p => p.id !== "title").map(prop => (
            <div key={prop.id} style={{ display: "flex", alignItems: "center", minHeight: 32 }}>
              {/* Left Column (160px Fixed) */}
              <div style={{ width: 160, display: "flex", alignItems: "center", gap: 8, color: "var(--mantine-color-dimmed)", fontSize: 13, flexShrink: 0 }}>
                {propIcon(prop.type)}
                <span>{prop.name}</span>
              </div>
              {/* Right Column (Flex Grow) */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", borderRadius: 4, cursor: "text", minHeight: 28, padding: "0 6px", marginLeft: -6, transition: "background 0.1s" }} className="hover-bg-gray">
                {renderPropValue(prop)}
              </div>
            </div>
          ))}
        </div>

        {/* Add property Menu */}
        <Menu withinPortal position="bottom-start" width={220}>
          <Menu.Target>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", cursor: "pointer", color: "var(--mantine-color-dimmed)", fontSize: 13, opacity: 0.8 }} className="hover-text-solid">
              <IconPlus size={14} /> Add a property
            </div>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Type</Menu.Label>
            <Menu.Item leftSection={<IconTextSize size={14} />} onClick={() => onAddProperty?.("text")}>Text</Menu.Item>
            <Menu.Item leftSection={<IconCalendar size={14} />} onClick={() => onAddProperty?.("date")}>Date</Menu.Item>
            <Menu.Item leftSection={<IconCircleDot size={14} />} onClick={() => onAddProperty?.("status")}>Status</Menu.Item>
            <Menu.Item leftSection={<IconUser size={14} />} onClick={() => onAddProperty?.("user")}>Person</Menu.Item>
            <Menu.Item leftSection={<IconLink size={14} />} onClick={() => onAddProperty?.("text")}>Connection</Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <div style={{ height: 1, background: "var(--mantine-color-default-border)", margin: "24px 0 16px" }} />

        {/* ══ COMMENTS SECTION ══ */}
        <div style={{ marginBottom: 24 }}>
          <Text size="sm" c="dimmed" mb="md" fw={500}>Comments</Text>
          
          {comments.map((c: any) => (
            <Group key={c.id} gap="sm" align="flex-start" wrap="nowrap" style={{ marginBottom: 16 }}>
              <Avatar size={30} radius="xl" color="blue">Me</Avatar>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <Text size="sm" fw={600}>Me</Text>
                  <Text size="xs" c="dimmed">{(dayjs(c.date) as any).fromNow()}</Text>
                </div>
                <Text size="sm">{c.text}</Text>
              </div>
            </Group>
          ))}

          <Group gap="sm" align="center" wrap="nowrap">
            <Avatar size={30} radius="xl" color="blue">Me</Avatar>
            <input 
              type="text" 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleAddComment}
              placeholder="Add a comment... (Press Enter)" 
              style={{
                flex: 1, background: "transparent", border: "1px solid var(--mantine-color-default-border)",
                borderRadius: 24, padding: "6px 16px", fontSize: 13, color: "var(--mantine-color-text)",
                outline: "none"
              }}
            />
          </Group>
        </div>

        <div style={{ height: 1, background: "var(--mantine-color-default-border)", margin: "0 0 24px" }} />

        {/* Tiptap Page Canvas */}
        <div style={{ minHeight: 400, cursor: "text", paddingLeft: 0 }} onClick={() => bodyEditor?.commands.focus()}>
          {!bodyEditor ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader size="sm" /></div>
          ) : (
            <>
              {bodyEditor && <EditorBubbleMenu editor={bodyEditor} />}
              <EditorContent
                editor={bodyEditor}
                style={{ fontSize: 15, lineHeight: 1.6, outline: "none" }}
              />
            </>
          )}
        </div>

      </div>
    </Drawer>
  );
}
