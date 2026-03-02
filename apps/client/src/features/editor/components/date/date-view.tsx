import React, { useMemo } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { UnstyledButton, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { DatePickerValue, getDateFormat } from '../date-picker/utils';
import { DateSelectionModal } from '../date-picker/date-selection-modal';
import dayjs from 'dayjs';
import classes from './date-view.module.css';

const DateView = ({ node, updateAttributes, selected, editor }: NodeViewProps) => {
    const { start, end, includeTime, format } = node.attrs;
    const isEditable = editor?.isEditable;

    const dateValue: DatePickerValue = useMemo(() => {
        const parseDate = (val: any) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        return {
            start: parseDate(start),
            end: parseDate(end),
            includeTime: !!includeTime,
            format: format || 'full'
        };
    }, [start, end, includeTime, format]);

    const displayValue = useMemo(() => {
        if (!dateValue.start) return "Select date";

        const dateFormat = getDateFormat(dateValue.format, dateValue.includeTime);
        let str = dayjs(dateValue.start).format(dateFormat);

        if (dateValue.end) {
            str += ` → ${dayjs(dateValue.end).format(dateFormat)}`;
        }

        return str;
    }, [dateValue]);

    const handleOpenPicker = (e: React.MouseEvent) => {
        if (!isEditable) return;
        
        e.preventDefault();
        e.stopPropagation();

        modals.open({
            title: "Update Date",
            children: (
                <DateSelectionModal
                    initialValue={dateValue}
                    confirmLabel="Update"
                    onConfirm={(newVal: DatePickerValue) => {
                        const startIso = newVal.start instanceof Date ? newVal.start.toISOString() : newVal.start;
                        const endIso = newVal.end instanceof Date ? newVal.end.toISOString() : newVal.end;

                        updateAttributes({
                            start: startIso,
                            end: endIso,
                            includeTime: newVal.includeTime,
                            format: newVal.format
                        });
                    }}
                />
            ),
        });
    };

    return (
        <NodeViewWrapper as="span" style={{ display: "inline" }}>
            <UnstyledButton
                component="span"
                onClick={handleOpenPicker}
                className={`${classes.dateBadge} ${selected ? classes.selected : ''}`}
                style={{ 
                    cursor: isEditable ? 'pointer' : 'default', 
                    display: 'inline-flex' 
                }}
            >
                <Text size="sm" span>
                    {displayValue}
                </Text>
            </UnstyledButton>
        </NodeViewWrapper>
    );
};

export default DateView;
