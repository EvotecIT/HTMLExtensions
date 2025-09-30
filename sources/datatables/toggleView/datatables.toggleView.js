/*
 HTMLExtensions: DataTables Responsive/ScrollX Toggle Helper
 - Preserves init options and runtime state (order, paging, searches, column visibility)
 - Rebinds ColumnHighlighter handlers if present
*/
(function(global){
  if (global.hfxToggleView) return;
  function deepClone(obj){
    var $ = global.jQuery || global.$; if ($ && $.extend) return $.extend(true, {}, obj);
    try { return JSON.parse(JSON.stringify(obj)); } catch(e) { return obj; }
  }
  function rebindHighlighter(tableId, api){
    try {
      var CH = global.DataTablesColumnHighlighter; if (!CH || !CH.configurations) return;
      var cfg = CH.configurations[tableId]; if (!cfg) return;
      // Update bound api and rewire events
      cfg.table = api;
      if (CH.setupEventHandlers) CH.setupEventHandlers(tableId, api);
      // Re-apply for visible rows
      setTimeout(function(){ try { api.rows({ page: 'current' }).every(function(){ var tr=this.node(); CH.applyHighlighting(tableId, (global.jQuery||global.$)(tr), this.data()); }); } catch(_){} }, 0);
    } catch(_){}
  }
  function preserveState(api){
    var state = {};
    try {
      state.page = api.page();
      state.order = api.order();
      state.search = api.search();
      state.colSearch = [];
      state.colVisible = [];
      api.columns().every(function(idx){
        state.colSearch[idx] = this.search();
        state.colVisible[idx] = this.visible();
      });
    } catch(_){ }
    return state;
  }
  function restoreState(api, state){
    try {
      if (!state) return;
      if (Array.isArray(state.colVisible)) state.colVisible.forEach(function(v,i){ api.column(i).visible(v, false); });
      if (typeof state.search === 'string') api.search(state.search, false, false);
      if (Array.isArray(state.colSearch)) state.colSearch.forEach(function(v,i){ if (typeof v === 'string') api.column(i).search(v, false, false); });
      if (Array.isArray(state.order)) api.order(state.order);
      if (typeof state.page === 'number') api.page(state.page);
      api.columns.adjust().draw(false);
    } catch(_){ }
  }
  function toggle(api){
    var $ = global.jQuery || global.$; if (!$) return;
    var table = api.table().node(); var id = table && table.id ? table.id : null;
    var init = deepClone(api.init());
    var isResponsive = !!api.settings()[0].responsive;
    var isScrollX = init && init.scrollX === true;
    var state = preserveState(api);

    // Tear down instance but keep DOM intact
    api.destroy();

    // Prepare options
    if (isResponsive){
      if (!init.responsiveConfig && init.responsive) init.responsiveConfig = init.responsive;
      init.responsive = false; init.scrollX = true;
    } else {
      init.scrollX = false;
      init.responsive = init.responsiveConfig || { details: { type: 'inline' } };
    }

    var newApi = $(table).DataTable(init);

    // Persist mode for HtmlForgeX defaulting (if present)
    try {
      if (id) {
        var key = 'hfx:dt:' + id + ':mode';
        localStorage.setItem(key, isResponsive ? 'ScrollX' : 'Responsive');
      }
    } catch(_){ }

    // Rebind highlighting (if present)
    if (id) rebindHighlighter(id, newApi);

    // Restore state
    restoreState(newApi, state);

    // Align widths / toolbar and refresh toggle button label if present
    try { if (global.hfxDt) global.hfxDt.applyViewportAndToolbar(newApi); } catch(_){ }
    try {
      var st = newApi.settings()[0];
      var isScroll = !!(st && st.oInit && st.oInit.scrollX);
      var label = isScroll ? 'Switch to Responsive' : 'Switch to ScrollX';
      if (newApi.button) newApi.button('.buttons-toggle-view').text(label);
    } catch(_){ }

    return newApi;
  }
  global.hfxToggleView = toggle;
  // Optional: declarative trigger using [data-hfx-toggle="#tableId"]
  try {
    var $ = global.jQuery || global.$;
    if ($ && $.fn && $.fn.on) {
      $(function(){
        $('body').on('click','[data-hfx-toggle]', function(){
          try {
            var sel = $(this).attr('data-hfx-toggle');
            if (!sel) return;
            var api = $(sel).DataTable(); if (!api) return;
            var newApi = toggle(api) || api;
            // If the triggering element wants auto label, flip it
            var st = newApi.settings()[0];
            var isScroll = !!(st && st.oInit && st.oInit.scrollX);
            $(this).text(isScroll ? 'Switch to Responsive' : 'Switch to ScrollX');
          } catch(_){ }
        });
      });
    }
  } catch(_){ }
})(window);

// Buttons integration (UMD-friendly): register 'toggleView' if Buttons is present
(function(factory){
  if (typeof define === 'function' && define.amd) {
    define(['jquery','datatables.net','datatables.net-buttons'], function($){ return factory($, window, document); });
  } else if (typeof exports === 'object') {
    module.exports = function(root, $) {
      root = root || window; $ = $ || require('jquery')(root);
      if (!$.fn.dataTable) { require('datatables.net')(root, $); }
      if (!$.fn.dataTable.Buttons) { require('datatables.net-buttons')(root, $); }
      return factory($, root, root.document);
    };
  } else { factory(jQuery, window, document); }
}(function($){
  var DataTable = $.fn.dataTable; if (!DataTable || !DataTable.ext || !DataTable.ext.buttons) return;
  var def = {
    className: 'buttons-toggle-view',
    text: function (dt) { try { var st = dt.settings()[0]; var scroll = !!(st && st.oInit && st.oInit.scrollX); return scroll ? 'Switch to Responsive' : 'Switch to ScrollX'; } catch(e){ return 'Switch View'; } },
    action: function (e, dt) { var api = (window.hfxToggleView ? window.hfxToggleView(dt) : dt) || dt; try { var st = api.settings()[0]; var scroll = !!(st && st.oInit && st.oInit.scrollX); var label = scroll ? 'Switch to Responsive' : 'Switch to ScrollX'; api.button('.buttons-toggle-view').text(label); } catch(_){} }
  };
  $.extend(DataTable.ext.buttons, { toggleView: def, hfxToggleView: def });
}));
