# DataTables Search Highlighter (Standalone)

Highlights the active DataTables search terms directly inside cell text (like browser-style selection), including Responsive child rows.

## Usage

Include the bundle:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@0.1.10/dist/datatables.searchHighlighter.min.css" />
<script src="https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@0.1.10/dist/datatables.searchHighlighter.min.js"></script>
```

Enable via DataTables options:

```js
$('#table').DataTable({
  searching: true,
  searchHighlighter: true
});
```

Or with configuration:

```js
$('#table').DataTable({
  searchHighlighter: {
    minLength: 1,
    caseSensitive: false,
    includeColumnSearch: true,
    tag: 'mark',
    className: 'hfx-dt-search-hit',
    // Optional: style hits inline (similar concept to ColumnHighlighter targets)
    hitStyle: {
      backgroundColor: 'rgba(255, 230, 170, 0.9)',
      textColor: '#000',
      css: {
        'border-radius': '3px',
        'padding': '0 2px'
      }
    },
    // Optional: set CSS variables on the table element (consumed by the default CSS)
    cssVars: {
      '--hfx-dt-search-hit-bg': 'rgba(180, 215, 255, 0.85)',
      '--hfx-dt-search-hit-color': '#000',
      '--hfx-dt-search-hit-radius': '2px'
    }
  }
});
```

## Options

- `enabled` (bool, default `true`)
- `minLength` (number, default `1`) — ignore very short terms if desired
- `caseSensitive` (bool, default `false`)
- `includeGlobalSearch` (bool, default `true`)
- `includeColumnSearch` (bool, default `true`)
- `tag` (`mark` | `span`, default `mark`)
- `className` (string, default `hfx-dt-search-hit`)
- `hitStyle` (object, optional) — inline styles for each hit:
  - `backgroundColor` (string)
  - `textColor` (string) (alias: `color`)
  - `css` (object) arbitrary CSS properties via `style.setProperty(...)` (supports kebab-case and CSS vars)
- `cssVars` (object, optional) — applied on the table element (keys must start with `--`)

## Styling

The default CSS uses:

- `--hfx-dt-search-hit-bg`
- `--hfx-dt-search-hit-color`
- `--hfx-dt-search-hit-radius`

Override them in your page/theme to match Tabler/Bootstrap/etc.
