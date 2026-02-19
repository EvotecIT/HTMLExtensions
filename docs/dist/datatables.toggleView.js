/*!
 HTMLExtensions v0.1.13 — DataTables ColumnHighlighter & ToggleView
 (c) 2011–2026 Przemyslaw Klys @ Evotec
 https://htmlextensions.evotec.xyz | MIT License | Build: 2026-02-19T10:26:46.636Z
*/

(function (global) {
  if (global.hfxToggleView) return;

  function deepClone(obj) {
    var $ = global.jQuery || global.$;
    if ($ && $.extend) return $.extend(true, {}, obj);
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
      state.page = api.page();
      state.order = api.order();
      state.search = api.search();
      state.colSearch = [];
      state.colVisible = [];
      api.columns().every(function (idx) {
        state.colSearch[idx] = this.search();
        state.colVisible[idx] = this.visible();
      });
    } catch (_) {}
    return state;
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
      if (typeof state.page === 'number') api.page(state.page);
      api.columns.adjust().draw(false);
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
