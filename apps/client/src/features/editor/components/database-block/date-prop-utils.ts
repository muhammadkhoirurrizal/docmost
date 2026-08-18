// Shared utility for parsing database date properties.
// Handles both legacy string format and new { start, end } object format.

export interface DateRange {
  start: string | null;
  end: string | null;
}

export function parseDateProp(value: any): DateRange {
  if (!value) return { start: null, end: null };
  if (typeof value === "string") return { start: value, end: value };
  if (typeof value === "object") {
    return {
      start: value.start ?? null,
      end: value.end ?? value.start ?? null,
    };
  }
  return { start: null, end: null };
}
