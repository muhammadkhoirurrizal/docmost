import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { UnstyledButton, Text, ActionIcon } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState, useRef, useEffect } from "react";

interface TimelineViewProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

const DAY_WIDTH = 60;
const ROW_HEIGHT = 44;

export default function TimelineView({ items, properties, onUpdateItem, onOpenItem }: TimelineViewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const today = dayjs().startOf("day");
  const [baseDate, setBaseDate] = useState(today);

  // Generate a timeline range: baseDate - 14 days to baseDate + 30 days
  const startDate = baseDate.subtract(14, "day");
  const daysInTimeline = 45;
  const days = Array.from({ length: daysInTimeline }).map((_, i) => startDate.add(i, "day"));

  useEffect(() => {
    // Scroll to today on mount
    if (scrollRef.current) {
      const todayIdx = today.diff(startDate, "day");
      scrollRef.current.scrollTo({ left: Math.max(0, todayIdx * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH) });
    }
  }, []);

  const scrollToToday = () => {
    setBaseDate(today);
    setTimeout(() => {
      if (scrollRef.current) {
        const todayIdx = today.diff(today.subtract(14, "day"), "day");
        scrollRef.current.scrollTo({ left: Math.max(0, todayIdx * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH), behavior: 'smooth' });
      }
    }, 50);
  };

  const getStatusColor = (statusId: string) => {
    const statusProp = properties.find(p => p.type === "status");
    const option = statusProp?.options?.find(o => o.id === statusId);
    if (!option) return "gray";
    return option.color; // e.g. "blue", "green"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-md)", overflow: "hidden" }}>
      
      {/* Timeline Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-default-border)", background: "var(--mantine-color-body)" }}>
        <Text size="sm" fw={600}>{baseDate.format("MMMM YYYY")}</Text>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <UnstyledButton onClick={scrollToToday} style={{ fontSize: "13px", padding: "4px 12px", borderRadius: "6px", color: "var(--mantine-color-text)", fontWeight: 500 }}>
            {t("Today")}
          </UnstyledButton>
          <ActionIcon variant="subtle" onClick={() => setBaseDate(d => d.subtract(1, "month"))}>
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" onClick={() => setBaseDate(d => d.add(1, "month"))}>
            <IconChevronRight size={16} />
          </ActionIcon>
        </div>
      </div>

      <div style={{ display: "flex", position: "relative" }}>
        {/* Left Sidebar (Task Names) */}
        <div style={{ width: "220px", flexShrink: 0, borderRight: "1px solid var(--mantine-color-default-border)", background: "var(--mantine-color-body)", zIndex: 10 }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-default-border)", height: "48px", display: "flex", alignItems: "center" }}>
            <Text size="sm" fw={500} c="dimmed">{t("Name")}</Text>
          </div>
          {items.map(item => (
            <div key={item.id} style={{ padding: "0 16px", borderBottom: "1px solid var(--mantine-color-default-border)", height: `${ROW_HEIGHT}px`, display: "flex", alignItems: "center" }}>
              <UnstyledButton onClick={() => onOpenItem(item.id)} fw={500} style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%", fontSize: "14px" }}>
                {item.properties.title || "Untitled"}
              </UnstyledButton>
            </div>
          ))}
          <div style={{ padding: "8px 16px", height: "44px", display: "flex", alignItems: "center" }}>
            <Text size="sm" c="dimmed" style={{ cursor: "pointer" }} onClick={() => {/* parent handles new item */}}>+ New</Text>
          </div>
        </div>

        {/* Right Timeline Grid */}
        <div ref={scrollRef} style={{ flexGrow: 1, overflowX: "auto", position: "relative", background: "var(--mantine-color-body)" }}>
          <div style={{ minWidth: "max-content" }}>
            
            {/* Header (Dates) */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--mantine-color-default-border)", height: "48px", position: "sticky", top: 0, zIndex: 20, background: "var(--mantine-color-body)" }}>
              {days.map((day, i) => {
                const isToday = day.isSame(today, "day");
                const isWeekend = day.day() === 0 || day.day() === 6;
                return (
                  <div key={i} style={{ width: `${DAY_WIDTH}px`, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: "4px", background: isWeekend ? "var(--mantine-color-gray-light)" : "transparent", borderRight: "1px solid var(--mantine-color-default-border)" }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: "10px", marginBottom: "2px" }}>{day.format("dd")}</Text>
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
            <div style={{ position: "relative" }}>
              {/* Background grid lines (weekends) */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", pointerEvents: "none" }}>
                {days.map((day, i) => {
                  const isWeekend = day.day() === 0 || day.day() === 6;
                  return (
                    <div key={i} style={{ width: `${DAY_WIDTH}px`, flexShrink: 0, borderRight: "1px solid var(--mantine-color-default-border)", background: isWeekend ? "var(--mantine-color-dark-light)" : "transparent", opacity: 0.3 }} />
                  );
                })}
              </div>

              {/* Today line */}
              {today.isAfter(startDate) && today.isBefore(startDate.add(daysInTimeline, "day")) && (
                <div style={{
                  position: "absolute", top: 0, bottom: 0, width: "2px", background: "var(--mantine-color-red-filled)",
                  left: `${today.diff(startDate, "day") * DAY_WIDTH + DAY_WIDTH/2}px`, zIndex: 1
                }} />
              )}

              {/* Item Rows */}
              {items.map(item => {
                const dateProp = item.properties.date;
                let startD = dateProp?.start ? dayjs(dateProp.start).startOf("day") : null;
                if (!startD && typeof dateProp === "string") startD = dayjs(dateProp).startOf("day"); // Fallback for old schema
                let endD = dateProp?.end ? dayjs(dateProp.end).startOf("day") : startD; // Default to 1 day

                let left = 0;
                let width = 0;
                let isVisible = false;

                if (startD && endD) {
                  const startIdx = startD.diff(startDate, "day");
                  const endIdx = endD.diff(startDate, "day");
                  
                  // if any part of the item is in the timeline
                  if (endIdx >= 0 && startIdx < daysInTimeline) {
                    isVisible = true;
                    left = startIdx * DAY_WIDTH + 4;
                    width = (endIdx - startIdx + 1) * DAY_WIDTH - 8;
                  }
                }

                const statusColor = getStatusColor(item.properties.status);

                return (
                  <div key={item.id} style={{ height: `${ROW_HEIGHT}px`, borderBottom: "1px solid var(--mantine-color-default-border)", position: "relative" }}>
                    {/* Timeline Card */}
                    {isVisible && (
                      <div 
                        onClick={() => onOpenItem(item.id)}
                        style={{
                          position: "absolute",
                          left: `${left}px`,
                          top: "6px",
                          width: `${Math.max(width, 24)}px`,
                          height: "32px",
                          background: "var(--mantine-color-dark-filled)",
                          color: "white",
                          borderRadius: "4px",
                          padding: "0 10px",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          boxShadow: "var(--mantine-shadow-xs)",
                          zIndex: 5,
                        }}
                      >
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: `var(--mantine-color-${statusColor}-filled)`, marginRight: "6px", flexShrink: 0 }} />
                        <Text size="sm" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", fontSize: "13px" }}>
                          {item.properties.title || "Untitled"}
                        </Text>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Padding row for New Item area */}
              <div style={{ height: "44px" }} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
