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
  /** captions of the switch between the two ways to follow a family line */
  direction?: Record<Direction, string>;
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
// round caps turn each near-zero dash into a dot as wide as a line
const disputedDash = "0.1 4.8";

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

// gap between side links that rise next to each other
const riseSpacing = 7;
// how far left of a dot a rising link has to pass to clear it
const riseClearance = 9;
// what a side link pays, in lines crossed, to rise right beside another link
const crowdedCost = 10;
// what a side link pays, in lines crossed, per unit it runs level to reach its sport
const runCost = 1 / 200;

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

/** The parentless sport at the top of a sport's tree. */
function rootOf(sport: Sport): Sport {
  const trunk = trunkParent(sport);
  return trunk ? rootOf(lookup(sportById, trunk.id)) : sport;
}

// A sport descended from two trees takes the second tree in below itself, so
// the link between them stays short and crosses nothing.
const guestRootsById = new Map<string, Sport[]>();
const guestRoots = new Set<Sport>();
for (const sport of sports) {
  const trunk = trunkParent(sport);
  for (const parent of sport.parents) {
    const root = lookup(sportById, parent.id);
    if (
      parent !== trunk &&
      parent.kind === "descent" &&
      !trunkParent(root) &&
      root.family === sport.family &&
      rootOf(sport) !== root &&
      !guestRoots.has(root)
    ) {
      guestRoots.add(root);
      guestRootsById.set(sport.id, [
        ...(guestRootsById.get(sport.id) ?? []),
        root,
      ]);
    }
  }
}

interface RowPlan {
  /** row of each sport, by id */
  rowById: Map<string, number>;
  /** row of each family heading */
  headingRows: { family: Family; row: number }[];
  /** rows used, blank ones included */
  rowCount: number;
}

/** Stack the families, giving each root and its descendants consecutive rows. */
function planRows(rootsByFamily: Map<Family, Sport[]>): RowPlan {
  const rowById = new Map<string, number>();
  const headingRows: RowPlan["headingRows"] = [];
  let nextRow = 0;

  function assignRows(sport: Sport): void {
    rowById.set(sport.id, nextRow);
    nextRow += 1;
    for (const child of lookup(childrenById, sport.id)) {
      assignRows(child);
    }
    for (const guest of guestRootsById.get(sport.id) ?? []) {
      assignRows(guest);
    }
  }

  for (const [family, roots] of rootsByFamily) {
    if (roots.length > 0) {
      nextRow += familyGapRows;
      headingRows.push({ family, row: nextRow - 1.5 });
      for (const root of roots) {
        assignRows(root);
        nextRow += treeGapRows;
      }
    }
  }
  return { rowById, headingRows, rowCount: nextRow };
}

// links inside a family count extra, so its related trees end up adjacent
const sameFamilyWeight = 4;

/** Total rows spanned by the links that leave a sport's own tree. */
function branchLength({ rowById }: RowPlan): number {
  let total = 0;
  for (const sport of sports) {
    const trunk = trunkParent(sport);
    for (const parent of sport.parents) {
      if (parent !== trunk) {
        const rows = Math.abs(
          lookup(rowById, sport.id) - lookup(rowById, parent.id),
        );
        const sameFamily = lookup(sportById, parent.id).family === sport.family;
        total += rows * (sameFamily ? sameFamilyWeight : 1);
      }
    }
  }
  return total;
}

/** Reorder the roots within each family until no single move shortens the links. */
function shortestPlan(rootsByFamily: Map<Family, Sport[]>): RowPlan {
  let best = planRows(rootsByFamily);
  let bestLength = branchLength(best);
  let improved = true;
  while (improved) {
    improved = false;
    for (const [family, roots] of rootsByFamily) {
      for (let from = 0; from < roots.length; from += 1) {
        for (let to = 0; to < roots.length; to += 1) {
          const moved = roots.toSpliced(from, 1).toSpliced(to, 0, roots[from]);
          const plan = planRows(new Map(rootsByFamily).set(family, moved));
          const length = branchLength(plan);
          if (length < bestLength) {
            rootsByFamily.set(family, moved);
            roots.splice(0, roots.length, ...moved);
            best = plan;
            bestLength = length;
            improved = true;
          }
        }
      }
    }
  }
  return best;
}

const {
  rowById,
  headingRows,
  rowCount: plannedRows,
} = shortestPlan(
  new Map(
    families.map((family) => [
      family,
      sports
        .filter(
          (sport) =>
            sport.family === family.id &&
            !trunkParent(sport) &&
            !guestRoots.has(sport),
        )
        .sort((first, second) => first.year - second.year),
    ]),
  ),
);

/** Number of rows the chart needs, blank ones included. */
export const rowCount = plannedRows;

/** Stroke color of a sport's family. */
export function colorOf(sport: Sport): string {
  return lookup(familyById, sport.family).color;
}

/** Stroke of a link: solid for settled descent, dashed for borrowing, dotted when disputed. */
export function strokeOf(
  parent: ParentRef,
  isTrunk: boolean,
): Pick<Edge, "strokeWidth" | "dash" | "roundCap"> {
  if (parent.disputed) {
    return { strokeWidth: lineWidth, dash: disputedDash, roundCap: true };
  } else if (parent.kind === "influence") {
    return { strokeWidth: 1.5, dash: "7 4", roundCap: false };
  } else {
    return { strokeWidth: lineWidth, roundCap: !isTrunk };
  }
}

/** Hover text of a link. */
function tooltipOf(parent: Sport, child: Sport, link: ParentRef): string {
  return `${parent.name} → ${child.name}${link.note ? `: ${link.note}` : ""}`;
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

/** Which way a picked sport's family line is followed. */
export type Direction = "ancestors" | "descendants";

/** The sport itself plus every sport it came from, or every sport that came from it. */
export function lineageOf(sport: Sport, direction: Direction): Set<string> {
  const lineage = new Set<string>([sport.id]);
  if (direction === "ancestors") {
    const ancestors = [sport];
    for (const ancestor of ancestors) {
      for (const { id } of ancestor.parents) {
        if (!lineage.has(id)) {
          lineage.add(id);
          ancestors.push(lookup(sportById, id));
        }
      }
    }
  } else {
    // parents always begin earlier, but not always earlier in the file
    let grew = true;
    while (grew) {
      grew = false;
      for (const candidate of sports) {
        if (
          !lineage.has(candidate.id) &&
          candidate.parents.some(({ id }) => lineage.has(id))
        ) {
          lineage.add(candidate.id);
          grew = true;
        }
      }
    }
  }
  return lineage;
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
  const markById = new Map(marks.map((mark) => [mark.sport.id, mark]));

  // upright and level stretches of the links placed so far
  const rises: { x: number; top: number; bottom: number }[] = [];
  const runs: { y: number; left: number; right: number }[] = [];

  const trunkEdges: Edge[] = [];
  for (const { sport, startX: childX, y: childY } of marks) {
    const trunk = trunkParent(sport);
    if (trunk) {
      const parent = lookup(markById, trunk.id);
      const turn = Math.min(9, (childY - parent.y) / 2);
      // a parent that died out first is joined from the end of its line
      const leadX = Math.min(childX - turn, parent.endX);
      rises.push({ x: childX, top: parent.y, bottom: childY });
      trunkEdges.push({
        parent: parent.sport,
        child: sport,
        color: parent.color,
        tooltip: tooltipOf(parent.sport, sport, trunk),
        path: `M${leadX.toFixed(1)},${parent.y.toFixed(1)} L${(childX - turn).toFixed(1)},${parent.y.toFixed(1)} Q${childX.toFixed(1)},${parent.y.toFixed(1)} ${childX.toFixed(1)},${(parent.y + turn).toFixed(1)} L${childX.toFixed(1)},${childY.toFixed(1)}`,
        ...strokeOf(trunk, true),
      });
    }
  }

  /** How much a side link would tangle with the chart if it rose at a given spot. */
  function tangle(riseX: number, parent: SportMark, child: SportMark): number {
    const top = Math.min(parent.y, child.y);
    const bottom = Math.max(parent.y, child.y);
    const linesCrossed = marks.filter(
      (mark) =>
        mark.y > top &&
        mark.y < bottom &&
        mark.startX - riseClearance < riseX &&
        riseX <= mark.endX,
    ).length;
    const runsCrossed = runs.filter(
      (run) =>
        run.y > top && run.y < bottom && run.left < riseX && riseX < run.right,
    ).length;
    const risesCrossed = rises.filter(
      (rise) =>
        rise.x > riseX &&
        rise.x < child.startX &&
        rise.top < child.y &&
        rise.bottom > child.y,
    ).length;
    const crowded = rises.some(
      (rise) =>
        Math.abs(rise.x - riseX) < riseSpacing &&
        rise.top < bottom &&
        rise.bottom > top,
    );
    return (
      linesCrossed +
      runsCrossed +
      risesCrossed +
      (crowded ? crowdedCost : 0) +
      (child.startX - riseX) * runCost
    );
  }

  const branchEdges: Edge[] = [];
  for (const child of marks) {
    const trunk = trunkParent(child.sport);
    let branchCount = 0;
    for (const parentRef of child.sport.parents) {
      if (parentRef !== trunk) {
        branchCount += 1;
        const parent = lookup(markById, parentRef.id);
        const direction = Math.sign(child.y - parent.y);
        const turn = 7;
        const nearX = child.startX - 4 - riseSpacing * branchCount;
        const leftmost = parent.startX + 2 * dotRadius;
        let riseX = nearX;
        let path: string;
        if (nearX < leftmost || nearX > parent.endX) {
          // a parent that died out or began later is joined by a level run
          const leaveX = Math.min(Math.max(nearX, parent.startX), parent.endX);
          const run =
            leaveX === nearX
              ? `M${nearX.toFixed(1)},${parent.y.toFixed(1)}`
              : `M${leaveX.toFixed(1)},${parent.y.toFixed(1)} L${(nearX - turn * Math.sign(nearX - leaveX)).toFixed(1)},${parent.y.toFixed(1)} Q${nearX.toFixed(1)},${parent.y.toFixed(1)} ${nearX.toFixed(1)},${(parent.y + turn * direction).toFixed(1)}`;
          path = `${run} L${nearX.toFixed(1)},${(child.y - turn * direction).toFixed(1)} Q${nearX.toFixed(1)},${child.y.toFixed(1)} ${child.startX.toFixed(1)},${child.y.toFixed(1)}`;
        } else {
          // rise where the link tangles least: often left of the lines in between
          const candidates = [
            nearX,
            ...marks
              .filter(
                (mark) =>
                  (mark.y - parent.y) * (mark.y - child.y) < 0 &&
                  mark.startX < nearX,
              )
              .flatMap((mark) =>
                [0, 1, 2].map(
                  (step) => mark.startX - riseClearance - riseSpacing * step,
                ),
              )
              .filter((candidate) => candidate >= leftmost),
          ];
          let least = Number.POSITIVE_INFINITY;
          for (const candidate of candidates) {
            const cost = tangle(candidate, parent, child);
            if (cost < least) {
              least = cost;
              riseX = candidate;
            }
          }
          const arrive =
            child.startX - riseX > 2 * turn
              ? `${(riseX + turn).toFixed(1)},${child.y.toFixed(1)} L${child.startX.toFixed(1)},${child.y.toFixed(1)}`
              : `${child.startX.toFixed(1)},${child.y.toFixed(1)}`;
          path = `M${riseX.toFixed(1)},${parent.y.toFixed(1)} L${riseX.toFixed(1)},${(child.y - turn * direction).toFixed(1)} Q${riseX.toFixed(1)},${child.y.toFixed(1)} ${arrive}`;
        }
        rises.push({
          x: riseX,
          top: Math.min(parent.y, child.y),
          bottom: Math.max(parent.y, child.y),
        });
        runs.push({ y: child.y, left: riseX, right: child.startX });
        branchEdges.push({
          parent: parent.sport,
          child: child.sport,
          color: parent.color,
          tooltip: tooltipOf(parent.sport, child.sport, parentRef),
          path,
          ...strokeOf(parentRef, false),
        });
      }
    }
  }

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
    disputed: `<path d="M22,-11 L22,2 Q22,9 29,9" fill="none" stroke="${ink}" stroke-width="${lineWidth}" stroke-dasharray="${disputedDash}" stroke-linecap="round"/><line x1="29" x2="${legendSwatch}" y1="9" y2="9" stroke="${ink}" stroke-width="${lineWidth}"/><circle cx="29" cy="9" r="${dotRadius}" fill="${ink}"/>`,
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
