import { Group, Stack, Text, Select, ActionIcon, UnstyledButton } from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { DatabaseView, DatabasePropertySchema } from "@docmost/editor-ext";

interface SortPanelProps {
  view: DatabaseView;
  schema: DatabasePropertySchema[];
  onUpdateView: (updates: Partial<DatabaseView>) => void;
}

export default function SortPanel({ view, schema, onUpdateView }: SortPanelProps) {
  if (!view.sort || view.sort.length === 0) {
    return (
      <Stack gap="sm" p="xs">
        <Text size="xs" c="dimmed">No sorts applied to this view.</Text>
        <Group justify="center">
          <UnstyledButton 
            onClick={() => {
              const newRule = { propId: schema[0]?.id || "", dir: "asc" as any };
              onUpdateView({ sort: [...(view.sort || []), newRule] });
            }}
            style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--mantine-color-blue-filled)", fontSize: 13, fontWeight: 500 }}
          >
            <IconPlus size={14} /> Add sort
          </UnstyledButton>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm" p="xs">
      <Text size="xs" c="dimmed">{view.sort.length} active sort(s)</Text>
      <Stack gap={8}>
        {view.sort.map((rule, idx) => (
          <Group key={idx} gap={4} wrap="nowrap" align="center">
            <Select 
              size="xs" 
              data={schema.map(p => ({ value: p.id, label: p.name }))}
              value={rule.propId}
              onChange={(v) => {
                if (!v) return;
                const newSort = [...view.sort!];
                newSort[idx] = { ...newSort[idx], propId: v };
                onUpdateView({ sort: newSort });
              }}
              styles={{ input: { width: 140 } }}
              comboboxProps={{ withinPortal: false }}
            />
            <Select 
              size="xs" 
              data={[
                { value: "asc", label: "Ascending" },
                { value: "desc", label: "Descending" },
              ]}
              value={rule.dir}
              onChange={(v) => {
                if (!v) return;
                const newSort = [...view.sort!];
                newSort[idx] = { ...newSort[idx], dir: v as any };
                onUpdateView({ sort: newSort });
              }}
              styles={{ input: { width: 110 } }}
              comboboxProps={{ withinPortal: false }}
            />
            <ActionIcon 
              size="xs" 
              color="red" 
              variant="subtle" 
              onClick={() => {
                const newSort = [...view.sort!];
                newSort.splice(idx, 1);
                onUpdateView({ sort: newSort });
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
            const newRule = { propId: schema[0]?.id || "", dir: "asc" as any };
            onUpdateView({ sort: [...(view.sort || []), newRule] });
          }}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--mantine-color-blue-filled)", fontSize: 13, fontWeight: 500 }}
        >
          <IconPlus size={14} /> Add sort
        </UnstyledButton>
      </Group>
    </Stack>
  );
}
