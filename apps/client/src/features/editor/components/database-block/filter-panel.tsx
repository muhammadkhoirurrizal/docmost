import { Group, Stack, Text, Select, TextInput, ActionIcon, UnstyledButton } from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { DatabaseView, DatabasePropertySchema } from "@docmost/editor-ext";

interface FilterPanelProps {
  view: DatabaseView;
  schema: DatabasePropertySchema[];
  onUpdateView: (updates: Partial<DatabaseView>) => void;
}

export default function FilterPanel({ view, schema, onUpdateView }: FilterPanelProps) {
  if (!view.filter || view.filter.length === 0) {
    return (
      <Stack gap="sm" p="xs">
        <Text size="xs" c="dimmed">No filters applied to this view.</Text>
        <Group justify="center">
          <UnstyledButton 
            onClick={() => {
              const newRule = { propId: schema[0]?.id || "", op: "is" as any, value: "" };
              onUpdateView({ filter: [...(view.filter || []), newRule] });
            }}
            style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--mantine-color-blue-filled)", fontSize: 13, fontWeight: 500 }}
          >
            <IconPlus size={14} /> Add filter
          </UnstyledButton>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm" p="xs">
      <Text size="xs" c="dimmed">{view.filter.length} active filter(s)</Text>
      <Stack gap={8}>
        {view.filter.map((rule, idx) => (
          <Group key={idx} gap={4} wrap="nowrap" align="flex-start">
            <Select 
              size="xs" 
              data={schema.map(p => ({ value: p.id, label: p.name }))}
              value={rule.propId}
              onChange={(v) => {
                if (!v) return;
                const newFilter = [...view.filter!];
                newFilter[idx] = { ...newFilter[idx], propId: v };
                onUpdateView({ filter: newFilter });
              }}
              styles={{ input: { width: 100 } }}
            />
            <Select 
              size="xs" 
              data={[
                { value: "is", label: "is" },
                { value: "isNot", label: "is not" },
                { value: "contains", label: "contains" },
                { value: "isEmpty", label: "is empty" },
                { value: "isNotEmpty", label: "is not empty" },
              ]}
              value={rule.op}
              onChange={(v) => {
                if (!v) return;
                const newFilter = [...view.filter!];
                newFilter[idx] = { ...newFilter[idx], op: v as any };
                onUpdateView({ filter: newFilter });
              }}
              styles={{ input: { width: 100 } }}
            />
            {!["isEmpty", "isNotEmpty"].includes(rule.op) && (
              <TextInput 
                size="xs" 
                placeholder="Value"
                value={rule.value || ""}
                onChange={(e) => {
                  const newFilter = [...view.filter!];
                  newFilter[idx] = { ...newFilter[idx], value: e.currentTarget.value };
                  onUpdateView({ filter: newFilter });
                }}
                styles={{ input: { width: 90 } }}
              />
            )}
            <ActionIcon 
              size="xs" 
              color="red" 
              variant="subtle" 
              style={{ marginTop: 2 }}
              onClick={() => {
                const newFilter = [...view.filter!];
                newFilter.splice(idx, 1);
                onUpdateView({ filter: newFilter });
              }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
      <Group justify="center" mt="sm">
        <UnstyledButton 
          onClick={() => {
            const newRule = { propId: schema[0]?.id || "", op: "is" as any, value: "" };
            onUpdateView({ filter: [...(view.filter || []), newRule] });
          }}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--mantine-color-blue-filled)", fontSize: 13, fontWeight: 500 }}
        >
          <IconPlus size={14} /> Add filter
        </UnstyledButton>
      </Group>
    </Stack>
  );
}
