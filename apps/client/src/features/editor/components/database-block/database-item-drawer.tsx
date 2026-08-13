import { Drawer, TextInput, Stack, Group, Text, Textarea, Select, Button, Divider, ActionIcon } from "@mantine/core";
import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { IconCalendar, IconUser, IconCircleCheck, IconPlus, IconGripVertical, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";

interface DatabaseItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onUpdateProperties: (props: DatabaseProperty[]) => void;
}

export default function DatabaseItemDrawer({
  isOpen,
  onClose,
  itemId,
  items,
  properties,
  onUpdateItem,
  onUpdateProperties,
}: DatabaseItemDrawerProps) {
  const { t } = useTranslation();
  const item = items.find((i) => i.id === itemId);

  if (!item) return null;

  const updateProperty = (propId: string, value: any) => {
    onUpdateItem({
      ...item,
      properties: {
        ...item.properties,
        [propId]: value,
      },
    });
  };

  const updateContent = (val: string) => {
    onUpdateItem({
      ...item,
      content: val,
    });
  };

  const renderPropertyInput = (prop: DatabaseProperty) => {
    const value = item.properties[prop.id];
    
    switch (prop.type) {
      case "text":
        return (
          <TextInput
            variant="unstyled"
            value={value || ""}
            onChange={(e) => updateProperty(prop.id, e.currentTarget.value)}
            placeholder="Empty"
          />
        );
      case "date":
        const dateVal = value as { start?: string, end?: string } | string | null;
        const startStr = typeof dateVal === 'object' && dateVal?.start ? dateVal.start : (typeof dateVal === 'string' ? dateVal : null);
        const endStr = typeof dateVal === 'object' && dateVal?.end ? dateVal.end : startStr;
        
        return (
          <Group gap="xs" align="center">
            <input
              type="date"
              value={startStr ? dayjs(startStr).format('YYYY-MM-DD') : ""}
              onChange={(e) => updateProperty(prop.id, { start: e.target.value ? new Date(e.target.value).toISOString() : null, end: endStr })}
              style={{ border: 'none', background: 'transparent', color: 'inherit', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }}
            />
            <Text size="sm" c="dimmed">→</Text>
            <input
              type="date"
              value={endStr ? dayjs(endStr).format('YYYY-MM-DD') : ""}
              onChange={(e) => updateProperty(prop.id, { start: startStr, end: e.target.value ? new Date(e.target.value).toISOString() : null })}
              style={{ border: 'none', background: 'transparent', color: 'inherit', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }}
            />
          </Group>
        );
      case "status":
      case "select":
        return (
          <Select
            variant="unstyled"
            data={prop.options?.map(opt => ({ value: opt.id, label: opt.label })) || []}
            value={value || null}
            onChange={(val) => updateProperty(prop.id, val)}
            placeholder="Empty"
          />
        );
      case "user":
        // For MVP, just a text input or simple select
        return (
          <TextInput
            variant="unstyled"
            value={value || ""}
            onChange={(e) => updateProperty(prop.id, e.currentTarget.value)}
            placeholder="Unassigned"
          />
        );
      default:
        return null;
    }
  };

  const getPropIcon = (type: string) => {
    switch (type) {
      case "date": return <IconCalendar size={16} color="var(--mantine-color-dimmed)" />;
      case "user": return <IconUser size={16} color="var(--mantine-color-dimmed)" />;
      case "status": return <IconCircleCheck size={16} color="var(--mantine-color-dimmed)" />;
      default: return <IconGripVertical size={16} color="var(--mantine-color-dimmed)" />;
    }
  };

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      position="right"
      size="xl"
      padding="xl"
      title={null}
      withCloseButton={true}
    >
      <Stack gap="lg">
        {/* Title Editor (always maps to 'title' prop) */}
        <TextInput
          variant="unstyled"
          size="xl"
          styles={{ input: { fontSize: "32px", fontWeight: 700, padding: 0 } }}
          value={item.properties["title"] || ""}
          onChange={(e) => updateProperty("title", e.currentTarget.value)}
          placeholder="Untitled"
        />

        {/* Properties Grid */}
        <Stack gap="xs" style={{ width: "100%", maxWidth: "500px" }}>
          {properties.filter(p => p.id !== "title").map((prop) => (
            <Group key={prop.id} wrap="nowrap" align="center" style={{ width: "100%" }}>
              <Group gap={8} style={{ width: "160px", flexShrink: 0 }}>
                {getPropIcon(prop.type)}
                <Text size="sm" c="dimmed">{prop.name}</Text>
              </Group>
              <div style={{ flex: 1 }}>
                {renderPropertyInput(prop)}
              </div>
            </Group>
          ))}
          
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconPlus size={14} />}
            size="sm"
            justify="flex-start"
            style={{ width: "180px", marginTop: "8px" }}
          >
            {t("Add a property")}
          </Button>
        </Stack>

        <Divider my="sm" />

        {/* Description / Content Editor */}
        <Textarea
          placeholder={t("Press '/' for commands or start typing...")}
          variant="unstyled"
          autosize
          minRows={10}
          value={item.content || ""}
          onChange={(e) => updateContent(e.currentTarget.value)}
          styles={{ input: { fontSize: "16px", padding: 0, lineHeight: 1.6 } }}
        />
      </Stack>
    </Drawer>
  );
}
