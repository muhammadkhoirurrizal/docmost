import React, { useState } from 'react';
import { DatePicker } from './date-picker';
import { DatePickerValue } from './utils';
import { Box, Button, Group } from '@mantine/core';
import { modals } from '@mantine/modals';

interface DateSelectionModalProps {
    initialValue: DatePickerValue;
    onConfirm: (value: DatePickerValue) => void;
    confirmLabel?: string;
}

export function DateSelectionModal({ initialValue, onConfirm, confirmLabel = "Insert" }: DateSelectionModalProps) {
    const [value, setValue] = useState<DatePickerValue>(initialValue);

    const handleConfirm = () => {
        onConfirm(value);
        modals.closeAll();
    };

    const handleClear = () => {
        // Clear logic if needed inside modal
        setValue({
            start: null,
            end: null,
            includeTime: false,
            format: 'full',
            color: null
        });
    };

    return (
        <Box>
            <DatePicker
                value={value}
                onChange={setValue}
            />
            <Group justify="space-between" mt="md" px="sm" pb="sm">
                <Button variant="subtle" color="red" size="xs" onClick={handleClear}>
                    Clear
                </Button>
                <Group gap="xs">
                    <Button variant="subtle" color="gray" size="xs" onClick={() => modals.closeAll()}>
                        Cancel
                    </Button>
                    <Button size="xs" onClick={handleConfirm} disabled={!value.start}>
                        {confirmLabel}
                    </Button>
                </Group>
            </Group>
        </Box>
    );
}
