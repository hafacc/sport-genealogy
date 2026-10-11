<script lang="ts">
  import type { Direction, SportMark } from "./chart.ts";
  import {
    dotRadius,
    layoutChart,
    lineageOf,
    lineWidth,
    sportById,
  } from "./chart.ts";

  interface Props {
    /** width to lay the chart out at, in pixels */
    width: number;
    /** id of the sport whose family line is picked out */
    selectedId?: string | null;
    /** which way the family line is followed from the picked sport */
    direction?: Direction;
    /** called with the sport that was picked, or null to clear; omit for a chart that can't be clicked */
    onselect?: (id: string | null) => void;
  }

  let {
    width,
    selectedId = null,
    direction = "ancestors",
    onselect,
  }: Props = $props();

  const rowHeight = 22;
  const labelSize = 12.5;
  const axisHeight = 28;

  const layout = $derived(
    layoutChart({
      width,
      margin: {
        top: 0,
        right: Math.min(110, Math.max(10, width * 0.08)),
        bottom: 26,
        left: 6,
      },
      rowHeight,
      labelSize,
      minTickGap: 38,
      labelLimit: width - 2,
    }),
  );
  const marginLeft = 6;
  const gridBottom = $derived(layout.height - 20);

  const lineage = $derived.by(() => {
    const selected = selectedId ? sportById.get(selectedId) : undefined;
    return selected ? lineageOf(selected, direction) : null;
  });

  // outlives the pick, so the copy drawn on top can stay put while the rest fades back in
  let lastLineage: Set<string> | null = null;
  const topLineage = $derived.by(() => {
    if (lineage) {
      lastLineage = lineage;
    }
    return lastLineage;
  });

  let hoveredId = $state<string | null>(null);

  /** Pick a sport, or clear it if it was already picked. */
  function toggle(id: string): void {
    onselect?.(id === selectedId ? null : id);
  }

  /** Let Enter and Space pick a sport, as they would press a button. */
  function onkeydown(event: KeyboardEvent, id: string): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(id);
    }
  }
</script>

{#snippet dotAndLabel(
  mark: SportMark,
)}
  {@const { sport, y, startX, color, years, labelX, labelAnchor } = mark}
  <circle
    class={[
      "origin-center transition-transform duration-150 [transform-box:fill-box] motion-reduce:transition-none",
      (sport.id === hoveredId || sport.id === selectedId) && "scale-145",
    ]}
    cx={startX.toFixed(1)}
    cy={y.toFixed(1)}
    r={dotRadius}
    fill={sport.approx ? "var(--color-paper)" : color}
    stroke={color}
    stroke-width="2"
  />
  <text
    class="fill-ink stroke-paper stroke-[3.5px] [paint-order:stroke] [stroke-linejoin:round]"
    x={labelX.toFixed(1)}
    y={(y - 5.5).toFixed(1)}
    text-anchor={labelAnchor}
    font-size={labelSize}
  >
    <tspan class="font-semibold">{sport.name}</tspan>
    <tspan
      class="fill-muted-ink"
      font-size={(labelSize * 0.88).toFixed(1)}
      dx="3"
    >
      {years}
    </tspan>
  </text>
{/snippet}

<!-- the whole chart, or only the part of it within one family line -->
{#snippet drawing(
  within: Set<string> | null,
)}
  <g fill="none">
    {#each [
      ...layout.branchEdges,
      ...layout.trunkEdges,
    ] as edge (`${edge.parent.id} ${edge.child.id}`)}
      {#if !within || (within.has(edge.parent.id) && within.has(edge.child.id))}
        <path
          d={edge.path}
          stroke={edge.color}
          stroke-width={edge.strokeWidth}
          stroke-dasharray={edge.dash}
          stroke-linecap={edge.roundCap ? "round" : undefined}
        >
          <title>{edge.tooltip}</title>
        </path>
      {/if}
    {/each}
  </g>
  <g stroke-width={lineWidth}>
    {#each layout.marks as { sport, y, startX, endX, color } (sport.id)}
      {#if !within || within.has(sport.id)}
        <g stroke={color}>
          <line
            x1={startX.toFixed(1)}
            x2={endX.toFixed(1)}
            y1={y.toFixed(1)}
            y2={y.toFixed(1)}
          />
          {#if sport.ended != null}
            <line
              x1={endX.toFixed(1)}
              x2={endX.toFixed(1)}
              y1={(y - 5).toFixed(1)}
              y2={(y + 5).toFixed(1)}
            />
          {/if}
        </g>
      {/if}
    {/each}
  </g>
  <!-- the buttons drawn over the chart already name each sport -->
  <g aria-hidden={onselect ? "true" : undefined}>
    {#each layout.marks as mark (mark.sport.id)}
      {#if !within || within.has(mark.sport.id)}
        {@render dotAndLabel(mark)}
      {/if}
    {/each}
  </g>
{/snippet}

<svg
  class="sticky top-0 z-1 block h-auto w-full overflow-visible border-b border-grid-ink bg-paper"
  viewBox="0 0 {width} {axisHeight}"
  style:aspect-ratio="{width} / {axisHeight}"
  aria-hidden="true"
>
  {#each layout.ticks as { year, x } (year)}
    <text
      class="fill-muted-ink text-[11.5px]"
      x={x.toFixed(1)}
      y="19"
      text-anchor="middle"
    >
      {year}
    </text>
  {/each}
</svg>
<!-- biome-ignore lint/a11y/noSvgWithoutTitle: a title would pop up as a tooltip over the whole chart, and the page heading already names it -->
<svg
  class="block h-auto w-full overflow-visible"
  viewBox="0 0 {width} {layout.height}"
  style:aspect-ratio="{width} / {layout.height}"
>
  <g aria-hidden="true">
    {#each layout.ticks as { year, x } (year)}
      <line
        class="stroke-grid-ink"
        x1={x.toFixed(1)}
        x2={x.toFixed(1)}
        y1="0"
        y2={gridBottom}
      />
      <text
        class="fill-muted-ink text-[11.5px]"
        x={x.toFixed(1)}
        y={layout.height - 4}
        text-anchor="middle"
      >
        {year}
      </text>
    {/each}
  </g>
  {#each layout.headings as { family, y } (family.id)}
    <rect
      x={marginLeft}
      y={y - 12.5}
      width="19"
      height="4.5"
      fill={family.color}
    />
    <text
      class="fill-ink text-[17px] font-bold tracking-[1.8px] uppercase"
      x={marginLeft + 27}
      y={y - 6}
    >
      {family.name}
    </text>
  {/each}
  <g
    class={[
      "transition-opacity duration-200 motion-reduce:transition-none",
      lineage && "opacity-20",
    ]}
  >
    {@render drawing(null)}
  </g>
  {#if topLineage}
    <g
      class={[
        "pointer-events-none",
        !lineage &&
          "invisible transition-[visibility] delay-200 duration-0 motion-reduce:transition-none",
      ]}
      aria-hidden="true"
    >
      {@render drawing(topLineage)}
    </g>
  {/if}
  {#if onselect}
    {#each layout.marks as { sport, y, startX, years, labelX, labelAnchor, labelWidth } (sport.id)}
      {@const labelLeft = labelAnchor === "end" ? labelX - labelWidth : labelX}
      {@const hitLeft = Math.min(startX - 8, labelLeft)}
      {@const hitRight = Math.max(startX + 8, labelLeft + labelWidth)}
      <!-- biome-ignore lint/a11y/useSemanticElements: SVG has no button element -->
      <rect
        class="cursor-pointer fill-transparent outline-none focus-visible:stroke-ink focus-visible:stroke-[1.5px]"
        id="sport-{sport.id}"
        x={hitLeft.toFixed(1)}
        y={(y - 17).toFixed(1)}
        width={(hitRight - hitLeft).toFixed(1)}
        height={rowHeight}
        rx="4"
        role="button"
        tabindex="0"
        aria-label="{sport.name}, {years}"
        aria-pressed={sport.id === selectedId}
        onclick={() => toggle(sport.id)}
        onkeydown={(event) => onkeydown(event, sport.id)}
        onpointerenter={() => (hoveredId = sport.id)}
        onpointerleave={() => (hoveredId = null)}
      />
    {/each}
  {/if}
</svg>
