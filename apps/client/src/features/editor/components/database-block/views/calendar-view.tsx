import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { Text, UnstyledButton, Group, ActionIcon } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";

interface CalendarViewProps {
  items: DatabaseRow[];
  properties: DatabasePropertySchema[];
  onUpdateItem: (item: DatabaseRow) => void;
  onOpenItem: (itemId: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Find which property holds the date for a row
const getDateStart = (item: DatabaseRow, schema: DatabasePropertySchema[]): string | null => {
  const dateProp = schema.find(p => p.type === "date");
  if (!dateProp) return null;
  const val = item.properties[dateProp.id];
  if (!val) return null;
  return typeof val === "object" ? val.start ?? null : val;
};

const getDatePropId = (schema: DatabasePropertySchema[]): string | null => {
  return schema.find(p => p.type === "date")?.id ?? null;
};

export default function CalendarView({ items, properties, onUpdateItem, onOpenItem }: CalendarViewProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"));
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const datePropId = getDatePropId(properties);

  const prevMonth = () => setCurrentMonth(m => m.subtract(1, "month"));
  const nextMonth = () => setCurrentMonth(m => m.add(1, "month"));

  const startDay = currentMonth.day(); // 0=Sun
  const daysInMonth = currentMonth.daysInMonth();

  const days: { date: dayjs.Dayjs; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push({ date: currentMonth.subtract(startDay - i, "day"), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: currentMonth.date(d), isCurrentMonth: true });
  }
  const trailing = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    days.push({ date: currentMonth.add(1, "month").date(i), isCurrentMonth: false });
  }

  const getItemsForDate = (date: dayjs.Dayjs) => {
    return items.filter(item => {
      const start = getDateStart(item, properties);
      if (!start) return false;
      return dayjs(start).isSame(date, "day");
    });
  };

  const handleDrop = (e: React.DragEvent, date: dayjs.Dayjs) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!dragItemId || !datePropId) return;

    const item = items.find(i => i.id === dragItemId);
    if (!item) return;

    const oldVal = item.properties[datePropId];
    const oldEnd = typeof oldVal === "object" ? oldVal?.end : null;
    const newStart = date.startOf("day").toISOString();

    onUpdateItem({
      ...item,
      properties: {
        ...item.properties,
        [datePropId]: { start: newStart, end: oldEnd ?? newStart },
      },
    });
    setDragItemId(null);
  };

  return (
    <div style={{ padding: 16, background: "var(--mantine-color-body)" }}>
      {/* Month navigation */}
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">{currentMonth.format("MMMM YYYY")}</Text>
        <Group gap="xs">
          <ActionIcon variant="default" onClick={prevMonth}><IconChevronLeft size={16} /></ActionIcon>
          <UnstyledButton
            onClick={() => setCurrentMonth(dayjs().startOf("month"))}
            style={{ fontSize: 13, fontWeight: 500, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--mantine-color-default-border)" }}
          >
            {t("Today")}
          </UnstyledButton>
          <ActionIcon variant="default" onClick={nextMonth}><IconChevronRight size={16} /></ActionIcon>
        </Group>
      </Group>

      {/* Calendar grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        {/* Weekday headers */}
        {WEEKDAYS.map(day => (
          <div
            key={day}
            style={{
              padding: "6px 8px",
              textAlign: "center",
              borderRight: "1px solid var(--mantine-color-default-border)",
              borderBottom: "1px solid var(--mantine-color-default-border)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--mantine-color-dimmed)",
              background: "var(--mantine-color-default-hover)",
            }}
          >
            {day}
          </div>
        ))}

        {/* Day cells */}
        {days.map((dayObj, i) => {
          const dayItems = getItemsForDate(dayObj.date);
          const isToday = dayjs().isSame(dayObj.date, "day");
          const dateStr = dayObj.date.format("YYYY-MM-DD");
          const isDragOver = dragOverDate === dateStr;

          return (
            <div
              key={i}
              style={{
                minHeight: 100,
                padding: "4px 6px",
                borderRight: "1px solid var(--mantine-color-default-border)",
                borderBottom: "1px solid var(--mantine-color-default-border)",
                background: isDragOver
                  ? "var(--mantine-color-blue-light)"
                  : dayObj.isCurrentMonth
                    ? "var(--mantine-color-body)"
                    : "var(--mantine-color-default-hover)",
                transition: "background 0.15s",
              }}
              onDragOver={e => { e.preventDefault(); setDragOverDate(dateStr); }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={e => handleDrop(e, dayObj.date)}
            >
              {/* Day number */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24, height: 24,
                borderRadius: "50%",
                marginBottom: 4,
                background: isToday ? "var(--mantine-color-red-filled)" : "transparent",
                color: isToday ? "#fff" : dayObj.isCurrentMonth ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
              }}>
                {dayObj.date.date()}
              </div>

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragItemId(item.id)}
                    onDragEnd={() => setDragItemId(null)}
                    onClick={() => onOpenItem(item.id)}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--mantine-color-blue-light)",
                      color: "var(--mantine-color-blue-filled)",
                      cursor: "grab",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: 500,
                    }}
                  >
                    {item.properties.title || "Untitled"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!datePropId && (
        <Text size="xs" c="dimmed" mt="md" ta="center">
          {t("Add a Date property to your database to see items on the calendar.")}
        </Text>
      )}
    </div>
  );
}
