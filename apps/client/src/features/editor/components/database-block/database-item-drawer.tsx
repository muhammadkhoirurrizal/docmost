import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { Drawer, UnstyledButton, Text, Group, ActionIcon, Textarea } from "@mantine/core";
import { IconX, IconShare, IconStar, IconDots, IconCalendar, IconUser, IconCircleDot, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";

interface DatabaseItemDrawerProps {
  item: DatabaseItem | null;
  properties: DatabaseProperty[];
  opened: boolean;
  onClose: () => void;
  onUpdate: (item: DatabaseItem) => void;
}

export default function DatabaseItemDrawer({ item, properties, opened, onClose, onUpdate }: DatabaseItemDrawerProps) {
  if (!item) return null;

  const updateProperty = (propId: string, value: any) => {
    onUpdate({
      ...item,
      properties: {
        ...item.properties,
        [propId]: value
      }
    });
  };

  const renderPropertyInput = (prop: DatabaseProperty) => {
    const value = item.properties[prop.id];

    switch (prop.type) {
      case "text":
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => updateProperty(prop.id, e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'inherit', outline: 'none', fontFamily: 'inherit', fontSize: '14px', width: '100%' }}
            placeholder="Empty"
          />
        );
      case "date":
        const dateVal = value as { start?: string, end?: string } | string | null;
        const startStr = typeof dateVal === 'object' && dateVal?.start ? dateVal.start : (typeof dateVal === 'string' ? dateVal : null);
        const endStr = typeof dateVal === 'object' && dateVal?.end ? dateVal.end : startStr;
        
        return (
          <Group gap="xs" align="center" style={{ width: '100%' }}>
            <input
              type="date"
              value={startStr ? dayjs(startStr).format('YYYY-MM-DD') : ""}
              onChange={(e) => updateProperty(prop.id, { start: e.target.value ? new Date(e.target.value).toISOString() : null, end: endStr })}
              style={{ border: 'none', background: 'transparent', color: 'inherit', outline: 'none', fontFamily: 'inherit', fontSize: '13px', colorScheme: 'dark' }}
            />
            <Text size="sm" c="dimmed">→</Text>
            <input
              type="date"
              value={endStr ? dayjs(endStr).format('YYYY-MM-DD') : ""}
              onChange={(e) => updateProperty(prop.id, { start: startStr, end: e.target.value ? new Date(e.target.value).toISOString() : null })}
              style={{ border: 'none', background: 'transparent', color: 'inherit', outline: 'none', fontFamily: 'inherit', fontSize: '13px', colorScheme: 'dark' }}
            />
          </Group>
        );
      case "status":
      case "select":
        return (
          <select
            value={value || ""}
            onChange={(e) => updateProperty(prop.id, e.target.value)}
            style={{
              border: 'none', background: 'var(--mantine-color-dark-6)',
              color: 'inherit', outline: 'none', fontFamily: 'inherit', fontSize: '13px',
              padding: '3px 8px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            {prop.options?.map(opt => (
              <option key={opt.id} value={opt.id}>● {opt.label}</option>
            ))}
          </select>
        );
      case "user":
        return (
          <div style={{ fontSize: '13px', color: 'var(--mantine-color-dimmed)' }}>Empty</div>
        );
      default:
        return null;
    }
  };

  const getPropIcon = (type: string) => {
    switch (type) {
      case 'date': return <IconCalendar size={14} />;
      case 'user': return <IconUser size={14} />;
      case 'status': return <IconCircleDot size={14} />;
      default: return <IconCircleDot size={14} />;
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={440}
      padding={0}
      withCloseButton={false}
      overlayProps={{ opacity: 0.5, blur: 0 }}
      styles={{ content: { background: "var(--mantine-color-dark-7)", borderLeft: "1px solid var(--mantine-color-default-border)" } }}
    >
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "44px", borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <ActionIcon variant="subtle" size="sm" onClick={onClose} c="dimmed"><IconX size={16} /></ActionIcon>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ActionIcon variant="subtle" size="sm" c="dimmed"><IconShare size={15} /></ActionIcon>
          <ActionIcon variant="subtle" size="sm" c="dimmed"><IconStar size={15} /></ActionIcon>
          <ActionIcon variant="subtle" size="sm" c="dimmed"><IconDots size={15} /></ActionIcon>
        </div>
      </div>

      <div style={{ padding: "32px 40px 16px", height: "calc(100vh - 44px)", overflowY: "auto" }}>
        {/* Title */}
        <input 
          type="text" 
          value={item.properties.title || ""} 
          onChange={(e) => updateProperty('title', e.target.value)}
          placeholder="Untitled" 
          style={{ fontSize: "28px", fontWeight: 700, color: "var(--mantine-color-text)", background: "transparent", border: "none", outline: "none", width: "100%", marginBottom: "24px" }} 
        />

        {/* Properties List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {properties.filter(p => p.id !== 'title').map(prop => (
            <div key={prop.id} style={{ display: "flex", alignItems: "center", padding: "7px 0" }}>
              <div style={{ width: "110px", display: "flex", alignItems: "center", gap: "8px", color: "var(--mantine-color-dimmed)", fontSize: "13px", flexShrink: 0 }}>
                {getPropIcon(prop.type)}
                {prop.name}
              </div>
              <div style={{ flex: 1, padding: "2px 6px", borderRadius: "4px" }} className="hover-bg-gray">
                {renderPropertyInput(prop)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "6px 0", fontSize: "13px", color: "var(--mantine-color-dimmed)", cursor: "pointer" }}>
          <IconPlus size={13} /> Add a property
        </div>

        {/* Comments Section */}
        <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--mantine-color-default-border)" }}>
          <div style={{ fontSize: "13px", marginBottom: "12px", color: "var(--mantine-color-dimmed)" }}>Comments</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#6f6ff5,#a86ff5)" }} />
            <input 
              type="text" 
              placeholder="Add a comment..." 
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14px", color: "var(--mantine-color-text)" }} 
            />
          </div>
        </div>

        {/* Description Section */}
        <div style={{ marginTop: "32px", fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
          <Textarea
            placeholder="Press 'enter' to continue with an empty page, or create a template"
            autosize
            minRows={4}
            variant="unstyled"
            value={item.properties.description || ""}
            onChange={(e) => updateProperty('description', e.target.value)}
            styles={{ input: { fontSize: '15px' } }}
          />
        </div>
      </div>
    </Drawer>
  );
}
