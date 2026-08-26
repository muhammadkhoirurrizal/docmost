import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { Drawer, ActionIcon, Menu, UnstyledButton, Text, Group, Divider, Tooltip, Progress, Slider, Popover, Loader, Avatar } from "@mantine/core";
import { 
  IconX, IconShare, IconStar, IconDots, IconCalendar, IconUser,
  IconCircleDot, IconPlus, IconMaximize, IconFileText, IconTextSize,
  IconChevronsRight, IconClock, IconLink, IconPercentage,
  IconHash, IconLayoutBoard, IconCheckbox, IconMail, IconPhone
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useRef, useState } from "react";

dayjs.extend(relativeTime);
import { EditorContent, useEditor } from "@tiptap/react";
import { mainExtensions } from "@/features/editor/extensions/extensions";
import { EditorBubbleMenu } from "@/features/editor/components/bubble-menu/bubble-menu";
import { parseDateProp } from "./date-prop-utils";
import DatabasePropertyMenu from "./database-property-menu";
import classes from "./database-item-drawer.module.css";
import { useParams } from "react-router-dom";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { useSearchSuggestionsQuery } from "@/features/search/queries/search-query";
import { CustomAvatar } from "@/components/ui/custom-avatar";

interface DatabaseRowDrawerProps {
  item: DatabaseRow | null;
  properties: DatabasePropertySchema[];
  opened: boolean;
  onClose: () => void;
  onUpdate: (item: DatabaseRow) => void;
  onAddProperty?: (type: string) => void;
  onUpdatePropertySchema?: (propId: string, updatedProp: DatabasePropertySchema) => void;
  onDeletePropertySchema?: (propId: string) => void;
  parentEditor?: any;
}

export default function DatabaseRowDrawer({
  item, properties, opened, onClose, onUpdate, onAddProperty, onUpdatePropertySchema, onDeletePropertySchema, parentEditor
}: DatabaseRowDrawerProps) {

  const itemRef = useRef<DatabaseRow | null>(null);
  itemRef.current = item;
  const [commentText, setCommentText] = useState("");

  const { spaceSlug } = useParams();
  const { data: space } = useSpaceQuery(spaceSlug);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  const { data: suggestion, isLoading: isLoadingUsers } = useSearchSuggestionsQuery({
    query: userSearchQuery,
    includeUsers: true,
    includePages: false,
    spaceId: space?.id,
    limit: 20,
  });

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

  const renderStatusProp = (prop: DatabasePropertySchema) => {
    const value = item.properties[prop.id];
    const active = prop.options?.find(o => o.id === value);
    
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
          {prop.options?.map(opt => (
            <Menu.Item key={opt.id} onClick={() => updateProperty(prop.id, opt.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
                <span style={{ fontSize: 13 }}>{opt.label}</span>
              </div>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    );
  };

  const renderPropValue = (prop: DatabasePropertySchema) => {
    const value = item.properties[prop.id];
    switch (prop.type) {
      case "date": return renderDateProp(prop.id);
      case "status":
      case "select": return renderStatusProp(prop);
      case "multi_select": {
        const selectedIds = Array.isArray(value) ? value : [];
        return (
          <Menu withinPortal position="bottom-start" width={220} closeOnItemClick={false}>
            <Menu.Target>
              <UnstyledButton style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 0", minHeight: 24, width: "100%" }}>
                {selectedIds.length > 0 ? (
                  selectedIds.map((id: string) => {
                    const option = prop.options?.find(o => o.id === id);
                    if (!option) return null;
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 14, padding: "2px 8px 2px 6px", fontSize: 13, background: `var(--mantine-color-${option.color}-filled)`, color: "white", opacity: 0.85 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white", opacity: 0.8 }} />
                        {option.label}
                      </div>
                    );
                  })
                ) : (
                  <span style={{ fontSize: 13, color: "var(--mantine-color-dimmed)" }}>Empty</span>
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
                      if (isSelected) updateProperty(prop.id, selectedIds.filter((id: string) => id !== opt.id));
                      else updateProperty(prop.id, [...selectedIds, opt.id]);
                    }}
                    leftSection={<input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: "none" }} />}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
                      <span style={{ fontSize: 13 }}>{opt.label}</span>
                    </div>
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        );
      }
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => updateProperty(prop.id, e.target.checked)}
            style={{ cursor: "pointer", width: 16, height: 16 }}
          />
        );
      case "number":
        return (
          <input type="number" value={value ?? ""} onChange={e => updateProperty(prop.id, e.target.value === "" ? null : Number(e.target.value))}
            placeholder="0"
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontFamily: "inherit", fontSize: 13, width: "100%", height: "100%" }} />
        );
      case "url":
      case "email":
      case "phone":
        return (
          <input type={prop.type === "url" ? "url" : prop.type === "email" ? "email" : "tel"} value={value || ""} onChange={e => updateProperty(prop.id, e.target.value)}
            placeholder="Empty"
            style={{ border: "none", background: "transparent", color: "inherit", outline: "none", fontFamily: "inherit", fontSize: 13, width: "100%", height: "100%" }} />
        );
      case "user":
        return (
          <Menu withinPortal position="bottom-start" width={220} onClose={() => setUserSearchQuery("")}>
            <Menu.Target>
              <UnstyledButton style={{
                display: "flex", alignItems: "center", gap: 6,
                borderRadius: 4, padding: "2px 6px", fontSize: 13,
                color: value ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                background: "transparent",
              }}>
                {value ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--mantine-color-dark-6)", padding: "2px 6px", borderRadius: 4 }}>
                    <CustomAvatar size={16} name={value.name} avatarUrl={value.avatarUrl} /> {value.name}
                  </div>
                ) : "Empty"}
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <div style={{ padding: "4px 8px" }}>
                <input 
                  type="text"
                  placeholder="Search person or group..." 
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--mantine-color-text)" }}
                />
              </div>
              <Menu.Divider />
              {isLoadingUsers ? (
                <div style={{ padding: "8px", fontSize: 12, color: "var(--mantine-color-dimmed)", textAlign: "center" }}>Loading...</div>
              ) : suggestion?.users?.length ? (
                suggestion.users.map((user: any) => (
                  <Menu.Item key={user.id} onClick={() => updateProperty(prop.id, { id: user.id, name: user.name, avatarUrl: user.avatarUrl })}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CustomAvatar size={20} name={user.name} avatarUrl={user.avatarUrl} /> {user.name}
                    </div>
                  </Menu.Item>
                ))
              ) : (
                <div style={{ padding: "8px", fontSize: 12, color: "var(--mantine-color-dimmed)", textAlign: "center" }}>No users found</div>
              )}
            </Menu.Dropdown>
          </Menu>
        );
      case "progress":
        const val = typeof value === "number" ? value : 0;
        return (
          <Popover width={240} position="bottom-start" withArrow shadow="md">
            <Popover.Target>
              <UnstyledButton style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, height: "100%" }}>
                <Progress value={val} size="md" style={{ flex: 1 }} color={val === 100 ? "green" : "blue"} />
                <span style={{ fontSize: 13, color: "var(--mantine-color-dimmed)", width: 36, textAlign: "right" }}>{val}%</span>
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown>
              <Text size="xs" fw={500} mb="sm" c="dimmed">Set Progress</Text>
              <Slider
                value={val}
                onChange={(v) => updateProperty(prop.id, v)}
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
      text: <IconTextSize size={14} />, progress: <IconPercentage size={14} />
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
        {/* Left: Close & Open as Page */}
        <Group gap={4}>
          <ActionIcon variant="subtle" size="sm" c="dimmed" onClick={onClose} title="Close side peek" style={{ marginRight: 4 }}>
            <IconChevronsRight size={16} />
          </ActionIcon>
          <Tooltip label="Open as page" position="bottom" withArrow>
            <ActionIcon variant="subtle" size="sm" c="dimmed"><IconMaximize size={15} /></ActionIcon>
          </Tooltip>
        </Group>

        {/* Right: Actions */}
        <Group gap={6}>
          <Text size="xs" c="dimmed" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconClock size={12} /> Edited just now
          </Text>
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
              <DatabasePropertyMenu
                property={prop}
                onUpdate={(updatedProp) => onUpdatePropertySchema?.(prop.id, updatedProp)}
                onDelete={() => onDeletePropertySchema?.(prop.id)}
              >
                <div style={{ width: 160, display: "flex", alignItems: "center", gap: 8, color: "var(--mantine-color-dimmed)", fontSize: 13, flexShrink: 0, padding: "4px 4px", borderRadius: 4, marginLeft: -4 }} className="hover-bg-gray">
                  {propIcon(prop.type)}
                  <span>{prop.name}</span>
                </div>
              </DatabasePropertyMenu>
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
