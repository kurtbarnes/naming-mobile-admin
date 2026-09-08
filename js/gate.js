/* =====================================================================
   gate.js — lightweight access lock for the In the Field mobile app.

   The Naming Opportunities admin (RE NXT settings → "In the Field" tile)
   can set an access password. The share link it hands out carries that
   password in the URL hash (#pw=...). On first open on a device the app
   stores the required password and shows a lock screen; a correct entry
   unlocks the app for that browser (remembered until the password is
   changed or site data is cleared).

   Prototype only — there is no backend. In production this would be a
   real token / SSO check, not a hash param.
   ===================================================================== */
(function () {
  var PW_KEY = 'nmaField.requiredPw';
  var UNLOCK_KEY = 'nmaField.unlocked';

  function safeGet(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
  function safeSet(store, k, v) { try { store.setItem(k, v); } catch (e) {} }
  function safeDel(store, k) { try { store.removeItem(k); } catch (e) {} }

  // 1. Absorb an incoming password from the URL hash (or ?pw=), then scrub the URL.
  //    Returns true if a pw param was present (and consumed).
  function absorb() {
    var raw = location.hash || '';
    var m = raw.match(/[#&]pw=([^&]*)/);
    var fromSearch = false;
    if (!m) { m = (location.search || '').match(/[?&]pw=([^&]*)/); fromSearch = true; }
    if (!m) return false;

    var val = '';
    try { val = decodeURIComponent(m[1] || ''); } catch (e) { val = m[1] || ''; }

    if (val) {
      var prev = safeGet(localStorage, PW_KEY);
      safeSet(localStorage, PW_KEY, val);
      if (prev !== val) safeDel(sessionStorage, UNLOCK_KEY); // new password → must re-unlock
    } else {
      // explicit empty (#pw=) clears the lock
      safeDel(localStorage, PW_KEY);
      safeDel(sessionStorage, UNLOCK_KEY);
    }

    // scrub so the password isn't left sitting in the address bar / history
    if (fromSearch) {
      var clean = location.search.replace(/([?&])pw=[^&]*/, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?');
      history.replaceState(null, '', location.pathname + clean + (location.hash.replace(/[#&]pw=[^&]*/, '') || ''));
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
    return true;
  }

  absorb();

  // A new share link opened while the app is already loaded only changes the
  // hash (no reload) — catch it and reload so the lock state is re-evaluated.
  window.addEventListener('hashchange', function () {
    if (/[#&]pw=/.test(location.hash) && absorb()) location.reload();
  });

  function required() { return safeGet(localStorage, PW_KEY) || ''; }
  function isUnlocked() { return safeGet(sessionStorage, UNLOCK_KEY) === '1'; }

  function showLock() {
    var pw = required();
    if (!pw || isUnlocked()) return;

    document.documentElement.style.overflow = 'hidden';
    var ov = document.createElement('div');
    ov.id = 'field-gate';
    ov.innerHTML = [
      '<div class="fg-card">',
      '  <div class="fg-mark">&#128203;</div>',
      '  <h1>In the Field</h1>',
      '  <p>Enter the access password provided by your administrator.</p>',
      '  <form id="fg-form">',
      '    <input id="fg-input" type="password" inputmode="text" autocomplete="off" autocapitalize="off" placeholder="Password" aria-label="Access password" />',
      '    <button type="submit">Unlock</button>',
      '    <div id="fg-error" role="alert"></div>',
      '  </form>',
      '</div>'
    ].join('');

    var css = document.createElement('style');
    css.textContent =
      '#field-gate{position:fixed;inset:0;z-index:9999;background:#0f6e5c;display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}' +
      '#field-gate .fg-card{background:#fff;border-radius:16px;max-width:340px;width:100%;padding:28px 24px 24px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25);}' +
      '#field-gate .fg-mark{font-size:40px;line-height:1;}' +
      '#field-gate h1{font-size:20px;margin:10px 0 4px;color:#1b2422;}' +
      '#field-gate p{font-size:13.5px;color:#667169;margin:0 0 18px;line-height:1.5;}' +
      '#field-gate form{display:flex;flex-direction:column;gap:10px;}' +
      '#field-gate input{border:1px solid #d5ddda;border-radius:10px;padding:12px 14px;font-size:16px;outline:0;}' +
      '#field-gate input:focus{border-color:#0f6e5c;}' +
      '#field-gate button{background:#0f6e5c;color:#fff;border:0;border-radius:10px;padding:12px 14px;font-size:15px;font-weight:600;cursor:pointer;}' +
      '#field-gate button:active{background:#0b5548;}' +
      '#field-gate #fg-error{color:#c23b3b;font-size:12.5px;min-height:16px;}' +
      '#field-gate.shake .fg-card{animation:fgShake .4s;}' +
      '@keyframes fgShake{10%,90%{transform:translateX(-2px);}30%,70%{transform:translateX(4px);}50%{transform:translateX(-6px);}}';

    document.head.appendChild(css);
    (document.body || document.documentElement).appendChild(ov);

    var input = ov.querySelector('#fg-input');
    var err = ov.querySelector('#fg-error');
    setTimeout(function () { input.focus(); }, 50);

    ov.querySelector('#fg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === required()) {
        safeSet(sessionStorage, UNLOCK_KEY, '1');
        document.documentElement.style.overflow = '';
        ov.remove();
      } else {
        err.textContent = 'Incorrect password';
        ov.classList.remove('shake');
        void ov.offsetWidth;
        ov.classList.add('shake');
        input.select();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showLock);
  } else {
    showLock();
  }

  // expose a tiny helper so the app's Settings screen can add a "Lock app" action
  window.FieldGate = {
    lock: function () { safeDel(sessionStorage, UNLOCK_KEY); location.reload(); },
    hasPassword: function () { return !!required(); },
    clearPassword: function () { safeDel(localStorage, PW_KEY); safeDel(sessionStorage, UNLOCK_KEY); }
  };
})();
