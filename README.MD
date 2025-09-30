DataTables Column Highlighter (Standalone)

A reusable JavaScript extension for DataTables that highlights specific columns in visible rows and responsive child rows based on declarative conditions.

## Features

- Declarative config via DataTables options: `columnHighlighter.rules`
- Supports HTML-backed tables and JavaScript-backed tables (auto-detected)
- Target columns by header name or index; per-target styles
- Condition groups with `AND`/`OR`/`NONE` logic and robust operators
- Applies to visible cells on init/draw and to responsive child rows on expand

## Quick Start

1) Include scripts (jQuery, DataTables, Responsive optional, this plugin):

```html
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.5/css/jquery.dataTables.min.css" />
<link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.dataTables.min.css" />
<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.0/dist/jquery.min.js"></script>
<script src="https://cdn.datatables.net/1.13.5/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@0.1.1/dist/datatables.columnHighlighter.js"></script>
<!-- Or auto-minified: -->
<!-- <script src="https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@0.1.1/dist/datatables.columnHighlighter.min.js"></script> -->
```

2) Initialize your DataTable with a `columnHighlighter` block:

```js
$('#myTable').DataTable({
  responsive: { details: { type: 'inline' } },
  columnHighlighter: {
    rules: [
      {
        conditionsContainer: [
          {
            logic: 'AND',
            conditions: [
              { columnName: 'Name', operator: 'eq', type: 'string', value: '1Password' },
              { columnName: 'NPM',  operator: 'eq', type: 'number', value: 17984 }
            ]
          }
        ],
        targets: [
          { column: 'Name', css: { 'background-color': '#fa8072', color: '#000' } },
          { column: 'NPM',  css: { 'background-color': '#fa8072', color: '#000' } }
        ]
      }
    ]
  }
});
```

## Condition Schema

Each condition supports:

- `columnName` or `columnId`: pick either; the other is auto-filled
- `operator`: `eq`, `ne`, `gt`, `lt`, `le`, `ge`, `in`, `notin`, `contains`, `notcontains`, `like`, `notlike`, `between`, `betweenInclusive`
- `type`: `string`, `number`, `bool`, `date`
- `value`: scalar or array; for `date` use `valueDate`
- `valueDate`: `{ year, month, day, hours, minutes, seconds }` or array of those
- `caseSensitive`: `true/false` (for `string`)
- `dateTimeFormat`: string used by `moment` (if included) for date parsing
- `reverseCondition`: swap left/right for comparisons

Group multiple conditions using `conditionsContainer` blocks with `logic` set to `AND`, `OR`, or `NONE`.

## Targets Schema

Each rule has `targets`: an array of columns to style. Each target:

- `column`: header name (string) or index (number)
- `backgroundColor` / `textColor` or a full `css` object
- `highlightParent`: also colors the parent element in child rows

## Imperative API (optional)

If you prefer to attach rules in code instead of options:

- `setupColumnHighlighting(tableId, rules, table)`
- `setupChildRowConditionalFormatting(tableId, conditionsContainer, highlightColumn, css, failCss, table)`

## Examples

- `final-html-simple.html` — HTML table, simple rule
- `final-html-and.html` — HTML table, AND group
- `final-html-advanced.html` — HTML table, responsive demo with multiple rules, fail targets, styles
- `final-js-simple.html` — JavaScript data, simple rule
- `final-js-and.html` — JavaScript data, AND group
- `final-js-advanced.html` — JavaScript data, responsive demo with multiple rules, fail targets, styles
- `examples/datatables-bootstrap-striped-responsive.html` — Bootstrap `table-striped` + Responsive; shows consistent per-cell highlights

### Bootstrap 5.3 striped tables

Bootstrap 5.3 renders zebra striping and hover states using a full-cell `box-shadow` overlay driven by CSS variables (for example, `--bs-table-accent-bg`). If you only set `background-color` on a cell, that overlay can tint your highlight on odd rows, making it look uneven.

When a `backgroundColor` is provided, the Column Highlighter now:

- sets `--bs-table-accent-bg: transparent` on the target cell, and
- paints an inset `box-shadow` with your color (`inset 0 0 0 9999px <color>`),

so highlights look identical on striped and non-striped rows. Any custom `css` you pass still applies last and can override these (for example `{ 'box-shadow': 'none' }`).
