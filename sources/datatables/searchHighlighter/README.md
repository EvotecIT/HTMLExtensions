# DataTables Search Highlighter (Standalone)

Highlights the active DataTables search terms directly inside cell text (like browser-style selection), including Responsive child rows.

## Usage

Include the bundle:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@0.1.17/dist/datatables.searchHighlighter.min.css" />
<script src="https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@0.1.17/dist/datatables.searchHighlighter.min.js"></script>
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
    // Optional: style global search hits differently from column-filter hits
    globalHitStyle: {
      backgroundColor: '#dbeafe',
      textColor: '#1e3a8a'
    },
    columnHitStyle: {
      backgroundColor: '#fef3c7',
      textColor: '#92400e'
    },
    // Optional: reusable palette by column position
    columnHitStylePalette: [
      { backgroundColor: '#fef3c7', textColor: '#92400e' }, // 1st column filter
      { backgroundColor: '#dbeafe', textColor: '#1e3a8a' }, // 2nd column filter
      { backgroundColor: '#dcfce7', textColor: '#166534' }  // 3rd column filter
    ],
    // Optional: per-column override map for filter hits
    columnHitStyles: {
      Status: {
        backgroundColor: '#dcfce7',
        textColor: '#166534'
      },
      0: {
        backgroundColor: '#fee2e2',
        textColor: '#b91c1c'
      }
    },
    // Optional: set CSS variables on the table element (consumed by the default CSS)
    cssVars: {
      '--hfx-dt-search-hit-bg': 'rgba(180, 215, 255, 0.85)',
      '--hfx-dt-search-hit-color': '#000',
      '--hfx-dt-search-hit-radius': '2px',
      '--hfx-dt-search-hit-global-bg': '#dbeafe',
      '--hfx-dt-search-hit-global-color': '#1e3a8a',
      '--hfx-dt-search-hit-column-bg': '#fef3c7',
      '--hfx-dt-search-hit-column-color': '#92400e'
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
- `globalHitStyle` (object, optional) — inline styles for hits produced by the global search box
- `columnHitStyle` (object, optional) — inline styles for hits produced by per-column filters
- `columnHitStyles` (object, optional) — per-column override map for filter hits; keys can be header text (`"Status"`), zero-based column indexes (`"0"`), DataTables column names, header ids, or `data-column-id` values
- `columnHitStylePalette` (array, optional) — reusable filter-hit palette applied by column index; specific `columnHitStyles` entries override the palette
- `cssVars` (object, optional) — applied on the table element (keys must start with `--`)

## Styling

The default CSS uses:

- `--hfx-dt-search-hit-bg`
- `--hfx-dt-search-hit-color`
- `--hfx-dt-search-hit-radius`
- `--hfx-dt-search-hit-global-bg`
- `--hfx-dt-search-hit-global-color`
- `--hfx-dt-search-hit-column-bg`
- `--hfx-dt-search-hit-column-color`

Override them in your page/theme to match Tabler/Bootstrap/etc.
