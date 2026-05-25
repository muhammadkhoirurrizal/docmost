import { ActionIcon, Button, Group, Menu, Select, Badge, Box } from "@mantine/core";
import { IconArrowsSort, IconX, IconPlus, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { DataTableColumn, DataTableSort } from "@docmost/editor-ext";
import { useState } from "react";
import classes from "./data-table.module.css";

interface SortDropdownProps {
    columns: DataTableColumn[];
    sorts: DataTableSort[];
    onSortsChange: (sorts: DataTableSort[]) => void;
}

const SORT_DIRECTIONS = [
    { value: "asc", label: "Ascending", icon: IconSortAscending },
    { value: "desc", label: "Descending", icon: IconSortDescending },
];

export function SortDropdown({ columns, sorts, onSortsChange }: SortDropdownProps) {
    const [opened, setOpened] = useState(false);

    const addSort = () => {
        const newSort: DataTableSort = {
            id: `sort-${Date.now()}`,
            columnId: columns[0]?.id || "",
            direction: "asc",
        };
        onSortsChange([...sorts, newSort]);
    };

    const updateSort = (sortId: string, updates: Partial<DataTableSort>) => {
        onSortsChange(
            sorts.map((s) => (s.id === sortId ? { ...s, ...updates } : s))
        );
    };

    const removeSort = (sortId: string) => {
        onSortsChange(sorts.filter((s) => s.id !== sortId));
    };

    return (
        <Menu opened={opened} onChange={setOpened} position="bottom-start" withinPortal closeOnItemClick={false}>
            <Menu.Target>
                <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconArrowsSort size={14} />}
                    rightSection={sorts.length > 0 ? <Badge size="xs" circle>{sorts.length}</Badge> : null}
                >
                    Sort
                </Button>
            </Menu.Target>

            <Menu.Dropdown style={{ minWidth: 400 }} className={classes.filterDropdown}>
                <Box p="xs">
                    {sorts.length === 0 ? (
                        <Box p="md" style={{ textAlign: "center", color: "var(--mantine-color-dimmed)" }}>
                            No sorting applied
                        </Box>
                    ) : (
                        <Box>
                            {sorts.map((sort) => {
                                return (
                                    <Group key={sort.id} mb="xs" wrap="nowrap" align="center">
                                        <Select
                                            size="xs"
                                            value={sort.columnId}
                                            onChange={(value) => value && updateSort(sort.id, { columnId: value })}
                                            data={columns.map((col) => ({ value: col.id, label: col.name }))}
                                            style={{ flex: 1 }}
                                            comboboxProps={{ withinPortal: false }}
                                        />
                                        <Select
                                            size="xs"
                                            value={sort.direction}
                                            onChange={(value) => value && updateSort(sort.id, { direction: value as 'asc' | 'desc' })}
                                            data={SORT_DIRECTIONS}
                                            style={{ flex: "0 0 140px" }}
                                            comboboxProps={{ withinPortal: false }}
                                        />
                                        <ActionIcon
                                            size="xs"
                                            variant="subtle"
                                            color="red"
                                            onClick={() => removeSort(sort.id)}
                                        >
                                            <IconX size={14} />
                                        </ActionIcon>
                                    </Group>
                                );
                            })}
                        </Box>
                    )}

                    <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPlus size={14} />}
                        onClick={addSort}
                        mt="xs"
                        fullWidth
                    >
                        Add sort
                    </Button>
                </Box>
            </Menu.Dropdown>
        </Menu>
    );
}
