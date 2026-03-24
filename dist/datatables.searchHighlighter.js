/*!
 HTMLExtensions v0.1.16 — DataTables ColumnHighlighter & ToggleView
 (c) 2011–2026 Przemyslaw Klys @ Evotec
 https://htmlextensions.evotec.xyz | MIT License | Build: 2026-03-24T11:31:07.316Z
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
    // - globalHitStyle: override styling for hits coming from the global DataTables search box
    // - columnHitStyle: override styling for hits coming from per-column filters
    // - columnHitStyles: per-column override map keyed by column index ("0") or header text ("Status")
    cssVars: null,
    hitStyle: null,
    globalHitStyle: null,
    columnHitStyle: null,
    columnHitStyles: null,
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

  function getColumnHeaderName(api, columnIndex) {
    try {
      if (columnIndex === undefined || columnIndex === null) return '';
      var header = api && api.column ? api.column(columnIndex).header() : null;
      return header ? (header.textContent || '').trim() : '';
    } catch (_) {
      return '';
    }
  }

  function getColumnStyleCandidates(api, columnIndex) {
    var candidates = [];
    if (columnIndex !== undefined && columnIndex !== null && !isNaN(columnIndex)) {
      uniqPush(candidates, '' + columnIndex);
    }

    var headerName = getColumnHeaderName(api, columnIndex);
    if (headerName) {
      uniqPush(candidates, headerName);
      uniqPush(candidates, headerName.toLowerCase());
    }

    return candidates;
  }

  function resolveColumnHitStyle(api, opts, columnIndex) {
    var configured = opts && opts.columnHitStyles;
    if (configured && typeof configured === 'object') {
      var candidates = getColumnStyleCandidates(api, columnIndex);

      for (var i = 0; i < candidates.length; i++) {
        if (configured[candidates[i]]) return configured[candidates[i]];
      }

      try {
        var configuredKeys = Object.keys(configured);
        for (var j = 0; j < configuredKeys.length; j++) {
          var key = configuredKeys[j];
          if (!key) continue;
          for (var c = 0; c < candidates.length; c++) {
            if (('' + key).toLowerCase() === ('' + candidates[c]).toLowerCase()) {
              return configured[key];
            }
          }
        }
      } catch (_) {}
    }

    return (opts && opts.columnHitStyle) || (opts && opts.hitStyle) || null;
  }

  function resolveGlobalHitStyle(opts) {
    return (opts && opts.globalHitStyle) || (opts && opts.hitStyle) || null;
  }

  function resolveColumnIndexForTextNode(node, api) {
    if (!node) return null;

    var current = node.parentNode;
    var cell = null;

    while (current) {
      if (current.nodeType === 1 && current.getAttribute) {
        var dataColumn = current.getAttribute('data-dt-column');
        if (dataColumn !== null && dataColumn !== undefined && dataColumn !== '') {
          var parsed = parseInt(dataColumn, 10);
          if (!isNaN(parsed)) return parsed;
        }

        var tag = (current.nodeName || '').toLowerCase();
        if (tag === 'td' || tag === 'th') {
          cell = current;
          break;
        }
      }
      current = current.parentNode;
    }

    if (!cell || !api || !api.cell) return null;

    try {
      var index = api.cell(cell).index();
      if (index && typeof index.column === 'number') return index.column;
    } catch (_) {}

    return null;
  }

  function buildHighlightRules(api, opts, columnIndex) {
    var rules = [];
    var seen = {};
    var minLen = Number(opts.minLength || 0);
    var caseSensitive = !!opts.caseSensitive;

    function pushRule(term, source, priority, hitStyle, sourceColumnIndex) {
      var raw = ('' + (term || '')).trim();
      if (!raw) return;
      if (minLen > 0 && raw.length < minLen) return;

      var lookup = caseSensitive ? raw : raw.toLowerCase();
      var key = source + '|' + (sourceColumnIndex == null ? '' : sourceColumnIndex) + '|' + lookup;
      if (seen[key]) return;
      seen[key] = true;

      rules.push({
        term: raw,
        lookup: lookup,
        source: source,
        priority: priority,
        hitStyle: hitStyle || null,
        columnIndex: sourceColumnIndex,
      });
    }

    try {
      if (opts.includeGlobalSearch) {
        var globalStyle = resolveGlobalHitStyle(opts);
        parseSearchTerms(api.search()).forEach(function (term) {
          pushRule(term, 'global', 1, globalStyle, null);
        });
      }
    } catch (_) {}

    try {
      if (opts.includeColumnSearch && columnIndex !== undefined && columnIndex !== null) {
        var columnStyle = resolveColumnHitStyle(api, opts, columnIndex);
        parseSearchTerms(api.column(columnIndex).search()).forEach(function (term) {
          pushRule(term, 'column', 2, columnStyle, columnIndex);
        });
      }
    } catch (_) {}

    return rules;
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

  function buildHitClassName(baseClassName, rule) {
    var classes = [baseClassName];
    if (rule && rule.source === 'global') {
      classes.push('hfx-dt-search-hit-global');
    } else if (rule && rule.source === 'column') {
      classes.push('hfx-dt-search-hit-column');
      if (rule.columnIndex !== undefined && rule.columnIndex !== null && !isNaN(rule.columnIndex)) {
        classes.push('hfx-dt-search-hit-column-' + rule.columnIndex);
      }
    }
    return classes.join(' ');
  }

  function findNextRuleMatch(text, haystack, startAt, rules) {
    var best = null;

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!rule || !rule.lookup) continue;

      var index = haystack.indexOf(rule.lookup, startAt);
      if (index < 0) continue;

      var candidate = {
        index: index,
        length: rule.term.length,
        rule: rule,
      };

      if (!best || candidate.index < best.index) {
        best = candidate;
        continue;
      }

      if (candidate.index > best.index) continue;

      if (candidate.rule.priority > best.rule.priority) {
        best = candidate;
        continue;
      }

      if (candidate.rule.priority === best.rule.priority && candidate.length > best.length) {
        best = candidate;
      }
    }

    return best;
  }

  function highlightTextNode(node, rules, tagName, className, caseSensitive) {
    var text = node.nodeValue;
    if (!text) return;

    var haystack = caseSensitive ? text : text.toLowerCase();
    var match = findNextRuleMatch(text, haystack, 0, rules);
    if (!match) return;

    var doc = node.ownerDocument;
    var frag = doc.createDocumentFragment();
    var cursor = 0;

    do {
      var start = match.index;
      var end = start + match.length;
      if (start > cursor) frag.appendChild(doc.createTextNode(text.slice(cursor, start)));
      var mark = doc.createElement(tagName);
      mark.className = buildHitClassName(className, match.rule);
      try {
        mark.setAttribute(HIT_ATTRIBUTE, '1');
      } catch (_) {}
      try {
        if (match.rule && match.rule.source)
          mark.setAttribute('data-hfx-dt-search-source', match.rule.source);
        if (
          match.rule &&
          match.rule.columnIndex !== undefined &&
          match.rule.columnIndex !== null &&
          !isNaN(match.rule.columnIndex)
        ) {
          mark.setAttribute('data-hfx-dt-search-column', '' + match.rule.columnIndex);
        }
      } catch (_) {}
      applyHitStyle(mark, match.rule ? match.rule.hitStyle : null);
      mark.appendChild(doc.createTextNode(text.slice(start, end)));
      frag.appendChild(mark);
      cursor = end;
      match = findNextRuleMatch(text, haystack, cursor, rules);
    } while (match);

    if (cursor < text.length) frag.appendChild(doc.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
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

      var nodes = collectTextNodes(tbody);
      for (var i = 0; i < nodes.length; i++) {
        var columnIndex = resolveColumnIndexForTextNode(nodes[i], api);
        var rules = buildHighlightRules(api, opts, columnIndex);
        if (!rules || rules.length === 0) continue;

        rules.sort(function (a, b) {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return ('' + b.term).length - ('' + a.term).length;
        });

        highlightTextNode(nodes[i], rules, tagName, className, !!opts.caseSensitive);
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
