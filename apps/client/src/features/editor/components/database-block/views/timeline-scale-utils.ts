import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

export type TimeScale = "Hours" | "Days" | "Weeks" | "Months" | "Quarters" | "Years";

export interface TimelineColumn {
  id: string; // unique ID
  date: dayjs.Dayjs; // Start of this column's period
  tier1Label: string; // Top row label (may be empty if continuing previous group)
  tier2Label: string; // Bottom row label
  isWeekend?: boolean;
  isToday?: boolean;
  isMonthStart?: boolean;
}

interface ScaleConfig {
  unit: any;
  width: number;
  formatTier1: (d: dayjs.Dayjs) => string;
  formatTier2: (d: dayjs.Dayjs) => string;
  historySize: number; // how many units backward from today
  futureSize: number; // how many units forward from today
  jumpSize: number; // how many units to jump on < > click
}

const SCALE_CONFIGS: Record<TimeScale, ScaleConfig> = {
  Hours: {
    unit: "hour",
    width: 60,
    formatTier1: d => d.hour() === 0 ? d.format("MMM D, YYYY") : "",
    formatTier2: d => d.format("h A"),
    historySize: 24 * 3, // 3 days back
    futureSize: 24 * 7,  // 7 days forward
    jumpSize: 24, // 1 day jump
  },
  Days: {
    unit: "day",
    width: 48,
    formatTier1: d => d.date() === 1 ? d.format("MMMM YYYY") : "",
    formatTier2: d => d.format("D"),
    historySize: 90, // 3 months back
    futureSize: 180, // 6 months forward
    jumpSize: 30, // 1 month jump
  },
  Weeks: {
    unit: "week",
    width: 100,
    formatTier1: d => d.date() <= 7 ? d.format("MMM YYYY") : "",
    formatTier2: d => `W${d.isoWeek()}`,
    historySize: 52, // 1 year back
    futureSize: 104, // 2 years forward
    jumpSize: 4, // 4 weeks jump
  },
  Months: {
    unit: "month",
    width: 120,
    formatTier1: d => d.month() === 0 ? d.format("YYYY") : "",
    formatTier2: d => d.format("MMM"),
    historySize: 24, // 2 years back
    futureSize: 48, // 4 years forward
    jumpSize: 6, // 6 months jump
  },
  Quarters: {
    unit: "quarter",
    width: 180,
    formatTier1: d => d.quarter() === 1 ? d.format("YYYY") : "",
    formatTier2: d => `Q${d.quarter()}`,
    historySize: 12, // 3 years back
    futureSize: 20, // 5 years forward
    jumpSize: 4, // 1 year jump
  },
  Years: {
    unit: "year",
    width: 200,
    formatTier1: d => "",
    formatTier2: d => d.format("YYYY"),
    historySize: 5, // 5 years back
    futureSize: 10, // 10 years forward
    jumpSize: 1, // 1 year jump
  },
};

export function generateTimelineColumns(scale: TimeScale, anchorDate: dayjs.Dayjs = dayjs()): { columns: TimelineColumn[], rangeStart: dayjs.Dayjs } {
  const config = SCALE_CONFIGS[scale];
  const start = anchorDate.startOf(config.unit).subtract(config.historySize, config.unit);
  
  const columns: TimelineColumn[] = [];
  const totalItems = config.historySize + config.futureSize;

  let lastTier1 = "";

  for (let i = 0; i < totalItems; i++) {
    const d = start.add(i, config.unit);
    const tier1 = config.formatTier1(d);
    
    // Determine if we should show the tier1 label (avoid repeating identical labels)
    let showTier1 = tier1;
    if (tier1 && tier1 !== lastTier1) {
      showTier1 = tier1;
      lastTier1 = tier1;
    } else {
      showTier1 = "";
    }
    
    // For Hours/Days, if it's the very first column, we force a tier1 label
    if (i === 0 && (scale === "Hours" || scale === "Days" || scale === "Weeks" || scale === "Months" || scale === "Quarters")) {
       if (scale === "Hours") showTier1 = d.format("MMM D, YYYY");
       else if (scale === "Days") showTier1 = d.format("MMMM YYYY");
       else if (scale === "Weeks") showTier1 = d.format("MMM YYYY");
       else if (scale === "Months" || scale === "Quarters") showTier1 = d.format("YYYY");
    }

    columns.push({
      id: d.toISOString(),
      date: d,
      tier1Label: showTier1,
      tier2Label: config.formatTier2(d),
      isWeekend: d.day() === 0 || d.day() === 6,
      isToday: d.isSame(dayjs(), config.unit),
      isMonthStart: scale === "Days" && d.date() === 1,
    });
  }

  return { columns, rangeStart: start };
}

export function getScaleWidth(scale: TimeScale) {
  return SCALE_CONFIGS[scale].width;
}

export function getJumpDistance(scale: TimeScale) {
  return SCALE_CONFIGS[scale].jumpSize;
}
