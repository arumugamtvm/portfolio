(function () {
  'use strict';

  /* ── 1. Disable right-click & show custom menu ─────────── */
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    showCustomMenu(e.clientX, e.clientY);
  });

  function showCustomMenu(x, y) {
    removeMenu();
    var m = document.createElement('div');
    m.id = '__pcm';
    m.style.cssText = [
      'position:fixed',
      'top:' + y + 'px',
      'left:' + x + 'px',
      'background:#111118',
      'border:1px solid #2a2a3a',
      'border-radius:10px',
      'padding:6px',
      'z-index:2147483647',
      'font-family:Inter,sans-serif',
      'font-size:13px',
      'color:#8888a8',
      'min-width:180px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
      'user-select:none',
    ].join(';');

    m.innerHTML =
      '<div style="padding:6px 12px;cursor:default;display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:15px;">🔒</span>' +
        '<span style="color:#7c6af7;font-weight:600;">Protected</span>' +
      '</div>' +
      '<div style="height:1px;background:#2a2a3a;margin:4px 0;"></div>' +
      '<div style="padding:6px 12px;border-radius:6px;cursor:pointer;transition:background 0.15s;" ' +
        'onmouseover="this.style.background=\'#1a1a24\'" onmouseout="this.style.background=\'\'" ' +
        'onclick="window.open(\'https://github.com/arumugamtvm\',\'_blank\')">' +
        '🐙 GitHub Profile' +
      '</div>' +
      '<div style="padding:6px 12px;border-radius:6px;cursor:pointer;transition:background 0.15s;" ' +
        'onmouseover="this.style.background=\'#1a1a24\'" onmouseout="this.style.background=\'\'" ' +
        'onclick="document.getElementById(\'contact\').scrollIntoView({behavior:\'smooth\'})">' +
        '📧 Contact Me' +
      '</div>';

    document.body.appendChild(m);

    /* keep inside viewport */
    var r = m.getBoundingClientRect();
    if (r.right > window.innerWidth) m.style.left = (x - r.width) + 'px';
    if (r.bottom > window.innerHeight) m.style.top = (y - r.height) + 'px';

    document.addEventListener('click', removeMenu, { once: true });
    document.addEventListener('keydown', removeMenu, { once: true });
  }

  function removeMenu() {
    var el = document.getElementById('__pcm');
    if (el) el.remove();
  }

  /* ── 2. Block keyboard shortcuts ───────────────────────── */
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    var c = e.ctrlKey || e.metaKey;
    var s = e.shiftKey;

    if (
      k === 'F12' ||
      (c && s && (k === 'I' || k === 'i')) ||   // DevTools
      (c && s && (k === 'J' || k === 'j')) ||   // Console
      (c && s && (k === 'C' || k === 'c')) ||   // Inspector
      (c && (k === 'U' || k === 'u')) ||         // View Source
      (c && (k === 'S' || k === 's')) ||         // Save Page
      (c && (k === 'P' || k === 'p'))            // Print
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  /* ── 3. Disable text selection & drag ──────────────────── */
  document.documentElement.style.cssText +=
    ';-webkit-user-select:none;-moz-user-select:none;user-select:none;';

  document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* ── 4. Disable print ──────────────────────────────────── */
  window.addEventListener('beforeprint', function () {
    document.body.style.visibility = 'hidden';
  });
  window.addEventListener('afterprint', function () {
    document.body.style.visibility = '';
  });

  /* ── 5. DevTools detection — window-size method ────────── */
  var _dt = false;

  function _checkDt() {
    var wDiff = window.outerWidth - window.innerWidth;
    var hDiff = window.outerHeight - window.innerHeight;
    var open = wDiff > 160 || hDiff > 160;
    if (open && !_dt) {
      _dt = true;
      _onDtOpen();
    } else if (!open) {
      _dt = false;
    }
  }

  /* DevTools detection — debugger timing method */
  function _debuggerCheck() {
    var t = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    if (performance.now() - t > 100) {
      _onDtOpen();
    }
  }

  /* DevTools detection — console object getter method */
  var _img = new Image();
  Object.defineProperty(_img, 'id', {
    get: function () {
      _onDtOpen();
    },
  });

  function _onDtOpen() {
    /* Replace page with lock screen */
    if (document.getElementById('__lockscreen')) return;
    var overlay = document.createElement('div');
    overlay.id = '__lockscreen';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483646',
      'background:#0a0a0f',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:1rem',
      'font-family:Inter,sans-serif',
      'text-align:center',
      'padding:2rem',
    ].join(';');
    overlay.innerHTML =
      '<div style="font-size:3rem;">🔒</div>' +
      '<div style="font-size:1.3rem;font-weight:700;color:#e8e8f0;">Access Restricted</div>' +
      '<div style="color:#8888a8;max-width:360px;font-size:0.9rem;line-height:1.6;">' +
        'Developer tools are not available on this site.' +
      '</div>' +
      '<button onclick="location.reload()" style="margin-top:1rem;background:#7c6af7;color:#fff;' +
        'border:none;padding:0.6rem 1.5rem;border-radius:8px;font-size:0.9rem;cursor:pointer;">' +
        'Reload Page' +
      '</button>';
    document.body.appendChild(overlay);
  }

  setInterval(_checkDt, 800);
  setInterval(_debuggerCheck, 3000);
  /* Trigger console getter — if DevTools console is open this fires */
  setInterval(function () { console.log(_img); }, 2000);

})();
