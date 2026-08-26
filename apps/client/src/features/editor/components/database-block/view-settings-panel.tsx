import { Popover, UnstyledButton, Text, Group, Stack, Switch, Divider, TextInput } from "@mantine/core";
import { IconFilter, IconArrowsSort, IconDots, IconTrash, IconTable, IconColumns, IconCalendar, IconTimeline, IconEye } from "@tabler/icons-react";
import { DatabaseView, DatabasePropertySchema, DatabaseViewLayout } from "@docmost/editor-ext";
import { useState, useEffect } from "react";

interface ViewSettingsPanelProps {
  view: DatabaseView;
  schema: DatabasePropertySchema[];
  onUpdateView: (updates: Partial<DatabaseView>) => void;
  onDeleteView?: () => void;
}

export default function ViewSettingsPanel({ view, schema, onUpdateView, onDeleteView }: ViewSettingsPanelProps) {
  const hasFilters = view.filter && view.filter.length > 0;
  const hasSorts = view.sort && view.sort.length > 0;

  // Local state for name input to prevent jittering on every keystroke
  const [viewName, setViewName] = useState(view.name || "");
  useEffect(() => { setViewName(view.name || ""); }, [view.name]);

  const hiddenPropIds: string[] = (view.visibility && view.visibility.length > 0)
    ? schema.filter(p => !view.visibility.includes(p.id)).map(p => p.id)
    : [];

  const togglePropVisibility = (propId: string) => {
    const currentVisible: string[] = view.visibility && view.visibility.length > 0
      ? view.visibility
      : schema.map(p => p.id);

    const isVisible = currentVisible.includes(propId);
    const newVisibility = isVisible
      ? currentVisible.filter(id => id !== propId)
      : [...currentVisible, propId];

    onUpdateView({ visibility: newVisibility });
  };

  const handleLayoutChange = (layout: DatabaseViewLayout) => {
    onUpdateView({ layout });
  };

  const LAYOUT_OPTIONS: { layout: DatabaseViewLayout; label: string; icon: JSX.Element }[] = [
    { layout: "table", label: "Table", icon: <IconTable size={20} /> },
    { layout: "kanban", label: "Board", icon: <IconColumns size={20} /> },
    { layout: "calendar", label: "Calendar", icon: <IconCalendar size={20} /> },
    { layout: "timeline", label: "Timeline", icon: <IconTimeline size={20} /> },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

      {/* Filter Button */}
      <Popover width={280} position="bottom-end" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
            borderRadius: 4, fontSize: 13,
            color: hasFilters ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
            background: hasFilters ? "var(--mantine-color-blue-light)" : "transparent",
          }}>
            <IconFilter size={13} />
            {hasFilters ? `Filtered (${view.filter!.length})` : "Filter"}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed">FILTER</Text>
            {(!view.filter || view.filter.length === 0)
              ? <Text size="xs" c="dimmed">No filters applied to this view.</Text>
              : <Text size="xs" c="dimmed">{view.filter.length} active filter(s)</Text>
            }
            <Divider />
            <Text size="xs" c="dimmed">Full filter UI coming soon.</Text>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* Sort Button */}
      <Popover width={280} position="bottom-end" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
            borderRadius: 4, fontSize: 13,
            color: hasSorts ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
            background: hasSorts ? "var(--mantine-color-blue-light)" : "transparent",
          }}>
            <IconArrowsSort size={13} />
            {hasSorts ? `Sorted (${view.sort!.length})` : "Sort"}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed">SORT</Text>
            {(!view.sort || view.sort.length === 0)
              ? <Text size="xs" c="dimmed">No sorts applied to this view.</Text>
              : <Text size="xs" c="dimmed">{view.sort.length} active sort(s)</Text>
            }
            <Divider />
            <Text size="xs" c="dimmed">Full sort UI coming soon.</Text>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* Properties visibility */}
      <Popover width={240} position="bottom-end" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
            borderRadius: 4, fontSize: 13, color: "var(--mantine-color-dimmed)",
          }}>
            <IconEye size={13} />
            {hiddenPropIds.length > 0 ? `Properties (${hiddenPropIds.length} hidden)` : "Properties"}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed">PROPERTIES</Text>
            {schema.filter(p => p.id !== "title").map(prop => {
              const isVisible = !hiddenPropIds.includes(prop.id);
              return (
                <Group key={prop.id} justify="space-between" wrap="nowrap">
                  <Text size="sm">{prop.name}</Text>
                  <Switch
                    size="xs"
                    checked={isVisible}
                    onChange={() => togglePropVisibility(prop.id)}
                  />
                </Group>
              );
            })}
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* View Settings (3-dots) */}
      <Popover shadow="md" width={260} position="bottom-end" withArrow>
        <Popover.Target>
          <UnstyledButton style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "4px", borderRadius: 4, color: "var(--mantine-color-dimmed)",
          }}>
            <IconDots size={16} />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <Stack gap="xs">
            {/* Rename View */}
            <TextInput
              value={viewName}
              onChange={(e) => setViewName(e.currentTarget.value)}
              onBlur={() => onUpdateView({ name: viewName })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="View name"
              size="xs"
              variant="filled"
              styles={{
                input: { fontWeight: 500 }
              }}
            />

            <Divider my="xs" />

            {/* Layout Section */}
            <div>
              <Group gap="xs" mb="xs" align="center">
                <IconTable size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" fw={500} c="dimmed">Layout</Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                {LAYOUT_OPTIONS.map(opt => {
                  const isSelected = view.layout === opt.layout;
                  return (
                    <UnstyledButton
                      key={opt.layout}
                      onClick={() => handleLayoutChange(opt.layout)}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 4px",
                        borderRadius: 6,
                        background: isSelected ? "var(--mantine-color-blue-light)" : "transparent",
                        color: isSelected ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = "var(--mantine-color-default-hover)";
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        {opt.icon}
                      </div>
                      <Text size="xs" fw={isSelected ? 600 : 400} style={{ fontSize: 11 }}>
                        {opt.label}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Group>
            </div>

            {/* Delete View */}
            {onDeleteView && (
              <>
                <Divider my="xs" />
                <UnstyledButton
                  onClick={onDeleteView}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 4,
                    color: "var(--mantine-color-red-filled)",
                    fontSize: 13, fontWeight: 500,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--mantine-color-red-light)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <IconTrash size={14} />
                  Delete view
                </UnstyledButton>
              </>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>

    </div>
  );
}
