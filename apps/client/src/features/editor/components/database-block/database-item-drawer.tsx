import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { Drawer, Text, Group, ActionIcon, Textarea, Tooltip } from "@mantine/core";
import { IconX, IconShare, IconStar, IconDots, IconCalendar, IconUser, IconCircleDot, IconPlus, IconMaximize, IconFileText } from "@tabler/icons-react";
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
          <Group gap="xs" align="center" style={{ width: '100%', flexWrap: 'nowrap' }}>
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
        const activeOption = prop.options?.find(o => o.id === value);
        return (
          <select
            value={value || ""}
            onChange={(e) => updateProperty(prop.id, e.target.value)}
            style={{
              border: 'none', background: activeOption ? `var(--mantine-color-${activeOption.color}-filled, var(--mantine-color-dark-4))` : 'transparent',
              color: activeOption ? 'white' : 'var(--mantine-color-text)',
              outline: 'none', fontFamily: 'inherit', fontSize: '13px',
              padding: '2px 6px', borderRadius: '4px', cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <option value="" disabled style={{ background: "var(--mantine-color-dark-6)", color: "var(--mantine-color-text)" }}>Empty</option>
            {prop.options?.map(opt => (
              <option key={opt.id} value={opt.id} style={{ background: "var(--mantine-color-dark-6)", color: "var(--mantine-color-text)" }}>
                {opt.label}
              </option>
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
      default: return <IconFileText size={14} />;
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={540} // Wider to match Notion's side peek
      padding={0}
      withCloseButton={false}
      overlayProps={{ opacity: 0.3, blur: 0 }}
      styles={{ content: { background: "var(--mantine-color-body)", borderLeft: "1px solid var(--mantine-color-default-border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" } }}
    >
      {/* Top Bar (Notion Style) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid transparent", transition: "border-bottom 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Tooltip label="Open as page" position="bottom" withArrow>
            <ActionIcon variant="subtle" size="md" c="dimmed"><IconMaximize size={16} /></ActionIcon>
          </Tooltip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ActionIcon variant="subtle" size="md" c="dimmed"><IconShare size={16} /></ActionIcon>
          <ActionIcon variant="subtle" size="md" c="dimmed"><IconStar size={16} /></ActionIcon>
          <ActionIcon variant="subtle" size="md" c="dimmed"><IconDots size={16} /></ActionIcon>
          <div style={{ width: "1px", height: "16px", background: "var(--mantine-color-default-border)", margin: "0 4px" }} />
          <ActionIcon variant="subtle" size="md" onClick={onClose} c="dimmed"><IconX size={16} /></ActionIcon>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div style={{ padding: "32px 56px 40px 56px", height: "calc(100vh - 48px)", overflowY: "auto" }}>
        
        {/* Title Input */}
        <input 
          type="text" 
          value={item.properties.title || ""} 
          onChange={(e) => updateProperty('title', e.target.value)}
          placeholder="Untitled" 
          style={{ fontSize: "32px", fontWeight: 700, color: "var(--mantine-color-text)", background: "transparent", border: "none", outline: "none", width: "100%", marginBottom: "16px", lineHeight: 1.2 }} 
        />

        {/* Properties Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "16px" }}>
          {properties.filter(p => p.id !== 'title').map(prop => (
            <div key={prop.id} style={{ display: "flex", alignItems: "flex-start", padding: "6px 0", minHeight: "32px" }}>
              {/* Property Label */}
              <div style={{ width: "140px", display: "flex", alignItems: "center", gap: "8px", color: "var(--mantine-color-dimmed)", fontSize: "14px", flexShrink: 0, paddingTop: "2px" }}>
                {getPropIcon(prop.type)}
                {prop.name}
              </div>
              {/* Property Value */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: "24px", padding: "0 6px", marginLeft: "-6px", borderRadius: "4px", transition: "background 0.1s ease" }}>
                {renderPropertyInput(prop)}
              </div>
            </div>
          ))}
          
          {/* Add Property Button */}
          <div style={{ display: "flex", alignItems: "center", padding: "6px 0", marginTop: "4px" }}>
            <div style={{ width: "140px" }} /> {/* Spacer */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--mantine-color-dimmed)", cursor: "pointer", padding: "2px 6px", marginLeft: "-6px", borderRadius: "4px" }}>
              <IconPlus size={14} /> Add a property
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--mantine-color-default-border)", width: "100%", margin: "16px 0 24px 0" }} />

        {/* Page Content / Body (MVP: Textarea) */}
        <div style={{ color: "var(--mantine-color-text)", fontFamily: "inherit" }}>
          <Textarea
            placeholder="Press Enter to continue with an empty page, or create a template"
            autosize
            minRows={10}
            variant="unstyled"
            value={item.properties.description || ""}
            onChange={(e) => updateProperty('description', e.target.value)}
            styles={{ 
              input: { 
                fontSize: '15px', 
                lineHeight: 1.6, 
                padding: 0, 
                color: "var(--mantine-color-text)" 
              } 
            }}
          />
        </div>
      </div>
    </Drawer>
  );
}
