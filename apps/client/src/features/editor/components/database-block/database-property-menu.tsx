import { DatabaseProperty, DatabasePropertyOption, DatabasePropertyType, createDefaultProperty } from "@docmost/editor-ext";
import { Popover, UnstyledButton, Text, TextInput, Menu, ActionIcon, Group, Divider, Badge } from "@mantine/core";
import { IconCalendar, IconCircleDot, IconFileText, IconLink, IconTextSize, IconUser, IconEdit, IconCopy, IconTrash, IconPlus, IconEye, IconLayoutBoard } from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface DatabasePropertyMenuProps {
  property: DatabaseProperty;
  onUpdate: (updated: DatabaseProperty) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <IconTextSize size={14} />,
  date: <IconCalendar size={14} />,
  status: <IconCircleDot size={14} />,
  user: <IconUser size={14} />,
  select: <IconCircleDot size={14} />,
};

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  date: "Date",
  status: "Status",
  user: "Person",
  select: "Select",
};

export default function DatabasePropertyMenu({ property, onUpdate, onDelete, children }: DatabasePropertyMenuProps) {
  const [opened, setOpened] = useState(false);
  const [view, setView] = useState<"menu" | "edit">("menu");

  const [editName, setEditName] = useState(property.name);

  // Sync state if property changes from outside
  useEffect(() => {
    setEditName(property.name);
  }, [property]);

  const updateProp = (updates: Partial<DatabaseProperty>) => {
    onUpdate({ ...property, ...updates });
  };

  const handleAddOption = (group: "todo" | "in_progress" | "complete" | undefined) => {
    const newOpt: DatabasePropertyOption = {
      id: `opt-${Date.now()}`,
      label: "New Option",
      color: "gray",
      group
    };
    updateProp({ options: [...(property.options || []), newOpt] });
  };

  const handleUpdateOption = (optId: string, updates: Partial<DatabasePropertyOption>) => {
    const newOpts = property.options?.map(o => o.id === optId ? { ...o, ...updates } : o) || [];
    updateProp({ options: newOpts });
  };

  const handleDeleteOption = (optId: string) => {
    const newOpts = property.options?.filter(o => o.id !== optId) || [];
    updateProp({ options: newOpts });
  };

  const handleChangeType = (type: string) => {
    // Reset schema structure if type changes
    if (type !== property.type) {
      const freshProp = createDefaultProperty(type as DatabasePropertyType, property.name);
      freshProp.id = property.id; // Preserve ID
      onUpdate(freshProp);
    }
  };

  const renderOptionsMenu = () => {
    if (property.type !== "status" && property.type !== "select") return null;

    const todo = property.options?.filter(o => o.group === "todo") || [];
    const prog = property.options?.filter(o => o.group === "in_progress") || [];
    const done = property.options?.filter(o => o.group === "complete") || [];
    const others = property.options?.filter(o => !o.group) || [];

    const renderGroup = (label: string, items: DatabasePropertyOption[], groupVal?: "todo" | "in_progress" | "complete") => (
      <div style={{ marginBottom: 12 }}>
        <Group justify="space-between" mb={4}>
          <Text size="xs" fw={600} c="dimmed">{label}</Text>
          <ActionIcon size="xs" variant="subtle" onClick={() => handleAddOption(groupVal)}><IconPlus size={14} /></ActionIcon>
        </Group>
        {items.map(opt => (
          <Group key={opt.id} justify="space-between" wrap="nowrap" style={{ padding: "4px 8px", borderRadius: 4 }} className="hover-bg-gray">
            <Group gap={6} style={{ flex: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${opt.color}-filled)` }} />
              <input 
                value={opt.label}
                onChange={e => handleUpdateOption(opt.id, { label: e.target.value })}
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, flex: 1, color: "var(--mantine-color-text)" }}
              />
            </Group>
            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleDeleteOption(opt.id)}><IconTrash size={12} /></ActionIcon>
          </Group>
        ))}
      </div>
    );

    return (
      <div style={{ padding: "12px 12px" }}>
        {property.type === "status" ? (
          <>
            {renderGroup("To-do", todo, "todo")}
            {renderGroup("In progress", prog, "in_progress")}
            {renderGroup("Complete", done, "complete")}
          </>
        ) : (
          renderGroup("Options", others, undefined)
        )}
      </div>
    );
  };

  return (
    <Popover opened={opened} onChange={setOpened} width={260} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <div onClick={() => { setOpened(true); setView("menu"); }} style={{ cursor: "pointer", display: "flex" }}>
          {children}
        </div>
      </Popover.Target>

      <Popover.Dropdown p={0} style={{ overflow: "hidden" }}>
        {view === "menu" ? (
          <div style={{ padding: 4 }}>
            {/* Quick Rename Input */}
            <div style={{ padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ color: "var(--mantine-color-dimmed)" }}>{TYPE_ICONS[property.type]}</div>
              <input 
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => updateProp({ name: editName })}
                onKeyDown={e => { if (e.key === "Enter") { updateProp({ name: editName }); setOpened(false); } }}
                style={{ flex: 1, background: "var(--mantine-color-dark-6)", border: "none", padding: "4px 8px", borderRadius: 4, outline: "none", color: "var(--mantine-color-text)", fontSize: 13 }}
              />
            </div>
            
            <Divider my={4} />

            <UnstyledButton onClick={() => setView("edit")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, borderRadius: 4 }} className="hover-bg-gray">
              <IconEdit size={14} color="var(--mantine-color-dimmed)" /> Edit property
            </UnstyledButton>
            <UnstyledButton style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, borderRadius: 4 }} className="hover-bg-gray">
              <IconEye size={14} color="var(--mantine-color-dimmed)" /> Property visibility
            </UnstyledButton>

            <Divider my={4} />
            
            <UnstyledButton onClick={() => { updateProp({ id: `prop-${Date.now()}`, name: `${property.name} (Copy)` }); setOpened(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, borderRadius: 4 }} className="hover-bg-gray">
              <IconCopy size={14} color="var(--mantine-color-dimmed)" /> Duplicate property
            </UnstyledButton>
            <UnstyledButton onClick={() => { onDelete(); setOpened(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, color: "var(--mantine-color-red-filled)", borderRadius: 4 }} className="hover-bg-gray">
              <IconTrash size={14} /> Delete property
            </UnstyledButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Edit Property Header */}
            <div style={{ padding: "12px 12px", borderBottom: "1px solid var(--mantine-color-default-border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "var(--mantine-color-dimmed)" }}>{TYPE_ICONS[property.type]}</div>
              <input 
                value={editName}
                onChange={e => { setEditName(e.target.value); updateProp({ name: e.target.value }); }}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--mantine-color-text)", fontSize: 14, fontWeight: 500 }}
              />
            </div>

            {/* Type Selector Menu */}
            <div style={{ padding: "8px 12px" }}>
              <Menu withinPortal width={236}>
                <Menu.Target>
                  <UnstyledButton style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--mantine-color-dimmed)", padding: "4px 0" }}>
                    <Group gap={6}><IconLayoutBoard size={14} /> Type</Group>
                    <Group gap={4}>{TYPE_LABELS[property.type]} <IconChevronRight size={14} /></Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconTextSize size={14} />} onClick={() => handleChangeType("text")}>Text</Menu.Item>
                  <Menu.Item leftSection={<IconCalendar size={14} />} onClick={() => handleChangeType("date")}>Date</Menu.Item>
                  <Menu.Item leftSection={<IconCircleDot size={14} />} onClick={() => handleChangeType("status")}>Status</Menu.Item>
                  <Menu.Item leftSection={<IconUser size={14} />} onClick={() => handleChangeType("user")}>Person</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
            
            <Divider />

            {/* Status Options Editor */}
            {renderOptionsMenu()}
            
          </div>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

const IconChevronRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <polyline points="9 6 15 12 9 18"></polyline>
  </svg>
);
