import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Group,
    Text,
    Switch,
    UnstyledButton,
    Divider,
    Menu,
    TextInput,
    ColorSwatch,
} from '@mantine/core';
import { DatePicker as MantineDatePicker, TimeInput } from '@mantine/dates';
import {
    IconChevronRight,
    IconCheck,
} from '@tabler/icons-react';
import classes from './date-picker.module.css';
import dayjs from 'dayjs';
import { DatePickerValue, getFormatLabel, formatSelectedDate } from './utils';


interface DatePickerProps {
    value: DatePickerValue;
    onChange: (value: DatePickerValue) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
    const [hasEndDate, setHasEndDate] = useState(!!value.end);

    useEffect(() => {
        setHasEndDate(!!value.end);
    }, [value.end]);

    const handleDateChange = (dates: any) => {
        if (hasEndDate) {
            if (Array.isArray(dates)) {
                const [start, end] = dates;
                onChange({ ...value, start, end });
            }
        } else {
            onChange({ ...value, start: dates, end: null });
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeStr = e.currentTarget.value;
        if (!value.start || !timeStr) return;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const newDate = dayjs(value.start).hour(hours).minute(minutes).toDate();
        onChange({ ...value, start: newDate });
    };

    const toggleEndDate = (val: boolean) => {
        setHasEndDate(val);
        if (!val) {
            onChange({ ...value, end: null });
        }
    };

    const toggleIncludeTime = (val: boolean) => {
        onChange({ ...value, includeTime: val });
    };

    const selectedDateLabel = useMemo(() => {
        return formatSelectedDate(value);
    }, [value]);

    const timeValue = value.start ? dayjs(value.start).format('HH:mm') : '';

    return (
        <Box className={classes.datePickerContainer} p="sm">
            <TextInput
                readOnly
                value={selectedDateLabel}
                placeholder="Empty"
                size="xs"
                variant="filled"
                mb="xs"
            />

            <Box className={classes.calendarWrapper}>
                <MantineDatePicker
                    type={hasEndDate ? 'range' : 'default'}
                    value={hasEndDate ? [value.start, value.end] : value.start}
                    onChange={handleDateChange as any}
                    size="sm"
                />
            </Box>

            <Divider my="xs" />

            <Box>
                <Group justify="space-between" className={classes.optionItem} py={4}>
                    <Text size="sm">End date</Text>
                    <Switch
                        size="xs"
                        checked={hasEndDate}
                        onChange={(e) => toggleEndDate(e.currentTarget.checked)}
                    />
                </Group>

                <Menu position="right-start" offset={10} width={200} withinPortal>
                    <Menu.Target>
                        <UnstyledButton className={classes.optionItem} py={4} style={{ width: '100%' }}>
                            <Group justify="space-between">
                                <Text size="sm">Date format</Text>
                                <Group gap={4}>
                                    <Text size="xs" c="dimmed">{getFormatLabel(value.format)}</Text>
                                    <IconChevronRight size={14} color="var(--mantine-color-dimmed)" />
                                </Group>
                            </Group>
                        </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={() => onChange({ ...value, format: 'full' })}>Full date</Menu.Item>
                        <Menu.Item onClick={() => onChange({ ...value, format: 'month-day-year' })}>Month/Day/Year</Menu.Item>
                        <Menu.Item onClick={() => onChange({ ...value, format: 'day-month-year' })}>Day/Month/Year</Menu.Item>
                        <Menu.Item onClick={() => onChange({ ...value, format: 'year-month-day' })}>Year/Month/Day</Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <Group justify="space-between" className={classes.optionItem} py={4}>
                    <Text size="sm">Include time</Text>
                    <Switch
                        size="xs"
                        checked={value.includeTime}
                        onChange={(e) => toggleIncludeTime(e.currentTarget.checked)}
                    />
                </Group>

                {value.includeTime && (
                    <Box px={8} pb={4}>
                        <TimeInput
                            size="xs"
                            label="Time"
                            value={timeValue}
                            onChange={handleTimeChange}
                        />
                    </Box>
                )}

                <Divider my="xs" />

                <Box px={8} pb="xs">
                    <Text size="sm" mb={8} fw={500}>Text color</Text>
                    <Group gap={8}>
                        {[
                            { name: "Default", color: null },
                            { name: "Gray", color: "#868e96" },
                            { name: "Red", color: "#fa5252" },
                            { name: "Pink", color: "#e64980" },
                            { name: "Grape", color: "#be4bdb" },
                            { name: "Violet", color: "#7950f2" },
                            { name: "Indigo", color: "#4c6ef5" },
                            { name: "Blue", color: "#228be6" },
                            { name: "Cyan", color: "#15aabf" },
                            { name: "Teal", color: "#12b886" },
                            { name: "Green", color: "#40c057" },
                            { name: "Lime", color: "#82c91e" },
                            { name: "Yellow", color: "#fab005" },
                            { name: "Orange", color: "#fd7e14" },
                        ].map((c) => (
                            <UnstyledButton
                                key={c.name}
                                onClick={() => onChange({ ...value, color: c.color })}
                                title={c.name}
                            >
                                <ColorSwatch
                                    color={c.color || "#000000"}
                                    size={20}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {(value.color === c.color || (!value.color && !c.color)) && (
                                        <IconCheck size={12} color="#fff" />
                                    )}
                                </ColorSwatch>
                            </UnstyledButton>
                        ))}
                    </Group>
                </Box>
            </Box>
        </Box>
    );
}
