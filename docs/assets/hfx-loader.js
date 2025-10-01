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
    var s = document.createElement('script'); s.src = src; s.defer = false; document.head.appendChild(s);
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
    // Default: derive ../../dist/ from script location (docs/assets/hfx-loader.js)
    // me.src -> .../docs/assets/hfx-loader.js
    try {
      var assetsDir = pathUp(me.src, 1);           // .../docs/
      var repoRoot  = pathUp(assetsDir.href, 1);   // .../ (Ignore/HtmlExtensions/)
      if (repoRoot) { repoRoot.pathname += 'dist/'; return repoRoot.href; }
    } catch(_) {}
    // Fallbacks
    if (window.HFX_LOCAL_DIST_BASE) return window.HFX_LOCAL_DIST_BASE;
    return '../../dist/';
  }
  function computeCdnBase(){
    return (window.HFX_CDN_DIST_BASE || 'https://cdn.jsdelivr.net/npm/@evotecit/htmlextensions@latest/dist/');
  }
  function computeBase(me){
    var qp = (getParam('dist')||'').toLowerCase();
    var defaultMode = (location.protocol === 'file:') ? 'local' : 'cdn';
    var mode = qp || defaultMode;
    return mode === 'local' ? computeLocalBase(me) : computeCdnBase();
  }
  function run(){
    var me = Array.from(document.scripts).find(function(s){ return (s.src||'').indexOf('assets/hfx-loader.js') !== -1; });
    if (!me) return;
    var files = (me.dataset.hfxFiles || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    if (!files.length) return;
    var base = computeBase(me);
    files.forEach(function(f){ loadScript(base + f); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
