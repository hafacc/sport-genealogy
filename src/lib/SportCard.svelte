<script lang="ts">
  import type { Sport } from "./chart.ts";
  import {
    colorOf,
    copy,
    dashOf,
    familyById,
    formatYears,
    lineWidth,
    sportById,
    wikipediaOf,
  } from "./chart.ts";

  interface Props {
    /** sport to summarize */
    sport: Sport;
    /** called to dismiss the summary */
    onclose: () => void;
    /** called with the id of a parent sport to show instead */
    onselect: (id: string) => void;
  }

  let { sport, onclose, onselect }: Props = $props();

  const family = $derived(familyById.get(sport.family));
  const wikipedia = $derived(wikipediaOf(sport));
  const parents = $derived(
    sport.parents.flatMap((ref) => {
      const parent = sportById.get(ref.id);
      return parent ? [{ ref, parent, ...dashOf(ref, false) }] : [];
    }),
  );

  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
</script>

<aside
  class="max-h-[60vh] overflow-y-auto border-[1.5px] border-t-[6px] border-ink border-t-(color:--family) bg-paper px-4.5 pt-4 pb-4.5 shadow-card"
  aria-live="polite"
  style:--family={family?.color}
>
  <header class="flex items-center justify-between gap-3">
    <p class="text-[0.72rem] font-bold tracking-[0.14em] uppercase">
      {family?.name}
    </p>
    <button
      class={[
        "-my-2 -mr-2.5 grid size-8 cursor-pointer place-items-center rounded-full",
        focusRing,
      ]}
      type="button"
      aria-label={copy.close}
      onclick={onclose}
    >
      <svg
        class="size-3.5 fill-none stroke-current stroke-2"
        viewBox="0 0 16 16"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M3,3 L13,13 M13,3 L3,13" />
      </svg>
    </button>
  </header>
  <h2 class="mt-2 text-2xl leading-[1.1] font-[1000] tracking-[-0.015em]">
    {sport.name}
  </h2>
  <p class="mt-0.5 text-[0.9rem] text-muted-ink">{formatYears(sport)}</p>
  {#if sport.note}
    <p class="mt-3 text-[0.94rem] leading-[1.45] first-letter:uppercase">
      {sport.note}
    </p>
  {/if}
  {#if parents.length > 0}
    <ul class="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5">
      {#each parents as { ref, parent, dash, roundCap } (ref.id)}
        <li>
          <button
            class={[
              "inline-flex cursor-pointer items-center gap-1.5 py-0.5 text-[0.86rem] font-semibold hover:underline",
              focusRing,
            ]}
            type="button"
            title={ref.note}
            onclick={() => onselect(parent.id)}
          >
            <svg class="h-2.5 w-[26px]" viewBox="0 0 26 10" aria-hidden="true">
              <line
                x1="1"
                x2="25"
                y1="5"
                y2="5"
                stroke={colorOf(parent)}
                stroke-width={ref.kind === "descent" ? lineWidth : 1.5}
                stroke-dasharray={dash}
                stroke-linecap={roundCap ? "round" : undefined}
              />
            </svg>
            {parent.name}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if wikipedia && copy.wikipedia}
    <a
      class={[
        "mt-3.5 inline-block text-[0.94rem] font-bold underline decoration-2 underline-offset-4 hover:decoration-(color:--family)",
        focusRing,
      ]}
      href={wikipedia}
      target="_blank"
      rel="noopener"
    >
      {copy.wikipedia}
      <span aria-hidden="true">→</span>
    </a>
  {/if}
</aside>
