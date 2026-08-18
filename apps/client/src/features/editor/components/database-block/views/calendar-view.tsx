import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { Text, UnstyledButton, Group, ActionIcon, Box } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";

interface CalendarViewProps {
  items: DatabaseRow[];
  properties: DatabasePropertySchema[];
  onUpdateItem: (item: DatabaseRow) => void;
  onOpenItem: (itemId: string) => void;
}

export default function CalendarView({ items, properties, onOpenItem }: CalendarViewProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'));
  const nextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'));

  const startDay = currentMonth.startOf('month').day();
  const daysInMonth = currentMonth.daysInMonth();
  
  const days = [];
  // padding days before
  for (let i = 0; i < startDay; i++) {
    days.push({ date: currentMonth.subtract(startDay - i, 'day'), isCurrentMonth: false });
  }
  // current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: currentMonth.date(i), isCurrentMonth: true });
  }
  // padding days after
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: currentMonth.add(1, 'month').date(i), isCurrentMonth: false });
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getItemsForDate = (date: dayjs.Dayjs) => {
    return items.filter(item => {
      const dateVal = item.properties.date as { start?: string, end?: string } | string | null;
      if (!dateVal) return false;
      const startStr = typeof dateVal === 'object' && dateVal?.start ? dateVal.start : (typeof dateVal === 'string' ? dateVal : null);
      if (!startStr) return false;
      return dayjs(startStr).isSame(date, 'day');
    });
  };

  return (
    <div style={{ padding: "16px", background: "var(--mantine-color-body)" }}>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">{currentMonth.format("MMMM YYYY")}</Text>
        <Group gap="xs">
          <ActionIcon variant="default" onClick={prevMonth}><IconChevronLeft size={16} /></ActionIcon>
          <UnstyledButton onClick={() => setCurrentMonth(dayjs().startOf('month'))} style={{ fontSize: 13, fontWeight: 500, padding: "4px 8px" }}>
            {t("Today")}
          </UnstyledButton>
          <ActionIcon variant="default" onClick={nextMonth}><IconChevronRight size={16} /></ActionIcon>
        </Group>
      </Group>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderLeft: "1px solid var(--mantine-color-default-border)", borderTop: "1px solid var(--mantine-color-default-border)" }}>
        {WEEKDAYS.map(day => (
          <div key={day} style={{ padding: "8px", textAlign: "center", borderRight: "1px solid var(--mantine-color-default-border)", borderBottom: "1px solid var(--mantine-color-default-border)", fontSize: 12, fontWeight: 500, color: "var(--mantine-color-dimmed)" }}>
            {day}
          </div>
        ))}
        {days.map((dayObj, i) => {
          const dayItems = getItemsForDate(dayObj.date);
          const isToday = dayjs().isSame(dayObj.date, 'day');

          return (
            <div key={i} style={{ 
              minHeight: "100px", 
              padding: "4px", 
              borderRight: "1px solid var(--mantine-color-default-border)", 
              borderBottom: "1px solid var(--mantine-color-default-border)",
              backgroundColor: dayObj.isCurrentMonth ? "transparent" : "var(--mantine-color-gray-0)"
            }}>
              <div style={{ 
                display: "inline-block", 
                width: 24, height: 24, 
                lineHeight: "24px", 
                textAlign: "center", 
                borderRadius: "50%", 
                backgroundColor: isToday ? "var(--mantine-color-red-filled)" : "transparent",
                color: isToday ? "#fff" : (dayObj.isCurrentMonth ? "inherit" : "var(--mantine-color-dimmed)"),
                fontSize: 12,
                fontWeight: isToday ? 600 : 400,
                marginBottom: 4
              }}>
                {dayObj.date.date()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayItems.map(item => (
                  <UnstyledButton 
                    key={item.id} 
                    onClick={() => onOpenItem(item.id)}
                    style={{ 
                      fontSize: 11, 
                      padding: "2px 4px", 
                      borderRadius: 4, 
                      backgroundColor: "var(--mantine-color-blue-light)", 
                      color: "var(--mantine-color-blue-filled)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {item.properties.title || "Untitled"}
                  </UnstyledButton>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
