import data from "./sports.json" with { type: "json" };

/** Wording shown on the poster and the site. */
export interface Copy {
  /** main heading */
  title: string;
  /** page description for search results and link previews */
  description?: string;
  /** text of the poster download link */
  download?: string;
  /** text of the link from a summary to its article */
  wikipedia?: string;
  /** accessible name of the summary's close button */
  close?: string;
  /** legend captions, by mark */
  legend: Partial<Record<LegendKey, string>>;
  /** lines of small print at the foot of the poster */
  footer?: string[];
}

/** The marks the legend explains. */
export type LegendKey =
  | "descent"
  | "influence"
  | "disputed"
  | "approx"
  | "ended";

/** A group of related sports that shares a color. */
export interface Family {
  /** unique key */
  id: string;
  /** display name */
  name: string;
  /** stroke color */
  color: string;
}

/** A link from a sport to one it came from. */
export interface ParentRef {
  /** id of the parent sport */
  id: string;
  /** whether the rules descend from the parent or only borrow from it */
  kind: "descent" | "influence";
  /** what was passed on */
  note?: string;
  /** where the link is documented */
  source?: string;
  /** whether historians disagree about the link */
  disputed?: boolean;
}

/** A sport and where it came from. */
export interface Sport {
  /** unique key */
  id: string;
  /** display name */
  name: string;
  /** id of the family it belongs to */
  family: string;
  /** year it began; negative for BCE */
  year: number;
  /** whether the year is an estimate */
  approx: boolean;
  /** year it died out, if it did */
  ended: number | null;
  /** the sports it came from */
  parents: ParentRef[];
  /** short history */
  note?: string;
  /** where the history is documented */
  sources: string[];
}

interface Dataset {
  copy: Copy;
  families: Family[];
  sports: Sport[];
}

export const { copy, families, sports } = data as Dataset;

/** Blank space around the plot. */
export interface Margin {
  /** space above the first row */
  top: number;
  /** space right of the present year */
  right: number;
  /** space below the last row */
  bottom: number;
  /** space left of the earliest year */
  left: number;
}

/** Size of a chart to lay out. */
export interface ChartOptions {
  /** full width, margins included */
  width: number;
  /** blank space around the plot */
  margin: Margin;
  /** height of one sport row */
  rowHeight: number;
  /** font size of sport names */
  labelSize: number;
  /** drop year ticks that would sit closer together than this */
  minTickGap?: number;
  /** right edge that labels are pulled back to stay inside of */
  labelLimit?: number;
}

/** A year marked on the time axis. */
export interface Tick {
  /** year marked */
  year: number;
  /** horizontal position */
  x: number;
}

/** A family name placed above its sports. */
export interface Heading {
  /** family named */
  family: Family;
  /** baseline of the heading block */
  y: number;
}

/** A drawn link from a parent sport to a child. */
export interface Edge {
  /** sport the link leaves */
  parent: Sport;
  /** sport the link arrives at */
  child: Sport;
  /** SVG path data */
  path: string;
  /** stroke color */
  color: string;
  /** stroke width */
  strokeWidth: number;
  /** stroke dash pattern; solid when absent */
  dash?: string;
  /** whether stroke ends are rounded */
  roundCap: boolean;
  /** hover text */
  tooltip: string;
}

/** A sport's line, dot and label. */
export interface SportMark {
  /** sport drawn */
  sport: Sport;
  /** vertical position of the line */
  y: number;
  /** where the line and dot start */
  startX: number;
  /** where the line stops */
  endX: number;
  /** stroke color */
  color: string;
  /** years active, formatted */
  years: string;
  /** horizontal anchor point of the label */
  labelX: number;
  /** which end of the label sits at the anchor point */
  labelAnchor: "start" | "end";
  /** rough width of the label; errs wide */
  labelWidth: number;
}

/** Everything needed to draw a chart. */
export interface ChartLayout {
  /** full width */
  width: number;
  /** full height */
  height: number;
  /** years marked on the axis */
  ticks: Tick[];
  /** family names */
  headings: Heading[];
  /** links that join a child from the side; drawn first */
  branchEdges: Edge[];
  /** links that drop from a parent to the child below it */
  trunkEdges: Edge[];
  /** one mark per sport */
  marks: SportMark[];
}

export const presentYear = 2026;
export const ink = "#1d1b16";
export const mutedInk = "#6b665b";
export const paper = "#f6f1e4";
export const gridInk = "#d9d2bf";
export const fontFamily =
  "'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const lineWidth = 2.4;
export const dotRadius = 4;

// [year, fraction of the plot width]; the 19th century gets most of the room
const timeStops: [number, number][] = [
  [-800, 0],
  [1000, 0.035],
  [1500, 0.085],
  [1700, 0.15],
  [1800, 0.25],
  [1850, 0.4],
  [1900, 0.64],
  [1950, 0.8],
  [2000, 0.93],
  [presentYear, 1],
];
const tickYears = [
  1000, 1500, 1600, 1700, 1750, 1800, 1825, 1850, 1875, 1900, 1925, 1950, 1975,
  2000, 2025,
];
// which ticks survive when there isn't room for all of them, most wanted first
const tickPriority = [
  1900, 1800, 2000, 1500, 1850, 1950, 1000, 1700, 2025, 1875, 1925, 1975, 1600,
  1750, 1825,
];

// rows of blank space, in units of one sport row
const familyGapRows = 3.2;
const treeGapRows = 0.6;

/** Look up a key that is known to be present. */
function lookup<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key): Value {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`missing ${String(key)}`);
  } else {
    return value;
  }
}

/** Format a year for display, marking estimates and BCE dates. */
function formatYear(year: number, approx: boolean): string {
  const label = year < 0 ? `${-year} BCE` : `${year}`;
  return approx ? `c. ${label}` : label;
}

/** Format the years a sport has been played. */
export function formatYears(sport: Sport): string {
  const began = formatYear(sport.year, sport.approx);
  return sport.ended == null ? began : `${began}–${sport.ended}`;
}

export const sportById: ReadonlyMap<string, Sport> = new Map(
  sports.map((sport) => [sport.id, sport]),
);
export const familyById: ReadonlyMap<string, Family> = new Map(
  families.map((family) => [family.id, family]),
);
for (const sport of sports) {
  if (!familyById.has(sport.family)) {
    throw new Error(`${sport.id}: unknown family ${sport.family}`);
  }
  for (const parent of sport.parents) {
    if (!sportById.has(parent.id)) {
      throw new Error(`${sport.id}: unknown parent ${parent.id}`);
    }
  }
}

/** The parent a sport is drawn beneath, if it descends from one. */
function trunkParent(sport: Sport): ParentRef | undefined {
  return sport.parents.find((parent) => parent.kind === "descent");
}

const childrenById = new Map<string, Sport[]>(
  sports.map((sport) => [sport.id, []]),
);
for (const sport of sports) {
  const trunk = trunkParent(sport);
  if (trunk) {
    lookup(childrenById, trunk.id).push(sport);
  }
}

// Later-born children sit nearer the parent, so the drop to an earlier child
// passes left of every sibling's line and never crosses one.
for (const children of childrenById.values()) {
  children.sort(
    (first, second) =>
      second.year - first.year || first.name.localeCompare(second.name),
  );
}

const rowById = new Map<string, number>();
const headingRows: { family: Family; row: number }[] = [];
let nextRow = 0;

/** Give a sport and everything descended from it consecutive rows. */
function assignRows(sport: Sport): void {
  rowById.set(sport.id, nextRow);
  nextRow += 1;
  for (const child of lookup(childrenById, sport.id)) {
    assignRows(child);
  }
}

for (const family of families) {
  const roots = sports
    .filter((sport) => sport.family === family.id && !trunkParent(sport))
    .sort((first, second) => first.year - second.year);
  if (roots.length > 0) {
    nextRow += familyGapRows;
    headingRows.push({ family, row: nextRow - 1.5 });
    for (const root of roots) {
      assignRows(root);
      nextRow += treeGapRows;
    }
  }
}

/** Number of rows the chart needs, blank ones included. */
export const rowCount = nextRow;

/** Stroke color of a sport's family. */
export function colorOf(sport: Sport): string {
  return lookup(familyById, sport.family).color;
}

/** Dash pattern for a link; solid when the descent is settled. */
export function dashOf(
  parent: ParentRef,
  isTrunk: boolean,
): Pick<Edge, "dash" | "roundCap"> {
  if (parent.disputed) {
    return { dash: "0.1 5", roundCap: true };
  } else if (parent.kind === "influence") {
    return { dash: "7 4", roundCap: false };
  } else {
    return { roundCap: !isTrunk };
  }
}

/** The sport's Wikipedia article, in English where there is one. */
export function wikipediaOf(sport: Sport): string | undefined {
  const hosts = sport.sources.map((source) => new URL(source).hostname);
  const english = hosts.indexOf("en.wikipedia.org");
  const anyLanguage = hosts.findIndex((host) =>
    host.endsWith(".wikipedia.org"),
  );
  return sport.sources[english >= 0 ? english : anyLanguage];
}

/** Rough width of a sport's label; errs wide. */
function labelWidth(sport: Sport, labelSize: number): number {
  const nameWidth = sport.name.length * labelSize * 0.6;
  const yearsWidth = formatYears(sport).length * labelSize * 0.88 * 0.56;
  return nameWidth + 6 + yearsWidth;
}

/** The sport itself plus every sport it came from and every sport that came from it. */
export function lineageOf(sport: Sport): Set<string> {
  const lineage = new Set<string>([sport.id]);
  const ancestors = [sport];
  for (const ancestor of ancestors) {
    for (const { id } of ancestor.parents) {
      if (!lineage.has(id)) {
        lineage.add(id);
        ancestors.push(lookup(sportById, id));
      }
    }
  }
  const descendants = new Set<string>([sport.id]);
  // parents always begin earlier, but not always earlier in the file
  let grew = true;
  while (grew) {
    grew = false;
    for (const candidate of sports) {
      if (
        !descendants.has(candidate.id) &&
        candidate.parents.some(({ id }) => descendants.has(id))
      ) {
        descendants.add(candidate.id);
        grew = true;
      }
    }
  }
  return new Set<string>([...lineage, ...descendants]);
}

/**
 * Lay out the family tree of sports at a given size.
 *
 * Time runs left to right on a scale that gives the 19th century most of the
 * room, and each sport gets a row beneath the sport its rules came from. The
 * result holds positions and path data only, so the poster and the site can
 * each draw it their own way.
 *
 * Every year tick is kept unless `minTickGap` is set, and labels always sit
 * right of their dot unless `labelLimit` is set.
 */
export function layoutChart(options: ChartOptions): ChartLayout {
  const {
    width,
    margin,
    rowHeight,
    labelSize,
    minTickGap = 0,
    labelLimit,
  } = options;

  /** Map a year to a horizontal position. */
  function xOfYear(year: number): number {
    const plotWidth = width - margin.left - margin.right;
    const [firstYear] = timeStops[0];
    const clamped = Math.min(Math.max(year, firstYear), presentYear);
    const upperIndex = Math.max(
      1,
      timeStops.findIndex(([stopYear]) => stopYear >= clamped),
    );
    const [lowYear, lowFraction] = timeStops[upperIndex - 1];
    const [highYear, highFraction] = timeStops[upperIndex];
    const progress = (clamped - lowYear) / (highYear - lowYear);
    return (
      margin.left +
      plotWidth * (lowFraction + progress * (highFraction - lowFraction))
    );
  }

  /** Vertical position of a sport's line. */
  function yOf(sport: Sport): number {
    return margin.top + lookup(rowById, sport.id) * rowHeight;
  }

  /** Where a sport's line starts; never left of the parent it branches from. */
  function startX(sport: Sport): number {
    const trunk = trunkParent(sport);
    const own = xOfYear(sport.year);
    if (trunk) {
      return Math.max(own, startX(lookup(sportById, trunk.id)) + 2 * dotRadius);
    } else {
      return own;
    }
  }

  /** Where a sport's line stops: the present, or the year it died out. */
  function endX(sport: Sport): number {
    return Math.max(xOfYear(sport.ended ?? presentYear), startX(sport) + 10);
  }

  const shownYears: number[] = [];
  for (const year of tickPriority) {
    if (
      shownYears.every(
        (shown) => Math.abs(xOfYear(shown) - xOfYear(year)) >= minTickGap,
      )
    ) {
      shownYears.push(year);
    }
  }
  const ticks = tickYears
    .filter((year) => shownYears.includes(year))
    .map((year) => ({ year, x: xOfYear(year) }));

  const headings = headingRows.map(({ family, row }) => ({
    family,
    y: margin.top + row * rowHeight,
  }));

  const branchEdges: Edge[] = [];
  const trunkEdges: Edge[] = [];
  for (const sport of sports) {
    const trunk = trunkParent(sport);
    const childX = startX(sport);
    const childY = yOf(sport);
    let branchCount = 0;
    for (const parentRef of sport.parents) {
      const parent = lookup(sportById, parentRef.id);
      const parentY = yOf(parent);
      const tooltip = `${parent.name} → ${sport.name}${parentRef.note ? `: ${parentRef.note}` : ""}`;
      const shared = { parent, child: sport, color: colorOf(parent), tooltip };
      if (parentRef === trunk) {
        const turn = Math.min(9, (childY - parentY) / 2);
        // a parent that died out first is joined from the end of its line
        const leadX = Math.min(childX - turn, endX(parent));
        trunkEdges.push({
          ...shared,
          path: `M${leadX.toFixed(1)},${parentY.toFixed(1)} L${(childX - turn).toFixed(1)},${parentY.toFixed(1)} Q${childX.toFixed(1)},${parentY.toFixed(1)} ${childX.toFixed(1)},${(parentY + turn).toFixed(1)} L${childX.toFixed(1)},${childY.toFixed(1)}`,
          strokeWidth: lineWidth,
          ...dashOf(parentRef, true),
        });
      } else {
        branchCount += 1;
        const riseX = childX - 4 - 7 * branchCount;
        // a parent that died out or began later is joined by a level run
        const leaveX = Math.min(Math.max(riseX, startX(parent)), endX(parent));
        const direction = Math.sign(childY - parentY);
        const turn = 7;
        const run =
          leaveX === riseX
            ? `M${riseX.toFixed(1)},${parentY.toFixed(1)}`
            : `M${leaveX.toFixed(1)},${parentY.toFixed(1)} L${(riseX - turn * Math.sign(riseX - leaveX)).toFixed(1)},${parentY.toFixed(1)} Q${riseX.toFixed(1)},${parentY.toFixed(1)} ${riseX.toFixed(1)},${(parentY + turn * direction).toFixed(1)}`;
        branchEdges.push({
          ...shared,
          path: `${run} L${riseX.toFixed(1)},${(childY - turn * direction).toFixed(1)} Q${riseX.toFixed(1)},${childY.toFixed(1)} ${childX.toFixed(1)},${childY.toFixed(1)}`,
          strokeWidth: parentRef.kind === "descent" ? lineWidth : 1.5,
          ...dashOf(parentRef, false),
        });
      }
    }
  }

  const marks = sports.map((sport): SportMark => {
    const dotX = startX(sport);
    const estimate = labelWidth(sport, labelSize);
    const overflows =
      labelLimit !== undefined && dotX + 8 + estimate > labelLimit;
    return {
      sport,
      y: yOf(sport),
      startX: dotX,
      endX: endX(sport),
      color: colorOf(sport),
      years: formatYears(sport),
      labelX: overflows ? labelLimit : dotX + 8,
      labelAnchor: overflows ? "end" : "start",
      labelWidth: estimate,
    };
  });

  return {
    width,
    height: margin.top + rowCount * rowHeight + margin.bottom,
    ticks,
    headings,
    branchEdges,
    trunkEdges,
    marks,
  };
}

/** A legend caption and the SVG markup of the mark it explains. */
export interface LegendEntry {
  /** which mark this is */
  key: LegendKey;
  /** caption */
  text: string;
  /** SVG markup, 70 wide and centered on its own baseline */
  mark: string;
}

/** Width of a legend mark. */
export const legendSwatch = 70;

/** The legend's marks, for every caption the copy provides. */
export function legendEntries(): LegendEntry[] {
  const marks: Record<LegendKey, string> = {
    descent: `<path d="M0,-9 Q9,-9 9,0 L9,9 L${legendSwatch},9" fill="none" stroke="${ink}" stroke-width="${lineWidth}"/><circle cx="9" cy="9" r="${dotRadius}" fill="${ink}" stroke="${ink}" stroke-width="2"/>`,
    influence: `<path d="M22,-11 L22,2 Q22,9 29,9" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="7 4"/><line x1="29" x2="${legendSwatch}" y1="9" y2="9" stroke="${ink}" stroke-width="${lineWidth}"/><circle cx="29" cy="9" r="${dotRadius}" fill="${ink}"/>`,
    disputed: `<path d="M22,-11 L22,2 Q22,9 29,9" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="0.1 5" stroke-linecap="round"/><line x1="29" x2="${legendSwatch}" y1="9" y2="9" stroke="${ink}" stroke-width="${lineWidth}"/><circle cx="29" cy="9" r="${dotRadius}" fill="${ink}"/>`,
    approx: `<line x1="${legendSwatch / 2}" x2="${legendSwatch}" y1="0" y2="0" stroke="${ink}" stroke-width="${lineWidth}"/><circle cx="${legendSwatch / 2}" cy="0" r="${dotRadius}" fill="${paper}" stroke="${ink}" stroke-width="2"/>`,
    ended: `<line x1="0" x2="${legendSwatch / 2}" y1="0" y2="0" stroke="${ink}" stroke-width="${lineWidth}"/><line x1="${legendSwatch / 2}" x2="${legendSwatch / 2}" y1="-5" y2="5" stroke="${ink}" stroke-width="${lineWidth}"/>`,
  };
  const keys: LegendKey[] = [
    "descent",
    "influence",
    "disputed",
    "approx",
    "ended",
  ];
  return keys.flatMap((key) => {
    const text = copy.legend[key];
    return text ? [{ key, text, mark: marks[key] }] : [];
  });
}
