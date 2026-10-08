<script lang="ts">
  import { sportById } from "./chart.ts";
  import SportCard from "./SportCard.svelte";
  import Tree from "./Tree.svelte";

  // unknown until the page is running in a browser
  let measuredWidth = $state<number>();
  let selectedId = $state<string | null>(null);
  let card = $state<HTMLElement>();

  const selected = $derived(selectedId ? sportById.get(selectedId) : undefined);

  // keep the picked sport clear of the year strip above and the summary below
  $effect(() => {
    const row = selectedId
      ? document.getElementById(`sport-${selectedId}`)
      : null;
    if (row && card) {
      const { top, bottom } = row.getBoundingClientRect();
      if (top < 40 || bottom > card.getBoundingClientRect().top - 12) {
        const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
        scrollBy({
          top: top - innerHeight * 0.25,
          behavior: calm ? "auto" : "smooth",
        });
      }
    }
  });

  /** Let Escape dismiss the summary. */
  function onkeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      selectedId = null;
    }
  }
</script>

<svelte:window {onkeydown} />

<div bind:clientWidth={measuredWidth}>
  {#if measuredWidth}
    <Tree
      width={measuredWidth}
      {selectedId}
      onselect={(id) => (selectedId = id)}
    />
  {:else}
    <!-- drawn ahead of time at two fixed widths; replaced once the real width is known -->
    <div class="md:hidden"><Tree width={380} /></div>
    <div class="hidden md:block"><Tree width={1200} /></div>
  {/if}
</div>
{#if selected}
  <div
    class="fixed right-4 bottom-4 z-2 w-[min(380px,calc(100vw-2rem))]"
    bind:this={card}
  >
    <SportCard
      sport={selected}
      onclose={() => (selectedId = null)}
      onselect={(id) => (selectedId = id)}
    />
  </div>
{/if}
