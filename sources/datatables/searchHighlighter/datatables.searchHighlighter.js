(function () {
  if (typeof window === 'undefined') return;

  var DEFAULTS = {
    enabled: true,
    tag: 'mark',
    className: 'hfx-dt-search-hit',
    minLength: 1,
    caseSensitive: false,
    includeGlobalSearch: true,
    includeColumnSearch: true
  };

  function escapeRegex(s) {
    return ('' + s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function uniqPush(arr, value) {
    if (!value) return;
    if (arr.indexOf(value) === -1) arr.push(value);
  }

  function normalizeOptions(opts) {
    if (opts === true) return Object.assign({}, DEFAULTS);
    if (!opts || typeof opts !== 'object') return Object.assign({}, DEFAULTS);
    var merged = Object.assign({}, DEFAULTS);
    Object.keys(opts).forEach(function (k) {
      if (opts[k] !== undefined && opts[k] !== null) merged[k] = opts[k];
    });
    return merged;
  }

  function parseSearchTerms(input) {
    var s = ('' + (input || '')).trim();
    if (!s) return [];

    // Respect quoted phrases: "foo bar" -> one token.
    var tokens = [];
    try {
      var rx = /"([^"]+)"|(\S+)/g;
      var m;
      while ((m = rx.exec(s))) {
        var t = (m[1] || m[2] || '').trim();
        if (t) tokens.push(t);
      }
    } catch (_) {
      tokens = s.split(/\s+/g);
    }
    return tokens;
  }

  function isValidRoot(root) {
    return root && root.querySelectorAll && root.ownerDocument;
  }

  function unwrapMarks(root, className) {
    if (!isValidRoot(root)) return;
    try {
      var sel = 'mark.' + className + ', span.' + className;
      var marks = root.querySelectorAll(sel);
      for (var i = 0; i < marks.length; i++) {
        var el = marks[i];
        var parent = el.parentNode;
        if (!parent) continue;
        var text = (el.textContent || '');
        parent.replaceChild(root.ownerDocument.createTextNode(text), el);
      }
      // Merge adjacent text nodes introduced by replacements.
      if (root.normalize) root.normalize();
    } catch (_) {}
  }

  function shouldSkipTextNode(node) {
    if (!node || !node.parentNode) return true;
    if (!node.nodeValue || node.nodeValue.trim() === '') return true;

    var p = node.parentNode;
    // Skip inside interactive/unsafe containers.
    while (p && p.nodeType === 1) {
      var tag = (p.nodeName || '').toLowerCase();
      if (
        tag === 'script' ||
        tag === 'style' ||
        tag === 'textarea' ||
        tag === 'input' ||
        tag === 'select' ||
        tag === 'option' ||
        tag === 'button' ||
        tag === 'svg' ||
        tag === 'canvas'
      ) {
        return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  function collectTextNodes(root) {
    var nodes = [];
    if (!isValidRoot(root)) return nodes;
    try {
      var walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = walker.nextNode())) {
        if (!shouldSkipTextNode(n)) nodes.push(n);
      }
    } catch (_) {
      // Fallback recursion if TreeWalker isn't available
      (function walk(node) {
        if (!node) return;
        if (node.nodeType === 3) {
          if (!shouldSkipTextNode(node)) nodes.push(node);
          return;
        }
        if (node.nodeType !== 1) return;
        var child = node.firstChild;
        while (child) {
          walk(child);
          child = child.nextSibling;
        }
      })(root);
    }
    return nodes;
  }

  function highlightTextNode(node, regex, tagName, className) {
    var text = node.nodeValue;
    if (!text) return;

    regex.lastIndex = 0;
    var match = regex.exec(text);
    if (!match) return;

    var doc = node.ownerDocument;
    var frag = doc.createDocumentFragment();
    var last = 0;

    do {
      var start = match.index;
      var end = start + match[0].length;
      if (start > last) frag.appendChild(doc.createTextNode(text.slice(last, start)));
      var mark = doc.createElement(tagName);
      mark.className = className;
      mark.appendChild(doc.createTextNode(match[0]));
      frag.appendChild(mark);
      last = end;
    } while ((match = regex.exec(text)));

    if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  function buildRegex(terms, caseSensitive) {
    var list = (terms || []).slice().filter(Boolean);
    if (list.length === 0) return null;
    list.sort(function (a, b) {
      return ('' + b).length - ('' + a).length;
    });
    var flags = 'g' + (caseSensitive ? '' : 'i');
    return new RegExp('(' + list.map(escapeRegex).join('|') + ')', flags);
  }

  function getSearchTerms(api, opts) {
    var terms = [];
    try {
      if (opts.includeGlobalSearch) {
        parseSearchTerms(api.search()).forEach(function (t) {
          uniqPush(terms, t);
        });
      }
      if (opts.includeColumnSearch) {
        api.columns().every(function () {
          parseSearchTerms(this.search()).forEach(function (t) {
            uniqPush(terms, t);
          });
        });
      }
    } catch (_) {}

    var minLen = Number(opts.minLength || 0);
    if (minLen > 0) {
      terms = terms.filter(function (t) {
        return ('' + t).length >= minLen;
      });
    }
    return terms;
  }

  function applyHighlighting(tableId) {
    try {
      var entry = window.DataTablesSearchHighlighter && window.DataTablesSearchHighlighter.configurations
        ? window.DataTablesSearchHighlighter.configurations[tableId]
        : null;
      if (!entry || !entry.table) return;
      var api = entry.table;
      var opts = entry.opts || DEFAULTS;
      if (!opts.enabled) return;

      var tbody = api.table && api.table().body ? api.table().body() : null;
      if (!tbody) return;

      var tagName = (opts.tag || 'mark').toLowerCase() === 'span' ? 'span' : 'mark';
      var className = (opts.className || DEFAULTS.className).trim() || DEFAULTS.className;

      // Always clear previous marks first so we don't nest/duplicate.
      unwrapMarks(tbody, className);

      var terms = getSearchTerms(api, opts);
      if (!terms || terms.length === 0) return;

      var regex = buildRegex(terms, !!opts.caseSensitive);
      if (!regex) return;

      var nodes = collectTextNodes(tbody);
      for (var i = 0; i < nodes.length; i++) {
        highlightTextNode(nodes[i], regex, tagName, className);
      }
    } catch (_) {}
  }

  window.DataTablesSearchHighlighter = {
    configurations: {},
    init: function (tableId, opts, tableApi) {
      var options = normalizeOptions(opts);
      this.configurations[tableId] = { opts: options, table: tableApi };
      this.setupEventHandlers(tableId, tableApi);
    },
    setupEventHandlers: function (tableId, api) {
      if (!api || !api.on) return;
      try {
        api.on('draw.dt', function () { applyHighlighting(tableId); });
        api.on('search.dt', function () { applyHighlighting(tableId); });
        api.on('column-visibility.dt', function () { applyHighlighting(tableId); });
        api.on('responsive-display', function (e, dt, row, showHide) {
          if (showHide) applyHighlighting(tableId);
        });
      } catch (_) {}
      try { setTimeout(function () { applyHighlighting(tableId); }, 0); } catch (_) {}
    }
  };

  function autoInitFromSettings(settings) {
    try {
      var api = new jQuery.fn.dataTable.Api(settings);
      var tableId = settings && settings.nTable ? settings.nTable.getAttribute('id') : null;
      if (!tableId) return;

      var existing = window.DataTablesSearchHighlighter && window.DataTablesSearchHighlighter.configurations
        ? window.DataTablesSearchHighlighter.configurations[tableId]
        : null;
      if (existing) return;

      var oInit = settings.oInit || {};
      var cfg = oInit.searchHighlighter;
      if (cfg === undefined && oInit.searchHighlight === true) {
        // Back-compat: accept DataTables plugin-style flag.
        cfg = true;
      }
      if (!cfg) return;

      window.DataTablesSearchHighlighter.init(tableId, cfg, api);
    } catch (_) {}
  }

  try {
    jQuery(document).on('preInit.dt', function (e, settings) { autoInitFromSettings(settings); });
    jQuery(document).on('init.dt', function (e, settings) { autoInitFromSettings(settings); });
  } catch (_) {}

  try {
    jQuery(function () {
      try {
        if (!jQuery.fn || !jQuery.fn.dataTable) return;
        var doScan = function () {
          try {
            var apis = jQuery.fn.dataTable.tables({ api: true });
            apis.every(function () {
              try { autoInitFromSettings(this.settings()[0]); } catch (_) {}
            });
            return apis && apis.count && apis.count() > 0;
          } catch (_) {
            return false;
          }
        };
        doScan();
        var tries = 0;
        var timer = setInterval(function () {
          var found = doScan();
          tries++;
          if (found || tries > 40) clearInterval(timer);
        }, 50);
      } catch (_) {}
    });
  } catch (_) {}
})();
