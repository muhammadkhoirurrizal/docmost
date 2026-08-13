import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { UnstyledButton, Text, ActionIcon, Tooltip } from "@mantine/core";
import dayjs from "dayjs";
import { useRef, useEffect, useState } from "react";
import TimelineCard, { DAY_WIDTH, ROW_HEIGHT, ROW_GAP, TOP_PAD } from "./timeline-card";
import {
  IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconCalendar
} from "@tabler/icons-react";
import { parseDateProp } from "../date-prop-utils";

interface TimelineCanvasProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

// Two-row header: months row (60px) + days row (40px)
const MONTH_ROW_H = 22;
const DAY_ROW_H = 40;
const HEADER_H = MONTH_ROW_H + DAY_ROW_H;
const SIDEBAR_W = 200;

export default function TimelineCanvas({ items, properties, onUpdateItem, onOpenItem }: TimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  const today = dayjs().startOf("day");
  const RANGE_START = today.subtract(20, "day");
  const RANGE_END = today.add(70, "day");
  const daysInTimeline = RANGE_END.diff(RANGE_START, "day") + 1;
  const days = Array.from({ length: daysInTimeline }).map((_, i) => RANGE_START.add(i, "day"));

  useEffect(() => {
    if (scrollRef.current) {
      const todayIdx = today.diff(RANGE_START, "day");
      scrollRef.current.scrollTo({
        left: Math.max(0, todayIdx * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH),
      });
    }
  }, []);

  const scrollToToday = () => {
    if (scrollRef.current) {
      const todayIdx = today.diff(RANGE_START, "day");
      scrollRef.current.scrollTo({
        left: Math.max(0, todayIdx * DAY_WIDTH - scrollRef.current.clientWidth / 2 + DAY_WIDTH),
        behavior: "smooth",
      });
    }
  };

  const getStatusColor = (statusId: string): string => {
    const statusProp = properties.find(p => p.type === "status");
    const option = statusProp?.options?.find(o => o.id === statusId);
    return option?.color ? `var(--mantine-color-${option.color}-filled)` : "#8a8a8a";
  };

  const handleUpdateDates = (itemId: string, newStart: dayjs.Dayjs, newEnd: dayjs.Dayjs) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    onUpdateItem({
      ...item,
      properties: { ...item.properties, date: { start: newStart.toISOString(), end: newEnd.toISOString() } },
    });
  };

  const totalHeight = Math.max(items.length, 1) * (ROW_HEIGHT + ROW_GAP) + TOP_PAD + 20;
  const sidebarW = collapsed ? 0 : SIDEBAR_W;

  // Build month groups for the header row
  const monthGroups: { month: string; startIdx: number; count: number }[] = [];
  days.forEach((day, i) => {
    const monthKey = day.format("MMMM YYYY");
    const last = monthGroups[monthGroups.length - 1];
    if (!last || last.month !== monthKey) {
      monthGroups.push({ month: day.format("MMMM"), startIdx: i, count: 1 });
    } else {
      last.count++;
    }
  });

  const borderColor = "var(--mantine-color-default-border)";

  return (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Inner timeline body */}
      <div style={{ display: "flex", overflow: "hidden" }}>

        {/* ── Left Sidebar (Name column) ── */}
        {!collapsed && (
          <div style={{ width: SIDEBAR_W, flexShrink: 0, borderRight: `1px solid ${borderColor}`, background: "var(--mantine-color-body)", zIndex: 10, display: "flex", flexDirection: "column" }}>
            {/* Header cell */}
            <div style={{ height: HEADER_H, borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--mantine-color-dimmed)" }}>
                <span style={{ fontSize: 12 }}>Aₐ</span> Name
              </div>
              <Tooltip label="Collapse sidebar" position="right" withArrow>
                <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setCollapsed(true)}>
                  <IconChevronsLeft size={14} />
                </ActionIcon>
              </Tooltip>
            </div>
            {/* Item rows */}
            {items.map(item => (
              <div key={item.id} style={{ height: ROW_HEIGHT + ROW_GAP, borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
                <span style={{ opacity: 0.4, fontSize: 13 }}>📄</span>
                <UnstyledButton onClick={() => onOpenItem(item.id)} style={{ fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.properties.title || "Untitled"}
                </UnstyledButton>
              </div>
            ))}
            {/* + New row */}
            <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 12px", gap: 6, fontSize: 13, color: "var(--mantine-color-dimmed)", cursor: "pointer" }}>
              + New
            </div>
          </div>
        )}

        {/* Collapsed sidebar re-expand button */}
        {collapsed && (
          <div style={{ width: 28, flexShrink: 0, borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
            <Tooltip label="Expand sidebar" position="right" withArrow>
              <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setCollapsed(false)}>
                <IconChevronsRight size={14} />
              </ActionIcon>
            </Tooltip>
          </div>
        )}

        {/* ── Right Timeline Grid ── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>

          {/* Top-right control bar (Today / Month / Prev / Next / Manage in Calendar) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, padding: "4px 8px", borderBottom: `1px solid ${borderColor}`, height: MONTH_ROW_H, background: "var(--mantine-color-body)" }}>
            <UnstyledButton onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "2px 8px", borderRadius: 4 }}>
              <IconCalendar size={12} /> Manage in Calendar
            </UnstyledButton>
            <div style={{ width: 1, height: 12, background: borderColor, margin: "0 4px" }} />
            <UnstyledButton style={{ fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "2px 8px", borderRadius: 4 }}>Month</UnstyledButton>
            <ActionIcon variant="subtle" size="xs" c="dimmed" onClick={() => scrollRef.current?.scrollBy({ left: -DAY_WIDTH * 7, behavior: "smooth" })}>
              <IconChevronLeft size={12} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="xs" c="dimmed" onClick={() => scrollRef.current?.scrollBy({ left: DAY_WIDTH * 7, behavior: "smooth" })}>
              <IconChevronRight size={12} />
            </ActionIcon>
            <UnstyledButton onClick={scrollToToday} style={{ fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "2px 8px", borderRadius: 4 }}>
              Today
            </UnstyledButton>
          </div>

          {/* Scrollable canvas */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
            <div style={{ minWidth: `${days.length * DAY_WIDTH}px`, paddingBottom: 20 }}>

              {/* Day header row */}
              <div style={{ display: "flex", borderBottom: `1px solid ${borderColor}`, position: "sticky", top: 0, zIndex: 20, background: "var(--mantine-color-body)", height: DAY_ROW_H }}>
                {days.map((day, i) => {
                  const isToday = day.isSame(today, "day");
                  const isWeekend = day.day() === 0 || day.day() === 6;
                  return (
                    <div key={i} style={{ width: DAY_WIDTH, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: 6, background: isWeekend ? "rgba(0,0,0,0.06)" : "transparent" }}>
                      <Text size="xs" c="dimmed" style={{ fontSize: 10, marginBottom: 3 }}>{day.format("dd")}</Text>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center",
                        background: isToday ? "var(--mantine-color-red-filled)" : "transparent",
                        color: isToday ? "white" : "var(--mantine-color-text)",
                        fontSize: 11, fontWeight: isToday ? 700 : 400,
                      }}>
                        {day.date()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              <div style={{ position: "relative", height: totalHeight, width: `${days.length * DAY_WIDTH}px` }}>
                {/* Weekend stripes */}
                {days.map((day, i) =>
                  (day.day() === 0 || day.day() === 6) ? (
                    <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: i * DAY_WIDTH, width: DAY_WIDTH, background: "rgba(0,0,0,0.04)", zIndex: 0 }} />
                  ) : null
                )}

                {/* Today line */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0, width: 1, background: "var(--mantine-color-red-filled)",
                  left: today.diff(RANGE_START, "day") * DAY_WIDTH + DAY_WIDTH / 2, zIndex: 4, pointerEvents: "none",
                }} />

                {/* Cards */}
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
    </div>
  );
}
