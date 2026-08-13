import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { UnstyledButton, Text, ActionIcon, Tooltip, Menu } from "@mantine/core";
import dayjs from "dayjs";
import { useRef, useEffect, useState, useCallback } from "react";
import TimelineCard, { DAY_WIDTH, ROW_HEIGHT, ROW_GAP, TOP_PAD } from "./timeline-card";
import {
  IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight,
  IconCalendar, IconChevronDown
} from "@tabler/icons-react";

interface TimelineCanvasProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

// ─── Layout constants ───────────────────────────────────────────────
const MONTH_ROW_H = 26; // top month-name row height
const DAY_ROW_H   = 38; // day-number row height
const HEADER_H    = MONTH_ROW_H + DAY_ROW_H;
const SIDEBAR_W   = 200;

// Quasi-infinite range: 1 year back, 2 years forward
const today = dayjs().startOf("day");
const RANGE_START = today.subtract(365, "day");
const RANGE_END   = today.add(730, "day");
const TOTAL_DAYS  = RANGE_END.diff(RANGE_START, "day") + 1;

// Pre-compute day array once (stable reference — never mutated)
const ALL_DAYS = Array.from({ length: TOTAL_DAYS }, (_, i) => RANGE_START.add(i, "day"));

// Build month-group spans for the month-name header
interface MonthGroup { label: string; startIdx: number; dayCount: number }
function buildMonthGroups(days: typeof ALL_DAYS): MonthGroup[] {
  const groups: MonthGroup[] = [];
  days.forEach((day, i) => {
    const key = day.format("YYYY-MM");
    const last = groups[groups.length - 1];
    if (!last || last.label !== day.format("MMMM YYYY")) {
      groups.push({ label: day.format("MMMM YYYY"), startIdx: i, dayCount: 1 });
    } else {
      last.dayCount++;
    }
  });
  return groups;
}
const MONTH_GROUPS = buildMonthGroups(ALL_DAYS);

type ZoomMode = "Month" | "Week" | "Quarter";
const ZOOM_LABELS: ZoomMode[] = ["Week", "Month", "Quarter"];

// How many days to jump when clicking < or >
const JUMP_DAYS: Record<ZoomMode, number> = {
  Week: 7,
  Month: 30,
  Quarter: 90,
};

// ─── Component ──────────────────────────────────────────────────────
export default function TimelineCanvas({ items, properties, onUpdateItem, onOpenItem }: TimelineCanvasProps) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [zoom, setZoom]           = useState<ZoomMode>("Month");
  // Tracks which month label to show near the collapse/expand button
  const [visibleMonthLabel, setVisibleMonthLabel] = useState(today.format("MMMM YYYY"));

  // ─── Initial scroll to today ────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = today.diff(RANGE_START, "day");
    el.scrollLeft = Math.max(0, todayIdx * DAY_WIDTH - el.clientWidth / 2 + DAY_WIDTH);
  }, []);

  // ─── Track visible month label on scroll ────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft   = el.scrollLeft;
    const centerOffset = scrollLeft + el.clientWidth / 2;
    const dayIdx       = Math.floor(centerOffset / DAY_WIDTH);
    const clampedIdx   = Math.max(0, Math.min(dayIdx, TOTAL_DAYS - 1));
    setVisibleMonthLabel(ALL_DAYS[clampedIdx].format("MMMM YYYY"));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ─── Navigation helpers ─────────────────────────────────────────
  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = today.diff(RANGE_START, "day");
    el.scrollTo({ left: Math.max(0, todayIdx * DAY_WIDTH - el.clientWidth / 2 + DAY_WIDTH), behavior: "smooth" });
  };

  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -DAY_WIDTH * JUMP_DAYS[zoom], behavior: "smooth" });
  const scrollNext = () => scrollRef.current?.scrollBy({ left:  DAY_WIDTH * JUMP_DAYS[zoom], behavior: "smooth" });

  // ─── Item helpers ───────────────────────────────────────────────
  const getStatusColor = (statusId: string): string => {
    const statusProp = properties.find(p => p.type === "status");
    const option     = statusProp?.options?.find(o => o.id === statusId);
    return option?.color ? `var(--mantine-color-${option.color}-filled)` : "#8a8a8a";
  };

  const handleUpdateDates = (itemId: string, newStart: dayjs.Dayjs, newEnd: dayjs.Dayjs) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    onUpdateItem({ ...item, properties: { ...item.properties, date: { start: newStart.toISOString(), end: newEnd.toISOString() } } });
  };

  const totalHeight = Math.max(items.length, 1) * (ROW_HEIGHT + ROW_GAP) + TOP_PAD + 40;
  const border      = "1px solid var(--mantine-color-default-border)";
  const bg          = "var(--mantine-color-body)";

  return (
    <div style={{ display: "flex", overflow: "hidden" }}>

      {/* ══ LEFT SIDEBAR ══════════════════════════════════════════ */}
      {!collapsed ? (
        <div style={{ width: SIDEBAR_W, flexShrink: 0, borderRight: border, background: bg, zIndex: 10, display: "flex", flexDirection: "column" }}>

          {/* Sidebar header: month label + collapse button */}
          <div style={{ height: HEADER_H, borderBottom: border, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--mantine-color-dimmed)", lineHeight: 1 }}>
                {visibleMonthLabel.split(" ")[0]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mantine-color-text)", lineHeight: 1.3 }}>
                {visibleMonthLabel.split(" ")[1]}
              </div>
            </div>
            <Tooltip label="Collapse" position="right" withArrow>
              <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setCollapsed(true)}>
                <IconChevronsLeft size={14} />
              </ActionIcon>
            </Tooltip>
          </div>

          {/* Name column header */}
          <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 12, color: "var(--mantine-color-dimmed)", borderBottom: border, flexShrink: 0 }}>
            <span style={{ marginRight: 4, opacity: 0.5, fontSize: 11 }}>Aₐ</span> Name
          </div>

          {/* Item rows */}
          {items.map(item => (
            <div key={item.id} style={{ height: ROW_HEIGHT + ROW_GAP, borderBottom: border, display: "flex", alignItems: "center", padding: "0 10px", gap: 7, flexShrink: 0 }}>
              <span style={{ opacity: 0.35, fontSize: 12, flexShrink: 0 }}>📄</span>
              <UnstyledButton onClick={() => onOpenItem(item.id)} style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.properties.title || "Untitled"}
              </UnstyledButton>
            </div>
          ))}

          {/* + New */}
          <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 10px", gap: 6, fontSize: 13, color: "var(--mantine-color-dimmed)", cursor: "pointer" }}>
            + New
          </div>
        </div>
      ) : (
        /* Collapsed strip */
        <div style={{ width: 28, flexShrink: 0, borderRight: border, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
          <Tooltip label="Expand" position="right" withArrow>
            <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setCollapsed(false)}>
              <IconChevronsRight size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      )}

      {/* ══ RIGHT TIMELINE ════════════════════════════════════════ */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── Control bar ──────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", height: HEADER_H, borderBottom: border, background: bg, flexShrink: 0 }}>

          {/* Left: nothing (or filter pills in future) */}
          <div />

          {/* Right: Manage in Calendar | Zoom picker | < Today > */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Manage in Calendar */}
            <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "3px 8px", borderRadius: 4 }}>
              <IconCalendar size={12} /> Manage in Calendar
            </UnstyledButton>

            <div style={{ width: 1, height: 12, background: "var(--mantine-color-default-border)", margin: "0 4px" }} />

            {/* Zoom dropdown (Month / Week / Quarter) */}
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>
                  {zoom} <IconChevronDown size={11} />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {ZOOM_LABELS.map(z => (
                  <Menu.Item key={z} onClick={() => setZoom(z)} fw={zoom === z ? 600 : 400}>{z}</Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            {/* < Today > */}
            <ActionIcon variant="subtle" size="sm" c="dimmed" onClick={scrollPrev}>
              <IconChevronLeft size={13} />
            </ActionIcon>
            <UnstyledButton onClick={scrollToToday} style={{ fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "3px 10px", borderRadius: 4, fontWeight: 500 }}>
              Today
            </UnstyledButton>
            <ActionIcon variant="subtle" size="sm" c="dimmed" onClick={scrollNext}>
              <IconChevronRight size={13} />
            </ActionIcon>
          </div>
        </div>

        {/* ── Scrollable canvas ─────────────────────────────────── */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
          <div style={{ width: `${TOTAL_DAYS * DAY_WIDTH}px`, paddingBottom: 20, position: "relative" }}>

            {/* Month-name row (sticky) */}
            <div style={{ display: "flex", height: MONTH_ROW_H, position: "sticky", top: 0, zIndex: 21, background: bg }}>
              {MONTH_GROUPS.map((mg, gi) => (
                <div key={gi} style={{
                  width: mg.dayCount * DAY_WIDTH,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--mantine-color-dimmed)",
                  borderRight: "1px solid var(--mantine-color-default-border)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}>
                  {mg.label}
                </div>
              ))}
            </div>

            {/* Day-number row (sticky below month row) */}
            <div style={{ display: "flex", height: DAY_ROW_H, position: "sticky", top: MONTH_ROW_H, zIndex: 20, background: bg, borderBottom: border }}>
              {ALL_DAYS.map((day, i) => {
                const isToday   = day.isSame(today, "day");
                const isWeekend = day.day() === 0 || day.day() === 6;
                return (
                  <div key={i} style={{ width: DAY_WIDTH, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: 5, background: isWeekend ? "rgba(0,0,0,0.05)" : "transparent" }}>
                    <span style={{ fontSize: 9, color: "var(--mantine-color-dimmed)", marginBottom: 2, fontWeight: 400 }}>{day.format("dd")}</span>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      display: "flex", justifyContent: "center", alignItems: "center",
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

            {/* ── Card rows ─────────────────────────────────────── */}
            <div style={{ position: "relative", height: totalHeight, width: `${TOTAL_DAYS * DAY_WIDTH}px` }}>

              {/* Weekend column stripes */}
              {ALL_DAYS.map((day, i) =>
                (day.day() === 0 || day.day() === 6) ? (
                  <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: i * DAY_WIDTH, width: DAY_WIDTH, background: "rgba(0,0,0,0.035)", zIndex: 0 }} />
                ) : null
              )}

              {/* Month boundary lines */}
              {ALL_DAYS.map((day, i) =>
                day.date() === 1 ? (
                  <div key={`m-${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: i * DAY_WIDTH, width: 1, background: "rgba(255,255,255,0.07)", zIndex: 1 }} />
                ) : null
              )}

              {/* Today line */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, width: 1,
                background: "var(--mantine-color-red-filled)",
                left: today.diff(RANGE_START, "day") * DAY_WIDTH + DAY_WIDTH / 2,
                zIndex: 4, pointerEvents: "none",
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
  );
}
