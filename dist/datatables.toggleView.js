/*!
 HTMLExtensions v0.1.14 — DataTables ColumnHighlighter & ToggleView
 (c) 2011–2026 Przemyslaw Klys @ Evotec
 https://htmlextensions.evotec.xyz | MIT License | Build: 2026-03-11T10:27:09.365Z
*/

(function (global) {
  if (global.hfxToggleView) return;

  function deepClone(obj) {
    var $ = global.jQuery || global.$;
    if ($ && $.extend) return $.extend(true, Array.isArray(obj) ? [] : {}, obj);
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  function labelForMode(mode) {
    return mode === 'ScrollX' ? 'Switch to Responsive' : 'Switch to ScrollX';
  }

  function hasScrollWrapper(api) {
    try {
      var $ = global.jQuery || global.$;
      if (!$ || !api || !api.table) return false;
      var table = api.table().node();
      if (!table) return false;
      return $(table).closest('div.dt-scroll-body,div.dataTables_scrollBody').length > 0;
    } catch (_) {
      return false;
    }
  }

  function resolveResponsiveConfig(init, settings) {
    if (init && init.responsiveConfig && typeof init.responsiveConfig === 'object')
      return init.responsiveConfig;
    if (init && init.responsive && typeof init.responsive === 'object') return init.responsive;
    try {
      var oInit = settings && settings.oInit ? settings.oInit : null;
      if (oInit && oInit.responsive && typeof oInit.responsive === 'object')
        return deepClone(oInit.responsive);
    } catch (_) {}
    return { details: { type: 'inline' } };
  }

  function detectMode(api, initFallback) {
    try {
      var st = api.settings ? api.settings()[0] : null;
      var scrollInit = !!(st && st.oInit && st.oInit.scrollX === true);
      var responsiveConfigured = !!(st && st.oInit && st.oInit.responsive && st.oInit.responsive !== false);
      if (hasScrollWrapper(api)) return 'ScrollX';
      if (scrollInit && !responsiveConfigured) return 'ScrollX';
      if (responsiveConfigured) return 'Responsive';
      if (initFallback && initFallback.scrollX === true) return 'ScrollX';
      return 'Responsive';
    } catch (_) {
      return initFallback && initFallback.scrollX === true ? 'ScrollX' : 'Responsive';
    }
  }

  function rebindHighlighter(tableId, api) {
    try {
      var CH = global.DataTablesColumnHighlighter;
      if (!CH || !CH.configurations) return;
      var cfg = CH.configurations[tableId];
      if (!cfg) return;
      cfg.table = api;
      if (CH.setupEventHandlers) CH.setupEventHandlers(tableId, api);
      setTimeout(function () {
        try {
          api.rows({ page: 'current' }).every(function () {
            var tr = this.node();
            CH.applyHighlighting(tableId, (global.jQuery || global.$)(tr), this.data());
          });
        } catch (_) {}
      }, 0);
    } catch (_) {}
  }

  function preserveState(api) {
    var state = {};
    try {
      var info = api.page && api.page.info ? api.page.info() : null;
      var dtState = api.state && typeof api.state === 'function' ? api.state() : null;
      state.page = api.page();
      state.pageLen = api.page && api.page.len ? api.page.len() : null;
      state.start = info && typeof info.start === 'number' ? info.start : null;
      state.order = api.order();
      state.search = api.search();
      state.dataTablesState = dtState ? deepClone(dtState) : null;
      state.colSearch = [];
      state.colVisible = [];
      api.columns().every(function (idx) {
        state.colSearch[idx] = this.search();
        state.colVisible[idx] = this.visible();
      });
      try {
        state.selectedRowIds =
          api.rows && api.rows({ selected: true }).ids
            ? deepClone(api.rows({ selected: true }).ids().toArray())
            : [];
      } catch (_) {
        state.selectedRowIds = [];
      }
      try {
        state.selectedRows = api.rows ? deepClone(api.rows({ selected: true }).indexes().toArray()) : [];
      } catch (_) {
        state.selectedRows = [];
      }
      try {
        state.selectedColumns = api.columns
          ? deepClone(api.columns({ selected: true }).indexes().toArray())
          : [];
      } catch (_) {
        state.selectedColumns = [];
      }
      try {
        state.selectedCells = api.cells ? deepClone(api.cells({ selected: true }).indexes().toArray()) : [];
      } catch (_) {
        state.selectedCells = [];
      }
      try {
        state.colReorder = deepClone(
          api.colReorder && typeof api.colReorder.order === 'function' ? api.colReorder.order() : null
        );
      } catch (_) {
        state.colReorder = null;
      }
      try {
        state.searchBuilder = deepClone(
          api.searchBuilder && typeof api.searchBuilder.getDetails === 'function'
            ? api.searchBuilder.getDetails()
            : null
        );
      } catch (_) {
        state.searchBuilder = null;
      }
      try {
        var st = api.settings ? api.settings()[0] : null;
        var sp = st && st._searchPanes ? st._searchPanes : null;
        if (sp && sp.s) {
          state.searchPanes = {
            selectionList: deepClone(sp.s.selectionList || []),
            panes: Array.isArray(sp.s.panes)
              ? sp.s.panes
                  .filter(function (pane) {
                    return !!(pane && pane.s);
                  })
                  .map(function (pane) {
                    return {
                      id: pane.s.index,
                      searchTerm:
                        pane.dom && pane.dom.searchBox && pane.dom.searchBox.val
                          ? pane.dom.searchBox.val()
                          : '',
                      order:
                        pane.s.dtPane && typeof pane.s.dtPane.order === 'function'
                          ? deepClone(pane.s.dtPane.order())
                          : null,
                    };
                  })
              : [],
          };
        } else {
          state.searchPanes = dtState && dtState.searchPanes ? deepClone(dtState.searchPanes) : null;
        }
      } catch (_) {
        state.searchPanes = dtState && dtState.searchPanes ? deepClone(dtState.searchPanes) : null;
      }
    } catch (_) {}
    return state;
  }

  function restoreExtensionState(api, state) {
    try {
      if (!state) return;
      if (
        Array.isArray(state.colReorder) &&
        api.colReorder &&
        typeof api.colReorder.order === 'function'
      ) {
        api.colReorder.order(state.colReorder, true);
      }
    } catch (_) {}

    try {
      if (
        state.searchBuilder &&
        typeof state.searchBuilder === 'object' &&
        Object.keys(state.searchBuilder).length > 0 &&
        api.searchBuilder &&
        typeof api.searchBuilder.rebuild === 'function'
      ) {
        api.searchBuilder.rebuild(state.searchBuilder);
      }
    } catch (_) {}

    try {
      var selectedRowIds = Array.isArray(state.selectedRowIds)
        ? state.selectedRowIds.filter(function (id) {
            return !!id && id !== '#undefined' && id !== 'undefined';
          })
        : [];

      if (selectedRowIds.length > 0 && api.rows && api.rows(selectedRowIds).select) {
        api.rows(selectedRowIds).select();
      } else if (Array.isArray(state.selectedRows) && state.selectedRows.length > 0 && api.rows) {
        api.rows(state.selectedRows).select();
      }
    } catch (_) {}

    try {
      if (Array.isArray(state.selectedColumns) && state.selectedColumns.length > 0 && api.columns) {
        api.columns(state.selectedColumns).select();
      }
    } catch (_) {}

    try {
      if (Array.isArray(state.selectedCells) && state.selectedCells.length > 0 && api.cells) {
        api.cells(state.selectedCells).select();
      }
    } catch (_) {}
  }

  function restoreSearchPanesState(api, searchPanesState, attempt) {
    try {
      if (!searchPanesState || !api.settings) return;

      var st = api.settings()[0];
      var sp = st && st._searchPanes ? st._searchPanes : null;
      var panesReady =
        sp &&
        sp.s &&
        Array.isArray(sp.s.panes) &&
        sp.s.panes.some(function (pane) {
          return !!(pane && pane.s && pane.s.dtPane);
        });

      if (!panesReady) {
        if ((attempt || 0) < 5) {
          setTimeout(function () {
            restoreSearchPanesState(api, searchPanesState, (attempt || 0) + 1);
          }, 100);
        }
        return;
      }

      if (sp.clearSelections) sp.clearSelections();
      sp.s = sp.s || {};
      sp.s.selectionList = Array.isArray(searchPanesState.selectionList)
        ? deepClone(searchPanesState.selectionList)
        : [];

      if (Array.isArray(searchPanesState.panes) && Array.isArray(sp.s.panes)) {
        searchPanesState.panes.forEach(function (paneState) {
          sp.s.panes.forEach(function (pane) {
            if (!pane || paneState.id !== pane.s.index || !pane.s.dtPane) return;
            try {
              if (pane.dom && pane.dom.searchBox && typeof paneState.searchTerm === 'string') {
                pane.dom.searchBox.val(paneState.searchTerm);
              }
            } catch (_) {}
            try {
              if (Array.isArray(paneState.order)) pane.s.dtPane.order(paneState.order);
            } catch (_) {}
          });
        });
      }

      if (sp._makeSelections) sp._makeSelections(sp.s.selectionList);
    } catch (_) {}
  }

  function restoreState(api, state) {
    try {
      if (!state) return;
      if (Array.isArray(state.colVisible))
        state.colVisible.forEach(function (v, i) {
          api.column(i).visible(v, false);
        });
      if (typeof state.search === 'string') api.search(state.search, false, false);
      if (Array.isArray(state.colSearch))
        state.colSearch.forEach(function (v, i) {
          if (typeof v === 'string') api.column(i).search(v, false, false);
        });
      if (Array.isArray(state.order)) api.order(state.order);
      if (typeof state.pageLen === 'number' && api.page && api.page.len) api.page.len(state.pageLen);
      if (typeof state.start === 'number' && typeof state.pageLen === 'number' && state.pageLen > 0) {
        api.page(Math.floor(state.start / state.pageLen));
      } else if (typeof state.page === 'number') {
        api.page(state.page);
      }
      restoreExtensionState(api, state);
      api.columns.adjust().draw(false);
      if (state.searchPanes) restoreSearchPanesState(api, state.searchPanes, 0);
    } catch (_) {}
  }

  function updateToggleButtonLabel(api) {
    try {
      var mode = detectMode(api, api && api.init ? api.init() : null);
      if (api.button) api.button('.buttons-toggle-view').text(labelForMode(mode));
    } catch (_) {}
  }

  function toggle(api) {
    var $ = global.jQuery || global.$;
    if (!$) return;

    var table = api.table().node();
    var id = table && table.id ? table.id : null;
    var init = deepClone(api.init ? api.init() : {});
    var st = api.settings ? api.settings()[0] : null;
    var modeBefore = detectMode(api, init);
    var state = preserveState(api);
    var responsiveCfg = resolveResponsiveConfig(init, st);

    api.destroy();

    if (modeBefore === 'Responsive') {
      init.responsiveConfig = responsiveCfg;
      init.responsive = false;
      init.scrollX = true;
      init.autoWidth = true;
    } else {
      init.scrollX = false;
      init.autoWidth = false;
      init.responsive = responsiveCfg || { details: { type: 'inline' } };
    }

    var newApi = $(table).DataTable(init);
    var modeAfter = detectMode(newApi, init);

    try {
      if (id) localStorage.setItem('hfx:dt:' + id + ':mode', modeAfter);
    } catch (_) {}

    if (id) rebindHighlighter(id, newApi);
    restoreState(newApi, state);

    try {
      if (global.hfxDt) global.hfxDt.applyViewportAndToolbar(newApi);
    } catch (_) {}
    updateToggleButtonLabel(newApi);

    return newApi;
  }

  global.hfxToggleViewMode = detectMode;
  global.hfxToggleViewLabel = labelForMode;
  global.hfxToggleView = toggle;

  try {
    var $ = global.jQuery || global.$;
    if ($ && $.fn && $.fn.on) {
      $(function () {
        $('body').on('click', '[data-hfx-toggle]', function () {
          try {
            var sel = $(this).attr('data-hfx-toggle');
            if (!sel) return;
            var api = $(sel).DataTable();
            if (!api) return;
            var newApi = toggle(api) || api;
            var mode = detectMode(newApi, newApi && newApi.init ? newApi.init() : null);
            $(this).text(labelForMode(mode));
          } catch (_) {}
        });
      });
    }
  } catch (_) {}
})(window);

// DataTables Buttons integration (UMD-friendly): register 'toggleView' when Buttons is present.
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery', 'datatables.net', 'datatables.net-buttons'], function ($) {
      return factory($, window, document);
    });
  } else if (typeof exports === 'object') {
    module.exports = function (root, $) {
      root = root || window;
      $ = $ || require('jquery')(root);
      if (!$.fn.dataTable) {
        require('datatables.net')(root, $);
      }
      if (!$.fn.dataTable.Buttons) {
        require('datatables.net-buttons')(root, $);
      }
      return factory($, root, root.document);
    };
  } else {
    factory(jQuery, window, document);
  }
})(function ($, window) {
  'use strict';

  var DataTable = $.fn.dataTable;
  if (!DataTable || !DataTable.ext || !DataTable.ext.buttons) return;

  var def = {
    className: 'buttons-toggle-view',
    text: function (dt) {
      try {
        var mode = window.hfxToggleViewMode
          ? window.hfxToggleViewMode(dt, dt.init ? dt.init() : null)
          : 'Responsive';
        return window.hfxToggleViewLabel ? window.hfxToggleViewLabel(mode) : 'Switch View';
      } catch (_) {
        return 'Switch View';
      }
    },
    action: function (e, dt) {
      var api = (window.hfxToggleView ? window.hfxToggleView(dt) : dt) || dt;
      try {
        var mode = window.hfxToggleViewMode
          ? window.hfxToggleViewMode(api, api.init ? api.init() : null)
          : 'Responsive';
        var label = window.hfxToggleViewLabel ? window.hfxToggleViewLabel(mode) : 'Switch View';
        if (api.button) api.button('.buttons-toggle-view').text(label);
      } catch (_) {}
    },
  };

  $.extend(DataTable.ext.buttons, { toggleView: def, hfxToggleView: def });
});
