/*
 HTMLExtensions: DataTables Buttons integration for Responsive/ScrollX toggle
 - Registers a 'toggleView' button that calls window.hfxToggleView(dt)
 - No styling applied; inherits your Buttons theme
*/
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
}(function($, window){
  'use strict';
  var DataTable = $.fn.dataTable; if (!DataTable || !DataTable.ext || !DataTable.ext.buttons) return;
  var def = {
    className: 'buttons-toggle-view',
    text: function (dt) {
      try { var st = dt.settings()[0]; var scroll = !!(st && st.oInit && st.oInit.scrollX); return scroll ? 'Switch to Responsive' : 'Switch to ScrollX'; } catch(e) { return 'Switch View'; }
    },
    action: function (e, dt) {
      var api = (window.hfxToggleView ? window.hfxToggleView(dt) : dt) || dt;
      try { var st = api.settings()[0]; var scroll = !!(st && st.oInit && st.oInit.scrollX); var label = scroll ? 'Switch to Responsive' : 'Switch to ScrollX'; api.button('.buttons-toggle-view').text(label); } catch(_){}
    }
  };
  $.extend(DataTable.ext.buttons, { toggleView: def, hfxToggleView: def });
}));

