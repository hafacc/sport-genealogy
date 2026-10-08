<script lang="ts">
  import type { Snippet } from "svelte";
  import "@fontsource-variable/nunito-sans";
  import "../app.css";

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
