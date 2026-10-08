<script lang="ts">
  import { legendEntries, legendSwatch } from "./chart.ts";
</script>

<ul class="flex flex-wrap gap-x-7 gap-y-1 text-[0.92rem] lg:flex-col">
  {#each legendEntries() as { key, text, mark } (key)}
    <li class="flex items-center gap-3">
      <svg
        class="h-[21px] w-[52px] flex-none overflow-visible"
        viewBox="0 -14 {legendSwatch} 28"
        aria-hidden="true"
      >
        <!-- markup is built in chart.ts, not user input -->
        {@html mark}
      </svg>
      {text}
    </li>
  {/each}
</ul>
