<script lang="ts">
  import Chart from "#lib/Chart.svelte";
  import { copy } from "#lib/chart.ts";
  import Legend from "#lib/Legend.svelte";

  const posterUrl = `https://github.com/${__REPOSITORY__}/releases/latest/download/sport-genealogy-poster.pdf`;
</script>

<svelte:head>
  <title>{copy.title}</title>
  <meta property="og:title" content={copy.title}>
  {#if copy.description}
    <meta name="description" content={copy.description}>
    <meta property="og:description" content={copy.description}>
  {/if}
</svelte:head>

<main class="mx-auto max-w-[1500px] px-[clamp(14px,3.5vw,56px)] pb-12">
  <header
    class="grid gap-4.5 pt-4.5 pb-7.5 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-x-12 lg:pt-7 lg:pb-11"
  >
    {#if copy.download}
      <a
        class="inline-flex items-center gap-2 justify-self-end border-[1.5px] border-ink px-3.5 py-2.25 text-[0.94rem] font-bold transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink motion-reduce:transition-none lg:col-start-2 lg:row-start-1"
        href={posterUrl}
      >
        <svg
          class="size-[15px] fill-none stroke-current stroke-2"
          viewBox="0 0 16 16"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8,2 L8,11 M4,7.5 L8,11.5 L12,7.5 M3,14 L13,14" />
        </svg>
        {copy.download}
      </a>
    {/if}
    <!-- past Avenir Next's heaviest weight, so Nunito Sans uses its own heaviest too -->
    <h1
      class="text-[clamp(2.9rem,12.5vw,7rem)] leading-[0.92] font-[1000] tracking-[-0.02em] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center"
    >
      {copy.title}
    </h1>
    <div class="lg:col-start-2 lg:row-start-2"><Legend /></div>
  </header>
  <Chart />
</main>
