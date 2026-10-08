# Sport Genealogy

A family tree of ball sports: which game came from which, and when. It is drawn
two ways from the same data — a site where each sport can be clicked for a short
history, and a 24 × 36 inch poster.

```sh
bun install
bun dev         # preview the site at http://localhost:5173
bun run build   # write the static site to build/
bun lint        # type-check and lint
bun fmt         # format
bun run poster  # render poster.pdf; needs librsvg and macOS for Avenir Next
```

## Layout

- `src/lib/sports.json` — the sports, their parents, sources and all displayed wording
- `src/lib/chart.ts` — lays the tree out at any size; shared by the site and the poster
- `src/lib/*.svelte`, `src/routes` — the site, built with SvelteKit and Svelte 5
- `src/poster.ts` — prints the poster as SVG

## Publishing

Both are run by hand from the Actions tab:

- **deploy** builds the site and publishes it to GitHub Pages. In the repository
  settings, Pages must have its source set to **GitHub Actions**.
- **poster** renders the PDF and attaches it to a new release. The site's download
  link always points at the latest release.
