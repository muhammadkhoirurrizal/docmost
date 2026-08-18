import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { UnstyledButton, ActionIcon, Tooltip, Menu, Select } from "@mantine/core";
import dayjs from "dayjs";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import TimelineCard, { ROW_HEIGHT, ROW_GAP, TOP_PAD } from "./timeline-card";
import {
  IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight,
  IconCalendar, IconChevronDown
} from "@tabler/icons-react";
import { TimeScale, generateTimelineColumns, getScaleWidth, getJumpDistance } from "./timeline-scale-utils";

interface TimelineCanvasProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

const TIER1_H = 26;
const TIER2_H = 38;
const HEADER_H = TIER1_H + TIER2_H;
const SIDEBAR_W = 200;
const border = "1px solid var(--mantine-color-default-border)";
const bg = "var(--mantine-color-body)";

export default function TimelineCanvas({ items, properties, onUpdateItem, onOpenItem }: TimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [scale, setScale] = useState<TimeScale>("Days");

  // Re-generate timeline grid whenever scale changes
  const { columns, rangeStart } = useMemo(() => generateTimelineColumns(scale, dayjs()), [scale]);
  const columnWidth = getScaleWidth(scale);
  const totalWidth = columns.length * columnWidth;

  const [visibleMonthLabel, setVisibleMonthLabel] = useState(dayjs().format("MMMM YYYY"));

  // Initial scroll to center
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Find today column index
    const todayIdx = columns.findIndex(c => c.isToday);
    if (todayIdx > -1) {
      el.scrollLeft = Math.max(0, todayIdx * columnWidth - el.clientWidth / 2 + columnWidth);
    }
  }, [scale, columns, columnWidth]);

  // Track visible header in sidebar
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const centerOffset = el.scrollLeft + el.clientWidth / 2;
    const colIdx = Math.floor(centerOffset / columnWidth);
    const clampedCol = columns[Math.max(0, Math.min(colIdx, columns.length - 1))];
    if (clampedCol) setVisibleMonthLabel(clampedCol.date.format("MMMM YYYY"));
  }, [columns, columnWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = columns.findIndex(c => c.isToday);
    if (todayIdx > -1) {
      el.scrollTo({ left: Math.max(0, todayIdx * columnWidth - el.clientWidth / 2 + columnWidth), behavior: "smooth" });
    }
  };

  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -columnWidth * getJumpDistance(scale), behavior: "smooth" });
  const scrollNext = () => scrollRef.current?.scrollBy({ left: columnWidth * getJumpDistance(scale), behavior: "smooth" });

  const getStatusColor = (statusId: string): string => {
    const statusProp = properties.find(p => p.type === "status");
    const option = statusProp?.options?.find(o => o.id === statusId);
    return option?.color ? `var(--mantine-color-${option.color}-filled)` : "#8a8a8a";
  };

  const totalHeight = Math.max(items.length, 1) * (ROW_HEIGHT + ROW_GAP) + TOP_PAD + 40;

  // Group columns by tier1 label to render wide header spans
  const tier1Groups: { label: string, span: number }[] = [];
  columns.forEach(col => {
    if (col.tier1Label !== "") {
      tier1Groups.push({ label: col.tier1Label, span: 1 });
    } else if (tier1Groups.length > 0) {
      tier1Groups[tier1Groups.length - 1].span++;
    }
  });

  return (
    <div style={{ display: "flex", overflow: "hidden" }}>
      {/* ══ LEFT SIDEBAR ══ */}
      {!collapsed ? (
        <div style={{ width: SIDEBAR_W, flexShrink: 0, borderRight: border, background: bg, zIndex: 10, display: "flex", flexDirection: "column" }}>
          <div style={{ height: HEADER_H, borderBottom: border, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--mantine-color-dimmed)", lineHeight: 1 }}>{visibleMonthLabel.split(" ")[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mantine-color-text)", lineHeight: 1.3 }}>{visibleMonthLabel.split(" ")[1]}</div>
            </div>
            <Tooltip label="Collapse" position="right" withArrow>
              <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setCollapsed(true)}>
                <IconChevronsLeft size={14} />
              </ActionIcon>
            </Tooltip>
          </div>
          <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 12, color: "var(--mantine-color-dimmed)", borderBottom: border, flexShrink: 0 }}>
            <span style={{ marginRight: 4, opacity: 0.5, fontSize: 11 }}>Aₐ</span> Name
          </div>
          {items.map(item => (
            <div key={item.id} style={{ height: ROW_HEIGHT + ROW_GAP, borderBottom: border, display: "flex", alignItems: "center", padding: "0 10px", gap: 7, flexShrink: 0 }}>
              <span style={{ opacity: 0.35, fontSize: 12, flexShrink: 0 }}>📄</span>
              <UnstyledButton onClick={() => onOpenItem(item.id)} style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.properties.title || "Untitled"}
              </UnstyledButton>
            </div>
          ))}
          <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 10px", gap: 6, fontSize: 13, color: "var(--mantine-color-dimmed)", cursor: "pointer" }}>+ New</div>
        </div>
      ) : (
        <div style={{ width: 28, flexShrink: 0, borderRight: border, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
          <Tooltip label="Expand" position="right" withArrow>
            <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setCollapsed(false)}>
              <IconChevronsRight size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      )}

      {/* ══ RIGHT TIMELINE ══ */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* ── Control bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", height: HEADER_H, borderBottom: border, background: bg, flexShrink: 0 }}>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "3px 8px", borderRadius: 4 }}>
              <IconCalendar size={12} /> Manage in Calendar
            </UnstyledButton>
            <div style={{ width: 1, height: 12, background: "var(--mantine-color-default-border)", margin: "0 4px" }} />
            
            {/* Scale Selector */}
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <UnstyledButton style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>
                  {scale} <IconChevronDown size={11} />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {(["Hours", "Days", "Weeks", "Months", "Quarters", "Years"] as TimeScale[]).map(s => (
                  <Menu.Item key={s} onClick={() => setScale(s)} fw={scale === s ? 600 : 400}>{s}</Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            {/* < Today > */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: border, borderRadius: 6, marginLeft: 4 }}>
              <ActionIcon variant="subtle" size="sm" c="dimmed" onClick={scrollPrev} style={{ borderRadius: "6px 0 0 6px" }}>
                <IconChevronLeft size={13} />
              </ActionIcon>
              <div style={{ width: 1, height: 14, background: "var(--mantine-color-default-border)" }} />
              <UnstyledButton onClick={scrollToToday} style={{ fontSize: 12, color: "var(--mantine-color-dimmed)", padding: "3px 10px", fontWeight: 500 }}>
                Today
              </UnstyledButton>
              <div style={{ width: 1, height: 14, background: "var(--mantine-color-default-border)" }} />
              <ActionIcon variant="subtle" size="sm" c="dimmed" onClick={scrollNext} style={{ borderRadius: "0 6px 6px 0" }}>
                <IconChevronRight size={13} />
              </ActionIcon>
            </div>
          </div>
        </div>

        {/* ── Scrollable grid ── */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
          <div style={{ width: totalWidth, paddingBottom: 20, position: "relative" }}>
            
            {/* Tier 1 Row (Sticky) */}
            <div style={{ display: "flex", height: TIER1_H, position: "sticky", top: 0, zIndex: 21, background: bg }}>
              {tier1Groups.map((group, gi) => (
                <div key={gi} style={{
                  width: group.span * columnWidth,
                  flexShrink: 0, display: "flex", alignItems: "center", paddingLeft: 6,
                  fontSize: 11, fontWeight: 500, color: "var(--mantine-color-dimmed)",
                  borderRight: border, overflow: "hidden", whiteSpace: "nowrap"
                }}>
                  {group.label}
                </div>
              ))}
            </div>

            {/* Tier 2 Row (Sticky) */}
            <div style={{ display: "flex", height: TIER2_H, position: "sticky", top: TIER1_H, zIndex: 20, background: bg, borderBottom: border }}>
              {columns.map((col, i) => (
                <div key={i} style={{
                  width: columnWidth, flexShrink: 0, display: "flex", flexDirection: "column",
                  justifyContent: "flex-end", alignItems: scale === "Hours" ? "flex-start" : "center",
                  paddingBottom: 5, paddingLeft: scale === "Hours" ? 6 : 0,
                  background: col.isWeekend && scale !== "Months" && scale !== "Years" && scale !== "Quarters" ? "rgba(0,0,0,0.05)" : "transparent"
                }}>
                  {scale === "Hours" ? (
                    <span style={{ fontSize: 11, fontWeight: col.isToday ? 700 : 400, color: col.isToday ? "var(--mantine-color-red-filled)" : "var(--mantine-color-dimmed)" }}>
                      {col.tier2Label}
                    </span>
                  ) : (
                    <>
                      {scale === "Days" && <span style={{ fontSize: 9, color: "var(--mantine-color-dimmed)", marginBottom: 2 }}>{col.date.format("dd")}</span>}
                      <div style={{
                        width: scale === "Days" ? 22 : "auto", height: scale === "Days" ? 22 : "auto", padding: scale !== "Days" ? "0 4px" : 0,
                        borderRadius: scale === "Days" ? "50%" : 4,
                        display: "flex", justifyContent: "center", alignItems: "center",
                        background: col.isToday ? "var(--mantine-color-red-filled)" : "transparent",
                        color: col.isToday ? "white" : "var(--mantine-color-text)",
                        fontSize: 11, fontWeight: col.isToday ? 700 : 400,
                      }}>
                        {col.tier2Label}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* ── Rows ── */}
            <div style={{ position: "relative", height: totalHeight, width: totalWidth }}>
              {columns.map((col, i) => col.isWeekend && scale !== "Months" && scale !== "Years" && scale !== "Quarters" ? (
                <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: i * columnWidth, width: columnWidth, background: "rgba(0,0,0,0.035)", zIndex: 0 }} />
              ) : null)}

              {columns.map((col, i) => col.tier1Label !== "" ? (
                <div key={`m-${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: i * columnWidth, width: 1, background: "var(--mantine-color-default-border)", zIndex: 1, opacity: 0.5 }} />
              ) : null)}

              {/* Today line */}
              {columns.findIndex(c => c.isToday) > -1 && (
                <div style={{
                  position: "absolute", top: 0, bottom: 0, width: 1, background: "var(--mantine-color-red-filled)",
                  left: columns.findIndex(c => c.isToday) * columnWidth + columnWidth / 2,
                  zIndex: 4, pointerEvents: "none",
                }} />
              )}

              {items.map((item, index) => (
                <TimelineCard
                  key={item.id} item={item} startDate={rangeStart} rowIndex={index}
                  statusColor={getStatusColor(item.properties.status)}
                  columnWidth={columnWidth} unit={
                    scale === "Hours" ? "hour" :
                    scale === "Weeks" ? "week" :
                    scale === "Months" ? "month" :
                    scale === "Quarters" ? "quarter" :
                    scale === "Years" ? "year" : "day"
                  }
                  onUpdateDates={(itemId, start, end) => onUpdateItem({ ...item, properties: { ...item.properties, date: { start: start.toISOString(), end: end.toISOString() } } })}
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
