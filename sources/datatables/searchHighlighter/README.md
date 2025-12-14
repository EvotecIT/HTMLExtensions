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
    className: 'hfx-dt-search-hit'
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

## Styling

The default CSS uses:

- `--hfx-dt-search-hit-bg`
- `--hfx-dt-search-hit-color`
- `--hfx-dt-search-hit-radius`

Override them in your page/theme to match Tabler/Bootstrap/etc.
