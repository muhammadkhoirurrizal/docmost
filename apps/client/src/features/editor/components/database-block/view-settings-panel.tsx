import { Popover, UnstyledButton, Text, Group, Stack, Select, ActionIcon, Menu, Divider } from "@mantine/core";
import { IconFilter, IconArrowsSort, IconDots, IconPlus, IconTrash, IconLayoutBoard } from "@tabler/icons-react";
import { DatabaseView, DatabasePropertySchema, DatabaseViewLayout } from "@docmost/editor-ext";

interface ViewSettingsPanelProps {
  view: DatabaseView;
  schema: DatabasePropertySchema[];
  onUpdateView: (updates: Partial<DatabaseView>) => void;
}

export default function ViewSettingsPanel({ view, schema, onUpdateView }: ViewSettingsPanelProps) {
  
  // This is a simplified version of the settings panel for demonstration.
  // In a full implementation, Filter and Sort would open detailed popovers.
  
  const handleAddFilter = () => {
    const defaultProp = schema[0];
    if (!defaultProp) return;
    
    const newFilter = {
      propId: defaultProp.id,
      op: "is" as const,
      value: ""
    };
    onUpdateView({ filter: [...(view.filter || []), newFilter] });
  };
  
  const handleAddSort = () => {
    const defaultProp = schema[0];
    if (!defaultProp) return;
    
    const newSort = {
      propId: defaultProp.id,
      dir: "asc" as const
    };
    onUpdateView({ sort: [...(view.sort || []), newSort] });
  };

  const handleLayoutChange = (layout: DatabaseViewLayout) => {
    onUpdateView({ layout });
  };

  const hasFilters = view.filter && view.filter.length > 0;
  const hasSorts = view.sort && view.sort.length > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, paddingRight: 8 }}>
      
      {/* Filter Button */}
      <Popover width={300} position="bottom-end" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, fontSize: 13, color: hasFilters ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)" }}>
            <IconFilter size={13} /> {hasFilters ? "Filtered" : "Filter"}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <Text size="sm" fw={500}>Filters</Text>
            {(!view.filter || view.filter.length === 0) ? (
              <Text size="xs" c="dimmed">No filters applied to this view</Text>
            ) : (
              <Text size="xs" c="dimmed">Filters are active (implementation coming soon)</Text>
            )}
            <UnstyledButton onClick={handleAddFilter} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--mantine-color-blue-filled)" }}>
              <IconPlus size={14} /> Add filter
            </UnstyledButton>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* Sort Button */}
      <Popover width={300} position="bottom-end" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, fontSize: 13, color: hasSorts ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)" }}>
            <IconArrowsSort size={13} /> {hasSorts ? "Sorted" : "Sort"}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <Text size="sm" fw={500}>Sorts</Text>
            {(!view.sort || view.sort.length === 0) ? (
              <Text size="xs" c="dimmed">No sorts applied to this view</Text>
            ) : (
              <Text size="xs" c="dimmed">Sorts are active (implementation coming soon)</Text>
            )}
            <UnstyledButton onClick={handleAddSort} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--mantine-color-blue-filled)" }}>
              <IconPlus size={14} /> Add sort
            </UnstyledButton>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* Settings Menu */}
      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <UnstyledButton style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: 4, color: "var(--mantine-color-dimmed)" }}>
            <IconDots size={16} />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Layout</Menu.Label>
          <Menu.Item 
            leftSection={<IconLayoutBoard size={14} />} 
            onClick={() => handleLayoutChange("table")}
            disabled={view.layout === "table"}
          >
            Table
          </Menu.Item>
          <Menu.Item 
            leftSection={<IconLayoutBoard size={14} />} 
            onClick={() => handleLayoutChange("kanban")}
            disabled={view.layout === "kanban"}
          >
            Kanban
          </Menu.Item>
          <Menu.Item 
            leftSection={<IconLayoutBoard size={14} />} 
            onClick={() => handleLayoutChange("calendar")}
            disabled={view.layout === "calendar"}
          >
            Calendar
          </Menu.Item>
          <Menu.Item 
            leftSection={<IconLayoutBoard size={14} />} 
            onClick={() => handleLayoutChange("timeline")}
            disabled={view.layout === "timeline"}
          >
            Timeline
          </Menu.Item>
          
          <Divider my="xs" />
          
          <Menu.Label>Properties</Menu.Label>
          <Menu.Item>Show/Hide Properties (TODO)</Menu.Item>
          
          <Divider my="xs" />
          <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
            Delete view
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

    </div>
  );
}
