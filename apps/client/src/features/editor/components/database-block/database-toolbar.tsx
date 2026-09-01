import { Popover, UnstyledButton, TextInput, ActionIcon } from "@mantine/core";
import { IconSearch, IconFilter, IconArrowsSort, IconX } from "@tabler/icons-react";
import { DatabaseView, DatabasePropertySchema } from "@docmost/editor-ext";
import { useState } from "react";
import FilterPanel from "./filter-panel";
import SortPanel from "./sort-panel";

interface DatabaseToolbarProps {
  view: DatabaseView;
  schema: DatabasePropertySchema[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onUpdateView: (updates: Partial<DatabaseView>) => void;
}

export default function DatabaseToolbar({ view, schema, searchQuery, onSearchChange, onUpdateView }: DatabaseToolbarProps) {
  const [searchActive, setSearchActive] = useState(false);
  const [filterOpened, setFilterOpened] = useState(false);
  const [sortOpened, setSortOpened] = useState(false);

  const hasFilters = view.filter && view.filter.length > 0;
  const hasSorts = view.sort && view.sort.length > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {/* Search */}
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
          <IconSearch size={16} />
        </UnstyledButton>
      )}

      {/* Filter */}
      <Popover shadow="md" width={320} position="bottom-end" withArrow opened={filterOpened} onChange={setFilterOpened}>
        <Popover.Target>
          <UnstyledButton
            onClick={() => setFilterOpened((o) => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "4px", borderRadius: 4, 
              color: hasFilters ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
              background: filterOpened ? "var(--mantine-color-default-hover)" : "transparent"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--mantine-color-default-hover)"}
            onMouseLeave={e => { if (!filterOpened) e.currentTarget.style.background = "transparent" }}
          >
            <IconFilter size={16} />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <FilterPanel view={view} schema={schema} onUpdateView={onUpdateView} />
        </Popover.Dropdown>
      </Popover>

      {/* Sort */}
      <Popover shadow="md" width={320} position="bottom-end" withArrow opened={sortOpened} onChange={setSortOpened}>
        <Popover.Target>
          <UnstyledButton
            onClick={() => setSortOpened((o) => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "4px", borderRadius: 4, 
              color: hasSorts ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)",
              background: sortOpened ? "var(--mantine-color-default-hover)" : "transparent"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--mantine-color-default-hover)"}
            onMouseLeave={e => { if (!sortOpened) e.currentTarget.style.background = "transparent" }}
          >
            <IconArrowsSort size={16} />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <SortPanel view={view} schema={schema} onUpdateView={onUpdateView} />
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
