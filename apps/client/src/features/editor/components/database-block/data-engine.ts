import { DatabaseRow, DatabasePropertySchema, FilterRule, SortRule } from "@docmost/editor-ext";
import dayjs from "dayjs";

export function applyFilters(rows: DatabaseRow[], rules: FilterRule[], schema: DatabasePropertySchema[]): DatabaseRow[] {
  if (!rules || rules.length === 0) return rows;

  return rows.filter(row => {
    return rules.every(rule => {
      const propValue = row.properties[rule.propId];
      const propMeta = schema.find(p => p.id === rule.propId);
      
      if (!propMeta) return true; // Property deleted

      switch (rule.op) {
        case "is":
          if (propMeta.type === "date" && typeof propValue === "object") {
            return propValue.start === rule.value;
          }
          return propValue === rule.value;
        case "isNot":
          if (propMeta.type === "date" && typeof propValue === "object") {
            return propValue.start !== rule.value;
          }
          return propValue !== rule.value;
        case "contains":
          if (typeof propValue === "string" && typeof rule.value === "string") {
            return propValue.toLowerCase().includes(rule.value.toLowerCase());
          }
          return false;
        case "isEmpty":
          return propValue === null || propValue === undefined || propValue === "";
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
        const dateA = typeof valA === "object" ? valA.start : valA;
        const dateB = typeof valB === "object" ? valB.start : valB;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        const timeA = dayjs(dateA).valueOf();
        const timeB = dayjs(dateB).valueOf();
        if (timeA !== timeB) return (timeA - timeB) * dirMult;
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

export function applyGrouping(rows: DatabaseRow[], groupBy: string | null, schema: DatabasePropertySchema[]): Record<string, DatabaseRow[]> {
  if (!groupBy) {
    return { "ungrouped": rows };
  }

  const propMeta = schema.find(p => p.id === groupBy);
  if (!propMeta || (propMeta.type !== "select" && propMeta.type !== "status")) {
    return { "ungrouped": rows };
  }

  const groups: Record<string, DatabaseRow[]> = {};
  
  // Initialize all defined options as groups to maintain order
  if (propMeta.options) {
    propMeta.options.forEach(opt => {
      groups[opt.id] = [];
    });
  }
  
  // Add an unassigned group
  groups["unassigned"] = [];

  rows.forEach(row => {
    const val = row.properties[groupBy];
    if (val && groups[val] !== undefined) {
      groups[val].push(row);
    } else {
      groups["unassigned"].push(row);
    }
  });

  return groups;
}
