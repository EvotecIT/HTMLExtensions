// HTMLExtensions demo loader: switches between CDN and local dist via query param
// Usage in demo page:
//   <script src="../assets/hfx-loader.js" data-hfx-files="datatables.columnHighlighter.js"></script>
// Query params:
//   ?dist=local   -> use local /dist/*.js
//   ?dist=cdn     -> use CDN (default)
(function(){
  function getParam(name){
    try { return new URLSearchParams(window.location.search).get(name); } catch(_) { return null; }
  }
  function loadScript(src){
    return new Promise(function(resolve, reject){
      try {
        var s = document.createElement('script');
        s.src = src; s.defer = false;
        s.onload = function(){ resolve(src); };
        s.onerror = function(){ reject(new Error('Failed to load '+src)); };
        document.head.appendChild(s);
      } catch(e) { reject(e); }
    });
  }
  function pathUp(urlStr, n){
    try {
      var u = new URL(urlStr, document.baseURI);
      var parts = u.pathname.split('/');
      for (var i=0;i<n;i++) parts.pop(); // remove last n segments
      u.pathname = parts.join('/') + '/';
      return u;
    } catch(_) { return null; }
  }
  function computeLocalBase(me){
    // Highest-priority override
    if (window.HFX_LOCAL_DIST_BASE) return window.HFX_LOCAL_DIST_BASE;
    // For hosted site (http/https), prefer absolute '/dist/' at site root
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return '/dist/';
    }
    // For file:// usage, derive ../../dist/ from script location
    try {
      var assetsDir = pathUp(me.src, 1);           // .../docs/
      var repoRoot  = pathUp(assetsDir.href, 1);   // .../ (Ignore/HtmlExtensions/)
      if (repoRoot) { repoRoot.pathname += 'dist/'; return repoRoot.href; }
    } catch(_) {}
    return '../../dist/';
  }
  function computeCdnBase(){
    return (window.HFX_CDN_DIST_BASE || 'https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@latest/dist/');
  }
  function computeBase(me){
    var qp = (getParam('dist')||'').toLowerCase();
    // Default to local on both file:// and http(s) so docs always match this repo's dist
    var defaultMode = 'local';
    var mode = qp || defaultMode;
    return mode === 'local' ? computeLocalBase(me) : computeCdnBase();
  }
  function bases(me){
    // Return preferred then fallback
    var p = computeBase(me);
    var local = computeLocalBase(me);
    var cdn = computeCdnBase();
    if (p === local) return [local, cdn];
    return [cdn, local];
  }
  function run(){
    var me = Array.from(document.scripts).find(function(s){ return (s.src||'').indexOf('assets/hfx-loader.js') !== -1; });
    if (!me) return;
    var files = (me.dataset.hfxFiles || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    if (!files.length) return;
    var order = bases(me);
    var first = order[0], second = order[1];
    files.forEach(function(f){
      loadScript(first + f).catch(function(){
        console.warn('[HFX] Falling back to secondary source for', f);
        return loadScript(second + f);
      }).catch(function(err){ console.error('[HFX] Unable to load', f, err); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
