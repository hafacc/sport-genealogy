import type { Edge } from "./lib/chart.ts";
import {
  copy,
  dotRadius,
  fontFamily,
  gridInk,
  ink,
  layoutChart,
  legendEntries,
  legendSwatch,
  lineWidth,
  mutedInk,
  paper,
  rowCount,
} from "./lib/chart.ts";

// poster is 24in x 36in at 100 units per inch
const width = 2400;
const height = 3600;
const margin = { top: 470, right: 180, bottom: 150, left: 90 };

const rowHeight = (height - margin.top - margin.bottom) / rowCount;
const labelSize = Math.min(13.5, rowHeight * 0.56);
const { ticks, headings, branchEdges, trunkEdges, marks } = layoutChart({
  width,
  margin,
  rowHeight,
  labelSize,
});

/** Escape text for use inside SVG markup. */
function escapeXml(text: string): string {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Draw a link between two sports. */
function edgePath(edge: Edge): string {
  const dash = edge.dash ? ` stroke-dasharray="${edge.dash}"` : "";
  const cap = edge.roundCap ? ' stroke-linecap="round"' : "";
  return `<path d="${edge.path}" fill="none" stroke="${edge.color}" stroke-width="${edge.strokeWidth}"${dash}${cap}><title>${escapeXml(edge.tooltip)}</title></path>`;
}

const parts: string[] = [];
parts.push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24in" height="36in" viewBox="0 0 ${width} ${height}" font-family="${fontFamily}">`,
  `<rect width="${width}" height="${height}" fill="${paper}"/>`,
);

const axisTop = margin.top - 40;
const axisBottom = height - margin.bottom + 30;
for (const { year, x } of ticks) {
  const tickX = x.toFixed(1);
  parts.push(
    `<line x1="${tickX}" x2="${tickX}" y1="${axisTop}" y2="${axisBottom}" stroke="${gridInk}" stroke-width="1"/>`,
    `<text x="${tickX}" y="${axisTop - 10}" text-anchor="middle" font-size="15" fill="${mutedInk}">${year}</text>`,
    `<text x="${tickX}" y="${axisBottom + 22}" text-anchor="middle" font-size="15" fill="${mutedInk}">${year}</text>`,
  );
}

for (const { family, y: headingY } of headings) {
  if (family.name) {
    parts.push(
      `<rect x="${margin.left}" y="${headingY - 17}" width="26" height="6" fill="${family.color}"/>`,
      `<text x="${margin.left + 36}" y="${headingY - 8}" font-size="24" font-weight="700" letter-spacing="2.5" fill="${ink}">${escapeXml(family.name.toUpperCase())}</text>`,
    );
  }
}

parts.push(...branchEdges.map(edgePath), ...trunkEdges.map(edgePath));

for (const { sport, y, startX, endX, color } of marks) {
  const lineY = y.toFixed(1);
  parts.push(
    `<line x1="${startX.toFixed(1)}" x2="${endX.toFixed(1)}" y1="${lineY}" y2="${lineY}" stroke="${color}" stroke-width="${lineWidth}"/>`,
  );
  if (sport.ended != null) {
    parts.push(
      `<line x1="${endX.toFixed(1)}" x2="${endX.toFixed(1)}" y1="${(y - 5).toFixed(1)}" y2="${(y + 5).toFixed(1)}" stroke="${color}" stroke-width="${lineWidth}"/>`,
    );
  }
}

for (const { sport, y, startX, color, years, labelX } of marks) {
  const tooltip = sport.note
    ? `<title>${escapeXml(`${sport.name}: ${sport.note}`)}</title>`
    : "";
  parts.push(
    `<circle cx="${startX.toFixed(1)}" cy="${y.toFixed(1)}" r="${dotRadius}" fill="${sport.approx ? paper : color}" stroke="${color}" stroke-width="2">${tooltip}</circle>`,
    `<text x="${labelX.toFixed(1)}" y="${(y - 5.5).toFixed(1)}" font-size="${labelSize.toFixed(1)}" fill="${ink}" stroke="${paper}" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"><tspan font-weight="600">${escapeXml(sport.name)}</tspan><tspan fill="${mutedInk}" font-size="${(labelSize * 0.88).toFixed(1)}" dx="6">${escapeXml(years)}</tspan></text>`,
  );
}

if (copy.title) {
  parts.push(
    `<text x="${margin.left}" y="205" font-size="150" font-weight="800" letter-spacing="-3" fill="${ink}">${escapeXml(copy.title)}</text>`,
  );
}
const legendX = width - margin.right - 420;
legendEntries().forEach((entry, index) => {
  const entryY = 88 + index * 38;
  parts.push(
    `<g transform="translate(${legendX},${entryY})">${entry.mark}<text x="${legendSwatch + 16}" y="6" font-size="19" fill="${ink}">${escapeXml(entry.text)}</text></g>`,
  );
});

(copy.footer ?? []).forEach((line, index) => {
  parts.push(
    `<text x="${margin.left}" y="${height - 62 + index * 22}" font-size="15" fill="${mutedInk}">${escapeXml(line)}</text>`,
  );
});

parts.push("</svg>");
process.stdout.write(parts.join("\n"));
