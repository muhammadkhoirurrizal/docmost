import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { UnstyledButton, Text, ActionIcon } from "@mantine/core";
import dayjs from "dayjs";
import { useRef, useEffect } from "react";
import TimelineCard, { DAY_WIDTH, ROW_HEIGHT, ROW_GAP, TOP_PAD } from "./timeline-card";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface TimelineCanvasProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

export default function TimelineCanvas({ items, properties, onUpdateItem, onOpenItem }: TimelineCanvasProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const today = dayjs().startOf("day");
  const RANGE_START = today.subtract(14, "day");
  const RANGE_END = today.add(60, "day");
  const daysInTimeline = RANGE_END.diff(RANGE_START, "day") + 1;
  const days = Array.from({ length: daysInTimeline }).map((_, i) => RANGE_START.add(i, "day"));

  useEffect(() => {
    // Initial scroll to today
    if (scrollRef.current) {
      const todayIdx = today.diff(RANGE_START, "day");
      scrollRef.current.scrollTo({ left: Math.max(0, todayIdx * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH) });
    }
  }, []);

  const scrollToToday = () => {
    if (scrollRef.current) {
      const todayIdx = today.diff(RANGE_START, "day");
      scrollRef.current.scrollTo({ left: Math.max(0, todayIdx * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH), behavior: 'smooth' });
    }
  };

  const scrollPrev = () => {
    scrollRef.current?.scrollBy({ left: -DAY_WIDTH * 7, behavior: 'smooth' });
  };
  
  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: DAY_WIDTH * 7, behavior: 'smooth' });
  };

  const getStatusColor = (statusId: string) => {
    const statusProp = properties.find(p => p.type === "status");
    const option = statusProp?.options?.find(o => o.id === statusId);
    if (!option) return "#8a8a8a";
    return option.color || "#8a8a8a";
  };

  const handleUpdateDates = (itemId: string, newStart: dayjs.Dayjs, newEnd: dayjs.Dayjs) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const datePropId = properties.find(p => p.type === "date")?.id;
    if (!datePropId) return;

    onUpdateItem({
      ...item,
      properties: {
        ...item.properties,
        date: { start: newStart.toISOString(), end: newEnd.toISOString() }
      }
    });
  };

  // Assign rows compactly (simplified)
  let maxRow = items.length - 1; 

  const totalHeight = (maxRow + 1) * (ROW_HEIGHT + ROW_GAP) + TOP_PAD + 20;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {/* Notion-style Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 40px 12px", borderBottom: "1px solid var(--mantine-color-default-border)", background: "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>{today.format("MMMM YYYY")}</span>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "13px", color: "var(--mantine-color-dimmed)" }}>
          <UnstyledButton onClick={scrollToToday} style={{ padding: "5px 10px", borderRadius: "6px" }} className="hover-bg-gray">
            Today
          </UnstyledButton>
          <ActionIcon variant="subtle" onClick={scrollPrev} size="sm">
            <IconChevronLeft size={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" onClick={scrollNext} size="sm">
            <IconChevronRight size={14} />
          </ActionIcon>
        </div>
      </div>

      <div style={{ display: "flex", position: "relative", flexGrow: 1, overflow: "hidden" }}>
        {/* Timeline Grid Canvas */}
        <div ref={scrollRef} style={{ flexGrow: 1, overflowX: "auto", overflowY: "auto", paddingLeft: "40px", paddingRight: "40px", position: "relative" }}>
          <div style={{ minWidth: "max-content", paddingBottom: "20px" }}>
            
            {/* Header (Dates) */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--mantine-color-default-border)", position: "sticky", top: 0, zIndex: 20, background: "var(--mantine-color-body)" }}>
              {days.map((day, i) => {
                const isToday = day.isSame(today, "day");
                const isWeekend = day.day() === 0 || day.day() === 6;
                let monthLabel = null;
                if (day.date() === 1 || i === 0) {
                  monthLabel = <div style={{ position: "absolute", top: 0, left: "4px", fontSize: "11px", fontWeight: 500, color: "var(--mantine-color-dimmed)" }}>{day.format("MMMM")}</div>;
                }
                return (
                  <div key={i} style={{ width: `${DAY_WIDTH}px`, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: "8px", paddingTop: "12px", background: isWeekend ? "var(--mantine-color-dark-8)" : "transparent", position: "relative" }}>
                    {monthLabel}
                    <Text size="xs" c={isWeekend ? "dimmed" : "inherit"} style={{ fontSize: "10px", marginBottom: "4px", fontWeight: isWeekend ? 400 : 600 }}>{day.format("dd")}</Text>
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

            {/* Rows Container */}
            <div style={{ position: "relative", height: `${totalHeight}px`, width: `${days.length * DAY_WIDTH}px` }}>
              {/* Background grid lines (weekends) */}
              {days.map((day, i) => {
                const isWeekend = day.day() === 0 || day.day() === 6;
                if (!isWeekend) return null;
                return (
                  <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${i * DAY_WIDTH}px`, width: `${DAY_WIDTH}px`, background: "var(--mantine-color-dark-8)", zIndex: 0 }} />
                );
              })}

              {/* Today line */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, width: "1px", background: "var(--mantine-color-red-filled)",
                left: `${today.diff(RANGE_START, "day") * DAY_WIDTH + DAY_WIDTH/2}px`, zIndex: 4, pointerEvents: "none"
              }} />

              {/* Item Cards */}
              {items.map((item, index) => (
                <TimelineCard
                  key={item.id}
                  item={item}
                  startDate={RANGE_START}
                  rowIndex={index}
                  statusColor={getStatusColor(item.properties.status)}
                  onUpdateDates={handleUpdateDates}
                  onOpenItem={onOpenItem}
                />
              ))}
              

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
