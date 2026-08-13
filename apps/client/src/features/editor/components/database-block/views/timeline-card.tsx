import { useState, useEffect, useRef } from "react";
import { DatabaseItem } from "@docmost/editor-ext";
import dayjs from "dayjs";

export const DAY_WIDTH = 60;
export const ROW_HEIGHT = 44;
export const ROW_GAP = 8;
export const TOP_PAD = 10;

interface TimelineCardProps {
  item: DatabaseItem;
  startDate: dayjs.Dayjs;
  rowIndex: number;
  statusColor: string;
  onUpdateDates: (itemId: string, newStart: dayjs.Dayjs, newEnd: dayjs.Dayjs) => void;
  onOpenItem: (itemId: string) => void;
}

export default function TimelineCard({ item, startDate, rowIndex, statusColor, onUpdateDates, onOpenItem }: TimelineCardProps) {
  const dateProp = item.properties.date as { start?: string, end?: string } | string | null;
  const startStr = typeof dateProp === 'object' && dateProp?.start ? dateProp.start : (typeof dateProp === 'string' ? dateProp : null);
  const endStr = typeof dateProp === 'object' && dateProp?.end ? dateProp.end : startStr;

  const itemStart = startStr ? dayjs(startStr).startOf("day") : dayjs().startOf("day");
  const itemEnd = endStr ? dayjs(endStr).startOf("day") : itemStart;

  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize-left' | 'resize-right' | null;
    startX: number;
    originStart: dayjs.Dayjs;
    originEnd: dayjs.Dayjs;
    moved: boolean;
    currentStart: dayjs.Dayjs;
    currentEnd: dayjs.Dayjs;
  } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = e.clientX - dragState.startX;
      const deltaDays = Math.round(dx / DAY_WIDTH);
      let newStart = dragState.originStart;
      let newEnd = dragState.originEnd;

      if (dragState.mode === 'move') {
        newStart = dragState.originStart.add(deltaDays, "day");
        newEnd = dragState.originEnd.add(deltaDays, "day");
      } else if (dragState.mode === 'resize-left') {
        newStart = dragState.originStart.add(deltaDays, "day");
        if (newStart.isAfter(newEnd)) newStart = newEnd;
      } else if (dragState.mode === 'resize-right') {
        newEnd = dragState.originEnd.add(deltaDays, "day");
        if (newEnd.isBefore(newStart)) newEnd = newStart;
      }

      setDragState(prev => prev ? {
        ...prev,
        moved: prev.moved || Math.abs(dx) > 3,
        currentStart: newStart,
        currentEnd: newEnd
      } : null);
    };

    const handleMouseUp = () => {
      if (dragState.moved && (dragState.currentStart.valueOf() !== dragState.originStart.valueOf() || dragState.currentEnd.valueOf() !== dragState.originEnd.valueOf())) {
        onUpdateDates(item.id, dragState.currentStart, dragState.currentEnd);
      } else if (!dragState.moved && dragState.mode === 'move') {
        onOpenItem(item.id);
      }
      setDragState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, item.id, onUpdateDates, onOpenItem]);

  const onDown = (e: React.MouseEvent, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      mode,
      startX: e.clientX,
      originStart: itemStart,
      originEnd: itemEnd,
      moved: false,
      currentStart: itemStart,
      currentEnd: itemEnd
    });
  };

  const currentStart = dragState ? dragState.currentStart : itemStart;
  const currentEnd = dragState ? dragState.currentEnd : itemEnd;

  const startIdx = currentStart.diff(startDate, "day");
  const endIdx = currentEnd.diff(startDate, "day");
  
  const left = startIdx * DAY_WIDTH + 2;
  const width = (endIdx - startIdx + 1) * DAY_WIDTH - 4;
  const top = TOP_PAD + rowIndex * (ROW_HEIGHT + ROW_GAP);

  // Colors
  const bgColor = dragState ? "var(--mantine-color-dark-4)" : "var(--mantine-color-dark-6)";
  const shadow = dragState ? "0 8px 20px rgba(0,0,0,0.5)" : "0 1px 2px rgba(0,0,0,0.3)";

  return (
    <div
      ref={cardRef}
      onMouseDown={(e) => onDown(e, 'move')}
      style={{
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(width, 20)}px`,
        height: `${ROW_HEIGHT}px`,
        background: bgColor,
        borderRadius: "4px",
        border: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        fontSize: "13px",
        color: "white", // Force white for Notion dark-theme clone card
        cursor: dragState ? "grabbing" : "grab",
        userSelect: "none",
        boxShadow: shadow,
        transition: dragState ? "none" : "background .12s ease, box-shadow .12s ease",
        zIndex: dragState ? 30 : 2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}
    >
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, marginRight: "8px", flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.properties.title || "Untitled"}</span>

      {/* Handles */}
      <div 
        onMouseDown={(e) => onDown(e, 'resize-left')}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "8px", cursor: "ew-resize", zIndex: 5 }} 
        title="Resize Left"
      />
      <div 
        onMouseDown={(e) => onDown(e, 'resize-right')}
        style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "8px", cursor: "ew-resize", zIndex: 5 }} 
        title="Resize Right"
      />
    </div>
  );
}
