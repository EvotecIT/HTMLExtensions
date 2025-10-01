# Contributing to HTMLExtensions

Thanks for improving HTMLExtensions. This repo ships small client‑side helpers (DataTables, ApexCharts, etc.).

## Project Layout

- `sources/<category>/<plugin>/` — Author your source files here (JS/CSS). Do not include license/version headers.
- `sources/<category>/<plugin>/bundle.json` — Optional build manifest (see below).
- `dist/` — Auto‑generated build artifacts with versioned headers. Never edit by hand.
- `scripts/build.js` — Build script (Node.js). Handles banner injection, bundling, minify, and validation.

## Authoring a Plugin

1) Create a folder under `sources/<category>/<plugin>/` and add your JS and/or CSS files.

2) (Optional) Add `bundle.json` to control output name and file order:

```
{
  "name": "datatables.columnHighlighter",
  "js": ["datatables.columnHighlighter.js"],
  "css": []
}
```

- `name` sets the output base file name: `dist/<name>.js`, `dist/<name>.min.js` (and `.css` if any).
- If `bundle.json` is omitted, the build script will bundle all `.js` and `.css` in alphanumeric order and use `<category>.<plugin>` as the base name.

3) Keep source files header‑free. The build injects a header with:
- Package version (from `package.json`)
- Copyright: `© 2011–<year> Przemyslaw Klys @ Evotec`
- License: MIT
- Build timestamp

## Build Locally

From `Ignore/HtmlExtensions`:

```
npm ci
npm run format
npm run build
```

Outputs go to `dist/` and include both readable and minified files.

## Publishing

Publishing is automated via GitHub Actions:

- Push a tag `vX.Y.Z` to trigger CI publish, or run the workflow manually with the version input.
- Set `NPM_TOKEN` as a repository secret with publish access.

The workflow:

1) Optionally syncs `package.json` version from the tag or input.
2) Runs `npm run format` and `npm run build`.
3) Publishes `dist/` to npm with the banner injected.

## Coding Style

- Use Prettier (`npm run format`). See `.prettierrc.json`.
- Keep changes minimal and focused; avoid adding heavy dependencies.
- Prefer small, composable utilities over monoliths.

## Versioning

- Bump `package.json` before tagging (or let the workflow set it using the tag).
- The banner must match the package version; the build script validates this.

## Questions

Open an issue or ping @PrzemyslawKlys.
