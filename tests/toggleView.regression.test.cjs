const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const runFile = promisify(execFile);
const browserProject = path.join(__dirname, 'browser', 'HTMLExtensions.Browser.csproj');

const distRoot = path.join(__dirname, '..', 'dist');
const toggleViewScriptPath = path.join(distRoot, 'datatables.toggleView.js');

function createFixtureHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>toggleView regression</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
    <script src="/dist/datatables.toggleView.js"></script>
  </head>
  <body>
    <table id="tblToggleRegression" style="width: 100%"></table>
    <script>
      window.__toggleMetrics = {
        selectedRowsCalls: 0,
        selectedColumnsCalls: 0,
        selectedCellsCalls: 0,
        toolbarApplyCalls: [],
        initialMode: null,
        afterFirstMode: null,
        afterSecondMode: null,
        searchAfterFirst: null,
        searchAfterSecond: null,
        columnSearchAfterFirst: null,
        columnSearchAfterSecond: null,
        orderAfterFirst: null,
        orderAfterSecond: null,
        toolbarStateAfterFirst: null,
        toolbarStateAfterSecond: null,
        hasSelectExtension: null,
        error: null,
        done: false
      };

      (function () {
        var targetTableId = 'tblToggleRegression';
        var apiPrototype = $.fn.dataTable.Api.prototype;

        function instrument(methodName, metricName) {
          var original = apiPrototype[methodName];
          if (!original || original.__hfxToggleRegressionWrapped) return;

          var wrapped = function () {
            try {
              var modifier = arguments[0];
              var touchesSelection = modifier && typeof modifier === 'object' && modifier.selected === true;
              var isTargetTable =
                this &&
                Array.isArray(this.context) &&
                this.context.some(function (context) {
                  return context && context.nTable && context.nTable.id === targetTableId;
                });

              if (touchesSelection && isTargetTable) {
                window.__toggleMetrics[metricName] += 1;
              }
            } catch (_) {}

            return original.apply(this, arguments);
          };

          wrapped.__hfxToggleRegressionWrapped = true;
          apiPrototype[methodName] = wrapped;
        }

        instrument('rows', 'selectedRowsCalls');
        instrument('columns', 'selectedColumnsCalls');
        instrument('cells', 'selectedCellsCalls');
      })();

      $(function () {
        try {
          window.hfxDt = {
            applyViewportAndToolbar: function (api, buttonsAlign, filterAlign, density) {
              var snapshot = {
                buttonsAlign: buttonsAlign || null,
                filterAlign: filterAlign || null,
                density: density || null
              };

              window.__toggleMetrics.toolbarApplyCalls.push(snapshot);

              try {
                var $wrap = $(api.table().container());
                var $table = $(api.table().node());
                $wrap.attr('data-hfx-toolbar-buttons-align', snapshot.buttonsAlign || '');
                $wrap.attr('data-hfx-toolbar-filter-align', snapshot.filterAlign || '');
                $wrap.attr('data-hfx-toolbar-density', snapshot.density || '');
                $table.attr('data-hfx-toolbar-buttons-align', snapshot.buttonsAlign || '');
                $table.attr('data-hfx-toolbar-filter-align', snapshot.filterAlign || '');
                $table.attr('data-hfx-toolbar-density', snapshot.density || '');
              } catch (_) {}
            }
          };

          var rows = [];
          for (var index = 0; index < 600; index++) {
            rows.push({
              Server: 'srv-' + index,
              Domain: index % 2 === 0 ? 'ad.evotec.xyz' : 'example.local',
              Site: index % 3 === 0 ? 'Warsaw' : 'Berlin',
              Score: index,
              Status: index % 5 === 0 ? 'Degraded' : 'Healthy'
            });
          }

          var api = $('#tblToggleRegression').DataTable({
            data: rows,
            columns: [
              { data: 'Server', title: 'Server' },
              { data: 'Domain', title: 'Domain' },
              { data: 'Site', title: 'Site' },
              { data: 'Score', title: 'Score' },
              { data: 'Status', title: 'Status' }
            ],
            paging: true,
            pageLength: 25,
            autoWidth: true,
            responsive: false,
            scrollX: '100%'
          });

          window.__toggleMetrics.initialMode = window.hfxToggleViewMode(api, api.init());

          var $initialWrap = $(api.table().container());
          var $initialTable = $(api.table().node());
          $initialWrap.attr('data-hfx-toolbar-buttons-align', 'Left');
          $initialWrap.attr('data-hfx-toolbar-filter-align', 'Right');
          $initialWrap.attr('data-hfx-toolbar-density', 'Dense');
          $initialTable.attr('data-hfx-toolbar-buttons-align', 'Left');
          $initialTable.attr('data-hfx-toolbar-filter-align', 'Right');
          $initialTable.attr('data-hfx-toolbar-density', 'Dense');

          api.search('srv-1');
          api.column(2).search('Berlin');
          api.order([[3, 'desc']]).draw();

          var firstToggle = window.hfxToggleView(api);
          window.__toggleMetrics.afterFirstMode = window.hfxToggleViewMode(firstToggle, firstToggle.init());
          window.__toggleMetrics.searchAfterFirst = firstToggle.search();
          window.__toggleMetrics.columnSearchAfterFirst = firstToggle.column(2).search();
          window.__toggleMetrics.orderAfterFirst = firstToggle.order();
          window.__toggleMetrics.toolbarStateAfterFirst = {
            buttonsAlign: $(firstToggle.table().container()).attr('data-hfx-toolbar-buttons-align') || null,
            filterAlign: $(firstToggle.table().container()).attr('data-hfx-toolbar-filter-align') || null,
            density: $(firstToggle.table().container()).attr('data-hfx-toolbar-density') || null
          };

          var secondToggle = window.hfxToggleView(firstToggle);
          window.__toggleMetrics.afterSecondMode = window.hfxToggleViewMode(secondToggle, secondToggle.init());
          window.__toggleMetrics.searchAfterSecond = secondToggle.search();
          window.__toggleMetrics.columnSearchAfterSecond = secondToggle.column(2).search();
          window.__toggleMetrics.orderAfterSecond = secondToggle.order();
          window.__toggleMetrics.toolbarStateAfterSecond = {
            buttonsAlign: $(secondToggle.table().container()).attr('data-hfx-toolbar-buttons-align') || null,
            filterAlign: $(secondToggle.table().container()).attr('data-hfx-toolbar-filter-align') || null,
            density: $(secondToggle.table().container()).attr('data-hfx-toolbar-density') || null
          };
          window.__toggleMetrics.hasSelectExtension = !!(
            secondToggle.settings &&
            secondToggle.settings()[0] &&
            secondToggle.settings()[0]._select
          );
        } catch (error) {
          window.__toggleMetrics.error = String((error && error.stack) || error);
        } finally {
          window.__toggleMetrics.done = true;
        }
      });
    </script>
  </body>
</html>`;
}

async function startServer() {
  const fixtureHtml = createFixtureHtml();

  const server = http.createServer(async (request, response) => {
    try {
      if (!request.url || request.url === '/' || request.url === '/toggleView-regression.html') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(fixtureHtml);
        return;
      }

      if (request.url === '/dist/datatables.toggleView.js') {
        const content = await fs.readFile(toggleViewScriptPath, 'utf8');
        response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        response.end(content);
        return;
      }

      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      })
  };
}

for (const [width, height] of [[1280, 800], [390, 640]]) {
  test(`toggleView skips selection preservation work for non-select tables at ${width}x${height}`, async () => {
    const server = await startServer();

    try {
      const { stdout } = await runFile('dotnet', [
        'run', '--project', browserProject, '--configuration', 'Release', '--verbosity', 'quiet', '--',
        `${server.baseUrl}/toggleView-regression.html`, String(width), String(height)
      ], {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024
      });
      const resultLine = stdout.split(/\r?\n/).find(line => line.startsWith('HTMLEXTENSIONS_RESULT:'));
      assert.ok(resultLine, `Browser runner did not return metrics: ${stdout}`);
      const { metrics, pageErrors, consoleErrors } = JSON.parse(resultLine.slice('HTMLEXTENSIONS_RESULT:'.length));

      assert.equal(metrics.error, null);
      assert.equal(metrics.hasSelectExtension, false);

      assert.equal(metrics.initialMode, 'ScrollX');
      assert.equal(metrics.afterFirstMode, 'Responsive');
      assert.equal(metrics.afterSecondMode, 'ScrollX');

      assert.equal(metrics.searchAfterFirst, 'srv-1');
      assert.equal(metrics.searchAfterSecond, 'srv-1');
      assert.equal(metrics.columnSearchAfterFirst, 'Berlin');
      assert.equal(metrics.columnSearchAfterSecond, 'Berlin');
      assert.deepEqual(metrics.orderAfterFirst, [[3, 'desc']]);
      assert.deepEqual(metrics.orderAfterSecond, [[3, 'desc']]);

      assert.equal(metrics.selectedRowsCalls, 0);
      assert.equal(metrics.selectedColumnsCalls, 0);
      assert.equal(metrics.selectedCellsCalls, 0);
      assert.deepEqual(metrics.toolbarApplyCalls, [
        { buttonsAlign: 'Left', filterAlign: 'Right', density: 'Dense' },
        { buttonsAlign: 'Left', filterAlign: 'Right', density: 'Dense' }
      ]);
      assert.deepEqual(metrics.toolbarStateAfterFirst, {
        buttonsAlign: 'Left',
        filterAlign: 'Right',
        density: 'Dense'
      });
      assert.deepEqual(metrics.toolbarStateAfterSecond, {
        buttonsAlign: 'Left',
        filterAlign: 'Right',
        density: 'Dense'
      });

      assert.deepEqual(pageErrors, []);
      assert.deepEqual(consoleErrors, []);
    } finally {
      await server.close();
    }
  });
}
