import { Popover, UnstyledButton, Text, Group, Stack, Switch, Divider, TextInput, ActionIcon, Select } from "@mantine/core";
import { IconFilter, IconArrowsSort, IconDots, IconTrash, IconTable, IconColumns, IconCalendar, IconTimeline, IconEye, IconEyeOff, IconX, IconChevronRight, IconChevronLeft, IconPlus } from "@tabler/icons-react";
import { DatabaseView, DatabasePropertySchema, DatabaseViewLayout } from "@docmost/editor-ext";
import { useState, useEffect } from "react";

interface ViewSettingsPanelProps {
  view: DatabaseView;
  schema: DatabasePropertySchema[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onUpdateView: (updates: Partial<DatabaseView>) => void;
  onDuplicateView?: () => void;
  onDeleteView?: () => void;
  onCreateDateProperty?: (target: "calendarBy" | "calendarEnd") => void;
}

type SettingsPage = "main" | "properties" | "filter" | "sort" | "group" | "group-select" | "calendarBy" | "calendarEnd";

export default function ViewSettingsPanel({ view, schema, searchQuery, onSearchChange, onUpdateView, onDuplicateView, onDeleteView, onCreateDateProperty }: ViewSettingsPanelProps) {
  const [viewName, setViewName] = useState(view.name || "");
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [activePage, setActivePage] = useState<SettingsPage>("main");
  const [searchActive, setSearchActive] = useState(false);
  
  useEffect(() => { setViewName(view.name || ""); }, [view.name]);
  
  // Reset page to main when popover is closed
  useEffect(() => {
    if (!settingsOpened) {
      setTimeout(() => setActivePage("main"), 200); // Wait for transition
    }
  }, [settingsOpened]);

  const hasFilters = view.filter && view.filter.length > 0;
  const hasSorts = view.sort && view.sort.length > 0;

  const hiddenPropIds: string[] = (view.visibility && view.visibility.length > 0)
    ? schema.filter(p => !view.visibility.includes(p.id)).map(p => p.id)
    : [];
    
  const visiblePropsCount = schema.length - hiddenPropIds.length;

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

  const getPropName = (id: string | null | undefined) => {
    if (!id) return "None";
    return schema.find(p => p.id === id)?.name || "None";
  };

  const LAYOUT_OPTIONS: { layout: DatabaseViewLayout; label: string; icon: JSX.Element }[] = [
    { layout: "table", label: "Table", icon: <IconTable size={20} /> },
    { layout: "kanban", label: "Board", icon: <IconColumns size={20} /> },
    { layout: "calendar", label: "Calendar", icon: <IconCalendar size={20} /> },
    { layout: "timeline", label: "Timeline", icon: <IconTimeline size={20} /> },
  ];

  // Helper for menu item
  const MenuItem = ({ icon, label, subtext, onClick, color, isDestructive }: { icon?: JSX.Element, label: string, subtext?: string, onClick: () => void, color?: string, isDestructive?: boolean }) => (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "6px 8px", borderRadius: 4,
        background: color ? `var(--mantine-color-${color}-light)` : "transparent",
        color: color ? `var(--mantine-color-${color}-filled)` : "var(--mantine-color-text)",
        transition: "background 0.1s"
      }}
      onMouseEnter={e => { 
        if (isDestructive) {
          e.currentTarget.style.background = "var(--mantine-color-red-light)";
          e.currentTarget.style.color = "var(--mantine-color-red-filled)";
        } else if (!color) {
          e.currentTarget.style.background = "var(--mantine-color-default-hover)"; 
        }
      }}
      onMouseLeave={e => { 
        if (isDestructive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--mantine-color-text)";
        } else if (!color) {
          e.currentTarget.style.background = "transparent"; 
        }
      }}
    >
      <Group gap="xs">
        {icon && <div style={{ display: "flex", color: isDestructive ? "inherit" : (color ? `var(--mantine-color-${color}-filled)` : "var(--mantine-color-dimmed)") }}>
          {icon}
        </div>}
        <Text size="sm" fw={500}>{label}</Text>
      </Group>
      {subtext !== undefined ? (
        <Group gap={4} wrap="nowrap">
          <Text size="xs" c="dimmed">{subtext}</Text>
          <IconChevronRight size={14} color="var(--mantine-color-dimmed)" />
        </Group>
      ) : null}
    </UnstyledButton>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {/* Search Input / Button */}
      {searchActive ? (
        <TextInput
          size="xs"
          placeholder="Search..."
          value={searchQuery || ""}
          onChange={(e) => onSearchChange?.(e.currentTarget.value)}
          rightSection={
            <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => {
              setSearchActive(false);
              onSearchChange?.("");
            }}>
              <IconX size={12} />
            </ActionIcon>
          }
          styles={{ input: { width: 140, transition: "width 0.2s ease" } }}
        />
      ) : (
        <UnstyledButton
          onClick={() => setSearchActive(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "4px", borderRadius: 4, color: "var(--mantine-color-dimmed)",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--mantine-color-default-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <IconFilter style={{ transform: 'rotate(90deg)' }} size={16} /> {/* Using IconFilter rotated or any search icon */}
        </UnstyledButton>
      )}

      {/* Filter Button */}
      <UnstyledButton
        onClick={() => { setActivePage("filter"); setSettingsOpened(true); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "4px", borderRadius: 4, 
          color: hasFilters ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--mantine-color-default-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <IconFilter size={16} />
      </UnstyledButton>

      {/* Sort Button */}
      <UnstyledButton
        onClick={() => { setActivePage("sort"); setSettingsOpened(true); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "4px", borderRadius: 4, 
          color: hasSorts ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--mantine-color-default-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <IconArrowsSort size={16} />
      </UnstyledButton>

      {/* View Settings (3-dots) */}
      <Popover shadow="md" width={320} position="bottom-end" withArrow opened={settingsOpened} onChange={setSettingsOpened}>
        <Popover.Target>
          <UnstyledButton
            onClick={() => setSettingsOpened((o) => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "4px", borderRadius: 4, color: "var(--mantine-color-dimmed)",
              background: settingsOpened ? "var(--mantine-color-default-hover)" : "transparent",
            }}>
            <IconDots size={16} />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p="md">
          {activePage === "main" && (
            <Stack gap="sm">
              {/* Header */}
              <Group justify="space-between" align="center" mb={2}>
                <Text size="sm" fw={600} c="dimmed">View settings</Text>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setSettingsOpened(false)}>
                  <IconX size={16} />
                </ActionIcon>
              </Group>

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

              <Divider my="xs" />

              {/* Settings Menu */}
              <Stack gap={2}>
                <MenuItem 
                  icon={<IconEye size={16} />} 
                  label="Properties" 
                  subtext={`${visiblePropsCount} shown`}
                  onClick={() => setActivePage("properties")} 
                />
                <MenuItem 
                  icon={<IconFilter size={16} />} 
                  label="Filter" 
                  subtext={hasFilters ? `${view.filter!.length} active` : ""}
                  onClick={() => setActivePage("filter")} 
                />
                <MenuItem 
                  icon={<IconArrowsSort size={16} />} 
                  label="Sort" 
                  subtext={hasSorts ? `${view.sort!.length} active` : ""}
                  onClick={() => setActivePage("sort")} 
                />
                
                {view.layout === "calendar" ? (
                  <>
                    <MenuItem 
                      icon={<IconCalendar size={16} />} 
                      label="Calendar by" 
                      subtext={getPropName(view.calendarBy)}
                      onClick={() => setActivePage("calendarBy")} 
                    />
                    <MenuItem 
                      icon={<IconTimeline size={16} />} 
                      label="End date" 
                      subtext={getPropName(view.calendarEnd)}
                      onClick={() => setActivePage("calendarEnd")} 
                    />
                  </>
                ) : (
                  <MenuItem 
                    icon={<IconColumns size={16} />} 
                    label="Group by" 
                    subtext={getPropName(view.groupBy)}
                    onClick={() => setActivePage(view.groupBy ? "group" : "group-select")} 
                  />
                )}
              </Stack>

              {/* Actions */}
              <Divider my="xs" />
              {onDuplicateView && (
                <MenuItem 
                  icon={<IconColumns size={16} />} // Adjust icon as needed (like IconCopy if imported, using IconColumns as placeholder)
                  label="Duplicate view" 
                  onClick={() => {
                    onDuplicateView();
                    setSettingsOpened(false);
                  }} 
                />
              )}
              {onDeleteView && (
                <MenuItem 
                  icon={<IconTrash size={16} />} 
                  label="Delete view" 
                  isDestructive={true}
                  onClick={onDeleteView} 
                />
              )}
            </Stack>
          )}

          {activePage === "properties" && (
            <Stack gap="sm">
              <Group gap="xs" align="center" mb={2}>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text size="sm" fw={600} c="dimmed">Properties</Text>
              </Group>
              <Divider mb="xs" />
              <Stack gap="xs">
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
            </Stack>
          )}

          {activePage === "filter" && (
            <Stack gap="sm">
              <Group gap="xs" align="center" mb={2}>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text size="sm" fw={600} c="dimmed">Filter</Text>
              </Group>
              <Divider mb="xs" />
              {(!view.filter || view.filter.length === 0)
                ? <Text size="xs" c="dimmed">No filters applied to this view.</Text>
                : <Stack gap={8}>
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
              }
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
          )}

          {activePage === "sort" && (
            <Stack gap="sm">
              <Group gap="xs" align="center" mb={2}>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text size="sm" fw={600} c="dimmed">Sort</Text>
              </Group>
              <Divider mb="xs" />
              {(!view.sort || view.sort.length === 0)
                ? <Text size="xs" c="dimmed">No sorts applied to this view.</Text>
                : <Stack gap={8}>
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
              }
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
          )}

          {activePage === "group-select" && (
            <Stack gap="sm">
              <Group gap="xs" align="center" mb={2}>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text size="sm" fw={600} c="dimmed">Group by</Text>
              </Group>
              <Divider mb="xs" />
              <Stack gap={2}>
                <MenuItem
                  icon={<IconX size={16} />}
                  label="None"
                  color={view.groupBy === null ? "blue" : undefined}
                  onClick={() => onUpdateView({ groupBy: null })}
                />
                {schema.filter(p => ["select", "multi_select", "status", "user", "date"].includes(p.type)).map(prop => (
                  <MenuItem
                    key={prop.id}
                    icon={<IconColumns size={16} />}
                    label={prop.name}
                    color={view.groupBy === prop.id ? "blue" : undefined}
                    onClick={() => onUpdateView({ groupBy: prop.id })}
                  />
                ))}
              </Stack>
            </Stack>
          )}

          {activePage === "group" && (() => {
            const groupProp = schema.find(p => p.id === view.groupBy);
            if (!groupProp) return null;

            if (groupProp.type === "date") {
              return (
                <Stack gap="sm">
                  <Group gap="xs" align="center" mb={2} justify="space-between">
                    <Group gap="xs">
                      <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                        <IconChevronLeft size={16} />
                      </ActionIcon>
                      <Text size="sm" fw={600} c="dimmed">Date by</Text>
                    </Group>
                  </Group>
                  <Divider mb="xs" />
                  <Stack gap={2}>
                    {[
                      { value: "relative", label: "Relative" },
                      { value: "day", label: "Day" },
                      { value: "week", label: "Week" },
                      { value: "month", label: "Month" },
                      { value: "year", label: "Year" }
                    ].map(mode => (
                      <MenuItem
                        key={mode.value}
                        label={mode.label}
                        color={(view.dateGroupMode || "month") === mode.value ? "blue" : undefined}
                        onClick={() => onUpdateView({ dateGroupMode: mode.value as any })}
                      />
                    ))}
                  </Stack>
                  <Divider my="xs" />
                  <MenuItem
                    icon={<IconColumns size={16} />}
                    label="Group by"
                    subtext={groupProp.name}
                    onClick={() => setActivePage("group-select")}
                  />
                </Stack>
              );
            }

            const isAllShowed = groupProp.options ? groupProp.options.every(o => !(view.groupVisibility?.[o.id])) : true;
            return (
              <Stack gap="sm">
                <Group gap="xs" align="center" mb={2} justify="space-between">
                  <Group gap="xs">
                    <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                      <IconChevronLeft size={16} />
                    </ActionIcon>
                    <Text size="sm" fw={600} c="dimmed">Groups</Text>
                  </Group>
                  <UnstyledButton
                    onClick={() => {
                      if (!groupProp.options) return;
                      const newVis = { ...(view.groupVisibility || {}) };
                      groupProp.options.forEach(o => {
                        if (isAllShowed) newVis[o.id] = true;
                        else delete newVis[o.id];
                      });
                      onUpdateView({ groupVisibility: newVis });
                    }}
                    style={{ fontSize: 12, color: "var(--mantine-color-blue-filled)", fontWeight: 500 }}
                  >
                    {isAllShowed ? "Hide All" : "Show All"}
                  </UnstyledButton>
                </Group>
                <Divider mb="xs" />
                <Stack gap={2}>
                  {groupProp.options?.map(opt => {
                    const isHidden = !!view.groupVisibility?.[opt.id];
                    return (
                      <Group key={opt.id} justify="space-between" wrap="nowrap" style={{ padding: "4px 8px" }}>
                        <Group gap={8}>
                           <div style={{ width: 12, height: 12, borderRadius: 6, background: `var(--mantine-color-${opt.color}-filled, ${opt.color})` }} />
                           <Text size="sm" c={isHidden ? "dimmed" : undefined}>{opt.label}</Text>
                        </Group>
                        <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => {
                          const newVis = { ...(view.groupVisibility || {}) };
                          if (isHidden) delete newVis[opt.id];
                          else newVis[opt.id] = true;
                          onUpdateView({ groupVisibility: newVis });
                        }}>
                          {isHidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                        </ActionIcon>
                      </Group>
                    );
                  })}
                  {(!groupProp.options || groupProp.options.length === 0) && (
                     <Text size="xs" c="dimmed" style={{ padding: "4px 8px" }}>No options available.</Text>
                  )}
                </Stack>
                <Divider my="xs" />
                <MenuItem
                  icon={<IconColumns size={16} />}
                  label="Group by"
                  subtext={groupProp.name}
                  onClick={() => setActivePage("group-select")}
                />
              </Stack>
            );
          })()}

          {activePage === "calendarBy" && (
            <Stack gap="sm">
              <Group gap="xs" align="center" mb={2}>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text size="sm" fw={600} c="dimmed">Calendar by</Text>
              </Group>
              <Divider mb="xs" />
              <Stack gap={2}>
                <MenuItem
                  icon={<IconX size={16} />}
                  label="None"
                  color={!view.calendarBy ? "blue" : undefined}
                  onClick={() => onUpdateView({ calendarBy: null })}
                />
                {schema.filter(p => p.type === "date").map(prop => (
                  <MenuItem
                    key={prop.id}
                    icon={<IconCalendar size={16} />}
                    label={prop.name}
                    color={view.calendarBy === prop.id ? "blue" : undefined}
                    onClick={() => onUpdateView({ calendarBy: prop.id })}
                  />
                ))}
                {onCreateDateProperty && (
                  <MenuItem
                    icon={<IconPlus size={16} />}
                    label="Create date property"
                    onClick={() => onCreateDateProperty("calendarBy")}
                  />
                )}
              </Stack>
            </Stack>
          )}

          {activePage === "calendarEnd" && (
            <Stack gap="sm">
              <Group gap="xs" align="center" mb={2}>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setActivePage("main")}>
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text size="sm" fw={600} c="dimmed">End date</Text>
              </Group>
              <Divider mb="xs" />
              <Stack gap={2}>
                <MenuItem
                  icon={<IconX size={16} />}
                  label="None"
                  color={!view.calendarEnd ? "blue" : undefined}
                  onClick={() => onUpdateView({ calendarEnd: null })}
                />
                {schema.filter(p => p.type === "date").map(prop => (
                  <MenuItem
                    key={prop.id}
                    icon={<IconTimeline size={16} />}
                    label={prop.name}
                    color={view.calendarEnd === prop.id ? "blue" : undefined}
                    onClick={() => onUpdateView({ calendarEnd: prop.id })}
                  />
                ))}
                {onCreateDateProperty && (
                  <MenuItem
                    icon={<IconPlus size={16} />}
                    label="Create end date property"
                    onClick={() => onCreateDateProperty("calendarEnd")}
                  />
                )}
              </Stack>
            </Stack>
          )}

        </Popover.Dropdown>
      </Popover>

    </div>
  );
}
