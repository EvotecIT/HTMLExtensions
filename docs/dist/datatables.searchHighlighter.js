/*!
 HTMLExtensions v0.1.12 — DataTables ColumnHighlighter & ToggleView
 (c) 2011–2025 Przemyslaw Klys @ Evotec
 https://htmlextensions.evotec.xyz | MIT License | Build: 2025-12-14T18:58:54.116Z
*/

(function () {
  if (typeof window === 'undefined') return;

  var HIT_ATTRIBUTE = 'data-hfx-dt-search-hit';

  var DEFAULTS = {
    enabled: true,
    tag: 'mark',
    className: 'hfx-dt-search-hit',
    minLength: 1,
    caseSensitive: false,
    includeGlobalSearch: true,
    includeColumnSearch: true,
    // Optional styling helpers:
    // - cssVars: apply CSS variables on the table element (e.g. --hfx-dt-search-hit-bg)
    // - hitStyle: inline styles applied to each hit (similar shape to ColumnHighlighter targets)
    cssVars: null,
    hitStyle: null,
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

    // Tokenizer that respects quoted phrases and basic escapes:
    // - "foo bar" -> one token
    // - \" inside quotes -> a literal quote
    var tokens = [];
    var cur = '';
    var inQuotes = false;
    var escapeNext = false;

    for (var i = 0; i < s.length; i++) {
      var ch = s[i];

      if (escapeNext) {
        cur += ch;
        escapeNext = false;
        continue;
      }

      // Only treat backslash escapes inside quotes to avoid breaking common search strings like domain\user.
      if (ch === '\\' && inQuotes) {
        escapeNext = true;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && /\s/.test(ch)) {
        var t = cur.trim();
        if (t) tokens.push(t);
        cur = '';
        continue;
      }

      cur += ch;
    }

    if (escapeNext) cur += '\\';
    var tail = cur.trim();
    if (tail) tokens.push(tail);
    return tokens;
  }

  function isValidElement(element) {
    return element && element.querySelectorAll && element.ownerDocument;
  }

  function getClassTokens(className) {
    var raw = ('' + (className || '')).trim();
    if (!raw) return [];
    return raw.split(/\s+/g).filter(Boolean);
  }

  function applyCssVars(element, vars) {
    if (!isValidElement(element)) return;
    if (!vars || typeof vars !== 'object') return;
    try {
      Object.keys(vars).forEach(function (k) {
        var key = '' + k;
        if (!key) return;
        // Restrict to CSS custom properties only.
        if (key.indexOf('--') !== 0) return;
        var v = vars[k];
        if (v === undefined || v === null) return;
        try {
          element.style.setProperty(key, '' + v);
        } catch (_) {}
      });
    } catch (_) {}
  }

  function applyHitStyle(element, hitStyle) {
    if (!element || element.nodeType !== 1) return;
    if (!hitStyle || typeof hitStyle !== 'object') return;

    try {
      if (
        hitStyle.backgroundColor !== undefined &&
        hitStyle.backgroundColor !== null &&
        hitStyle.backgroundColor !== ''
      ) {
        element.style.backgroundColor = '' + hitStyle.backgroundColor;
      }

      var tc = hitStyle.textColor;
      if (tc === undefined || tc === null || tc === '') tc = hitStyle.color;
      if (tc !== undefined && tc !== null && tc !== '') {
        element.style.color = '' + tc;
      }

      // Additional CSS properties (kebab-case or CSS vars are fine via setProperty).
      if (hitStyle.css && typeof hitStyle.css === 'object') {
        Object.keys(hitStyle.css).forEach(function (k) {
          if (!k) return;
          var v = hitStyle.css[k];
          if (v === undefined || v === null) return;
          try {
            element.style.setProperty(k, '' + v);
          } catch (_) {}
        });
      }
    } catch (_) {}
  }

  function unwrapMarks(root, className) {
    if (!isValidElement(root)) return;

    // Preferred: unwrap only nodes created by this plugin (no selector injection risk).
    try {
      var marksByAttr = root.querySelectorAll('[' + HIT_ATTRIBUTE + ']');
      for (var i = 0; i < marksByAttr.length; i++) {
        var el = marksByAttr[i];
        var parent = el.parentNode;
        if (!parent) continue;
        var text = el.textContent || '';
        parent.replaceChild(root.ownerDocument.createTextNode(text), el);
      }
    } catch (_) {}

    // Back-compat / fallback: unwrap by class tokens if provided.
    var tokens = getClassTokens(className);
    if (tokens.length > 0) {
      try {
        var candidates = root.querySelectorAll('mark, span');
        for (var j = 0; j < candidates.length; j++) {
          var node = candidates[j];
          if (!node || !node.classList) continue;
          var ok = true;
          for (var t = 0; t < tokens.length; t++) {
            if (!node.classList.contains(tokens[t])) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          var p = node.parentNode;
          if (!p) continue;
          var txt = node.textContent || '';
          p.replaceChild(root.ownerDocument.createTextNode(txt), node);
        }
      } catch (_) {}
    }

    // Merge adjacent text nodes introduced by replacements.
    try {
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
    if (!isValidElement(root)) return nodes;
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

  function highlightTextNode(node, regex, tagName, className, hitStyle) {
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
      try {
        mark.setAttribute(HIT_ATTRIBUTE, '1');
      } catch (_) {}
      applyHitStyle(mark, hitStyle);
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
      var entry =
        window.DataTablesSearchHighlighter && window.DataTablesSearchHighlighter.configurations
          ? window.DataTablesSearchHighlighter.configurations[tableId]
          : null;
      if (!entry || !entry.table) return;
      var api = entry.table;
      var opts = entry.opts || DEFAULTS;
      if (!opts.enabled) return;

      var tbody = api.table && api.table().body ? api.table().body() : null;
      if (!tbody) return;

      var tagName = (opts.tag || 'mark').toLowerCase() === 'span' ? 'span' : 'mark';
      var className = ('' + (opts.className || DEFAULTS.className)).trim() || DEFAULTS.className;

      // Always clear previous marks first so we don't nest/duplicate.
      unwrapMarks(tbody, className);

      var terms = getSearchTerms(api, opts);
      if (!terms || terms.length === 0) return;

      var regex = buildRegex(terms, !!opts.caseSensitive);
      if (!regex) return;

      var nodes = collectTextNodes(tbody);
      for (var i = 0; i < nodes.length; i++) {
        highlightTextNode(nodes[i], regex, tagName, className, opts.hitStyle);
      }
    } catch (_) {}
  }

  window.DataTablesSearchHighlighter = {
    configurations: {},
    init: function (tableId, opts, tableApi) {
      var options = normalizeOptions(opts);
      this.configurations[tableId] = { opts: options, table: tableApi };
      try {
        var tableEl = tableApi && tableApi.table && tableApi.table().node ? tableApi.table().node() : null;
        if (tableEl) applyCssVars(tableEl, options.cssVars);
      } catch (_) {}
      this.setupEventHandlers(tableId, tableApi);
    },
    setupEventHandlers: function (tableId, api) {
      if (!api || !api.on) return;
      try {
        api.on('draw.dt', function () {
          applyHighlighting(tableId);
        });
        api.on('search.dt', function () {
          applyHighlighting(tableId);
        });
        api.on('column-visibility.dt', function () {
          applyHighlighting(tableId);
        });
        api.on('responsive-display', function (e, dt, row, showHide) {
          if (showHide) applyHighlighting(tableId);
        });
      } catch (_) {}
      try {
        setTimeout(function () {
          applyHighlighting(tableId);
        }, 0);
      } catch (_) {}
    },
  };

  function autoInitFromSettings(settings) {
    try {
      var api = new jQuery.fn.dataTable.Api(settings);
      var tableId = settings && settings.nTable ? settings.nTable.getAttribute('id') : null;
      if (!tableId) return;

      var existing =
        window.DataTablesSearchHighlighter && window.DataTablesSearchHighlighter.configurations
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
    jQuery(document).on('preInit.dt', function (e, settings) {
      autoInitFromSettings(settings);
    });
    jQuery(document).on('init.dt', function (e, settings) {
      autoInitFromSettings(settings);
    });
  } catch (_) {}

  try {
    jQuery(function () {
      try {
        if (!jQuery.fn || !jQuery.fn.dataTable) return;
        var doScan = function () {
          try {
            var apis = jQuery.fn.dataTable.tables({ api: true });
            apis.every(function () {
              try {
                autoInitFromSettings(this.settings()[0]);
              } catch (_) {}
            });
            return apis && apis.count && apis.count() > 0;
          } catch (_) {
            return false;
          }
        };
        // One-time scan is usually enough; init/preInit handlers cover late inits.
        doScan();
        try {
          setTimeout(doScan, 0);
        } catch (_) {}
      } catch (_) {}
    });
  } catch (_) {}
})();
