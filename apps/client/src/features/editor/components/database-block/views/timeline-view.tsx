import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { UnstyledButton, Text, Group } from "@mantine/core";
import dayjs from "dayjs";

interface TimelineViewProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

export default function TimelineView({ items, properties, onOpenItem }: TimelineViewProps) {
  const { t } = useTranslation();
  
  // Generate a timeline range: Today - 15 days to Today + 15 days
  const today = dayjs();
  const startDate = today.subtract(15, "day");
  const daysInTimeline = 31;
  const days = Array.from({ length: daysInTimeline }).map((_, i) => startDate.add(i, "day"));

  return (
    <div style={{ display: "flex", overflowX: "auto", position: "relative" }}>
      {/* Left Sidebar (Task Names) */}
      <div style={{ width: "250px", flexShrink: 0, borderRight: "1px solid var(--mantine-color-default-border)", background: "var(--mantine-color-body)", position: "sticky", left: 0, zIndex: 10 }}>
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-default-border)", height: "40px", display: "flex", alignItems: "center" }}>
          <Text size="sm" fw={500} c="dimmed">{t("Name")}</Text>
        </div>
        {items.map(item => (
          <div key={item.id} style={{ padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-default-border)", height: "48px", display: "flex", alignItems: "center" }}>
            <UnstyledButton onClick={() => onOpenItem(item.id)} fw={500} style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%" }}>
              {item.properties.title || "Untitled"}
            </UnstyledButton>
          </div>
        ))}
      </div>

      {/* Right Timeline Grid */}
      <div style={{ flexGrow: 1, minWidth: "max-content", position: "relative" }}>
        {/* Header (Dates) */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--mantine-color-default-border)", height: "40px", background: "var(--mantine-color-body)" }}>
          {days.map((day, i) => {
            const isToday = day.isSame(today, "day");
            return (
              <div key={i} style={{ width: "60px", flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", borderRight: "1px solid var(--mantine-color-default-border)" }}>
                <div style={{ 
                  width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center",
                  background: isToday ? "var(--mantine-color-red-filled)" : "transparent",
                  color: isToday ? "white" : "inherit",
                  fontSize: "12px", fontWeight: isToday ? 600 : 400
                }}>
                  {day.date()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rows (Timeline Tracks) */}
        {items.map(item => {
          const itemDate = item.properties.date ? dayjs(item.properties.date) : null;
          let offsetIndex = -1;
          
          if (itemDate && itemDate.isAfter(startDate) && itemDate.isBefore(startDate.add(daysInTimeline, "day"))) {
            offsetIndex = itemDate.diff(startDate, "day");
          }

          return (
            <div key={item.id} style={{ display: "flex", height: "48px", borderBottom: "1px solid var(--mantine-color-default-border)", position: "relative" }}>
              {/* Background grid lines */}
              {days.map((_, i) => (
                <div key={i} style={{ width: "60px", flexShrink: 0, borderRight: "1px solid var(--mantine-color-default-border)", height: "100%" }} />
              ))}
              
              {/* Timeline Card */}
              {offsetIndex >= 0 && (
                <div 
                  onClick={() => onOpenItem(item.id)}
                  style={{
                    position: "absolute",
                    left: `${offsetIndex * 60 + 4}px`, // +4px for padding
                    top: "6px",
                    width: "180px", // Span 3 days for aesthetic MVP
                    height: "36px",
                    background: "var(--mantine-color-dark-filled)",
                    color: "white",
                    borderRadius: "6px",
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    boxShadow: "var(--mantine-shadow-sm)",
                    zIndex: 5,
                    textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden"
                  }}
                >
                  <Text size="sm" fw={500} style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                    {item.properties.title || "Untitled"}
                  </Text>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
