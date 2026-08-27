import { DatabaseRow, DatabasePropertySchema } from "@docmost/editor-ext";
import dayjs from "dayjs";

// Types local (tidak perlu export dari editor-ext)
interface FilterRule {
  propId: string;
  op: "is" | "isNot" | "contains" | "isEmpty" | "isNotEmpty";
  value: any;
}

interface SortRule {
  propId: string;
  dir: "asc" | "desc";
}

export function applyFilters(rows: DatabaseRow[], rules: FilterRule[], schema: DatabasePropertySchema[]): DatabaseRow[] {
  if (!rules || rules.length === 0) return rows;

  return rows.filter(row => {
    return rules.every(rule => {
      const propMeta = schema.find(p => p.id === rule.propId);
      if (!propMeta) return true;
      const propValue = row.properties[rule.propId];

      switch (rule.op) {
        case "is":
          if (propMeta.type === "date" && typeof propValue === "object") {
            return propValue?.start === rule.value;
          }
          return propValue === rule.value;
        case "isNot":
          if (propMeta.type === "date" && typeof propValue === "object") {
            return propValue?.start !== rule.value;
          }
          return propValue !== rule.value;
        case "contains":
          return typeof propValue === "string" && typeof rule.value === "string"
            ? propValue.toLowerCase().includes(rule.value.toLowerCase())
            : false;
        case "isEmpty":
          return propValue === null || propValue === undefined || propValue === "";
        case "isNotEmpty":
          return propValue !== null && propValue !== undefined && propValue !== "";
        default:
          return true;
      }
    });
  });
}

export function applySorts(rows: DatabaseRow[], rules: SortRule[], schema: DatabasePropertySchema[]): DatabaseRow[] {
  if (!rules || rules.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const rule of rules) {
      const propMeta = schema.find(p => p.id === rule.propId);
      if (!propMeta) continue;

      const valA = a.properties[rule.propId];
      const valB = b.properties[rule.propId];
      const dirMult = rule.dir === "asc" ? 1 : -1;

      if (valA === valB) continue;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (propMeta.type === "date") {
        const dateA = typeof valA === "object" ? valA?.start : valA;
        const dateB = typeof valB === "object" ? valB?.start : valB;
        if (!dateA) return 1;
        if (!dateB) return -1;
        const diff = dayjs(dateA).valueOf() - dayjs(dateB).valueOf();
        if (diff !== 0) return diff * dirMult;
      } else if (typeof valA === "string" && typeof valB === "string") {
        const cmp = valA.localeCompare(valB);
        if (cmp !== 0) return cmp * dirMult;
      } else if (typeof valA === "number" && typeof valB === "number") {
        if (valA !== valB) return (valA - valB) * dirMult;
      }
    }
    return 0;
  });
}

export function applyGrouping(rows: DatabaseRow[], groupBy: string | null, schema: DatabasePropertySchema[], dateGroupMode?: string): Record<string, DatabaseRow[]> {
  if (!groupBy) return { "ungrouped": rows };

  const propMeta = schema.find(p => p.id === groupBy);
  if (!propMeta || !["select", "status", "multi_select", "date"].includes(propMeta.type)) {
    return { "ungrouped": rows };
  }

  const groups: Record<string, DatabaseRow[]> = {};

  if (propMeta.type === "date") {
    // Dynamic grouping
    groups["__unassigned__"] = [];
    rows.forEach(row => {
      let val = row.properties[groupBy];
      val = typeof val === "object" ? val?.start : val;
      if (!val) {
        groups["__unassigned__"].push(row);
        return;
      }

      const d = dayjs(val);
      let groupKey = "";

      switch (dateGroupMode) {
        case "day":
          groupKey = d.format("YYYY-MM-DD");
          break;
        case "week":
          groupKey = d.startOf("week").format("YYYY-MM-DD") + " (Week)";
          break;
        case "year":
          groupKey = d.format("YYYY");
          break;
        case "relative":
          const now = dayjs().startOf("day");
          const diff = d.startOf("day").diff(now, "day");
          if (diff === 0) groupKey = "Today";
          else if (diff === 1) groupKey = "Tomorrow";
          else if (diff === -1) groupKey = "Yesterday";
          else if (diff > 1 && diff <= 7) groupKey = "Next 7 Days";
          else if (diff < -1 && diff >= -7) groupKey = "Last 7 Days";
          else groupKey = d.format("MMM YYYY");
          break;
        case "month":
        default:
          groupKey = d.format("MMM YYYY");
          break;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(row);
    });
    return groups;
  }

  // Initialize columns in option order for select/status
  if (propMeta.options) {
    propMeta.options.forEach(opt => { groups[opt.id] = []; });
  }
  groups["__unassigned__"] = [];

  rows.forEach(row => {
    const val = row.properties[groupBy];
    if (val && groups[val] !== undefined) {
      groups[val].push(row);
    } else {
      groups["__unassigned__"].push(row);
    }
  });

  return groups;
}
