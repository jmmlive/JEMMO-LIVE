/* =========================================================
   JEMMO LIVE · MONEDERO GLOBAL PRUEBA 03
   Un solo saldo por usuario para Perfil, Inicio, LIVE y Salas
   ========================================================= */
(() => {
  'use strict';
  if (window.JemmoWallet?.version) return;

  const VERSION = '3.0.0-test';
  const byId = id => document.getElementById(id);
  const formatNumber = value => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('es-ES');
  const formatMoney = value => Math.max(0, Number(value) || 0).toLocaleString('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const currentUid = () => localStorage.getItem('jemmo_active_uid') || 'local-user';
  const storageKey = () => `jemmo_wallet_v1_${currentUid()}`;
  const defaults = () => ({
    schemaVersion: 3,
    jemmos: 0,
    jems: 0,
    crystals: 0,
    methodType: '',
    methodAlias: '',
    history: [],
    updatedAt: Date.now()
  });

  function normalize(input) {
    const value = input && typeof input === 'object' ? input : {};
    const modern = Number(value.schemaVersion) >= 2 || ['jemmos','jems','crystals'].some(key => Object.prototype.hasOwnProperty.call(value, key));
    let jemmos;
    let jems;
    let crystals;
    if (modern) {
      jemmos = Number(value.jemmos ?? value.coins) || 0;
      jems = Number(value.jems ?? value.earnings) || 0;
      crystals = Number(value.crystals ?? value.diamonds) || 0;
    } else {
      // Migración de PRUEBA 01: lo que se llamó “diamantes” era realmente CRISTALES.
      jemmos = Number(value.coins) || 0;
      crystals = Number(value.diamonds) || 0;
      // El antiguo saldo en euros se conserva como JEMS (100 JEMS por cada euro de prueba).
      jems = Math.round((Number(value.earnings) || 0) * 100);
    }
    jemmos = Math.max(0, Math.floor(jemmos));
    jems = Math.max(0, Math.floor(jems));
    crystals = Math.max(0, Math.floor(crystals));
    return {
      ...defaults(),
      ...value,
      schemaVersion: 3,
      jemmos,
      jems,
      crystals,
      // Alias temporales para las pantallas antiguas mientras se actualizan.
      coins: jemmos,
      diamonds: crystals,
      earnings: jems,
      methodType: String(value.methodType || ''),
      methodAlias: String(value.methodAlias || ''),
      history: Array.isArray(value.history) ? value.history.slice(0, 150) : [],
      updatedAt: Number(value.updatedAt) || Date.now()
    };
  }

  function getWallet() {
    try {
      return normalize(JSON.parse(localStorage.getItem(storageKey()) || 'null'));
    } catch {
      return defaults();
    }
  }

  function emit(wallet, source = 'global') {
    const detail = { wallet: normalize(wallet), uid: currentUid(), source };
    window.dispatchEvent(new CustomEvent('jemmo-wallet-change', { detail }));
    document.dispatchEvent(new CustomEvent('jemmo-wallet-change', { detail }));
    syncVisibleBalances(detail.wallet);
  }

  function saveWallet(next, source = 'global') {
    const wallet = normalize(next);
    wallet.updatedAt = Date.now();
    localStorage.setItem(storageKey(), JSON.stringify(wallet));
    emit(wallet, source);
    return wallet;
  }

  function movement(type, title, detail, amount, tone = 'neutral') {
    const wallet = getWallet();
    wallet.history.unshift({
      id: `W-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      detail,
      amount,
      tone,
      createdAt: Date.now()
    });
    return saveWallet(wallet, type);
  }

  function addCoins(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return getWallet();
    const wallet = getWallet();
    wallet.jemmos += amount;
    wallet.history.unshift({
      id: `W-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: meta.type || 'recharge',
      title: meta.title || 'Recarga de prueba',
      detail: meta.detail || 'JEMMOS añadidos a esta cuenta',
      amount: `+${formatNumber(amount)} JEMMOS`,
      tone: 'positive',
      createdAt: Date.now()
    });
    return saveWallet(wallet, meta.source || 'add-jemmos');
  }

  function spendCoins(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    const wallet = getWallet();
    if (!amount || wallet.jemmos < amount) return { ok: false, wallet, missing: Math.max(0, amount - wallet.jemmos) };
    wallet.jemmos -= amount;
    wallet.history.unshift({
      id: `W-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: meta.type || 'gift',
      title: meta.title || 'Regalo enviado',
      detail: meta.detail || 'Gasto realizado dentro de JEMMO LIVE',
      amount: `-${formatNumber(amount)} JEMMOS`,
      tone: 'negative',
      createdAt: Date.now()
    });
    return { ok: true, wallet: saveWallet(wallet, meta.source || 'spend-jemmos') };
  }

  function addJems(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return getWallet();
    const wallet = getWallet();
    wallet.jems += amount;
    wallet.history.unshift({
      id: `W-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: meta.type || 'gift-received',
      title: meta.title || 'Regalo recibido',
      detail: meta.detail || 'JEMS acreditados por regalos o tareas',
      amount: `+${formatNumber(amount)} JEMS`,
      tone: 'positive',
      createdAt: Date.now()
    });
    return saveWallet(wallet, meta.source || 'add-jems');
  }

  function addCrystals(amount, meta = {}) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return getWallet();
    const wallet = getWallet();
    wallet.crystals += amount;
    wallet.history.unshift({
      id: `W-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: meta.type || 'crystals',
      title: meta.title || 'Cristales añadidos',
      detail: meta.detail || 'Saldo para juegos y minijuegos',
      amount: `+${formatNumber(amount)} CRISTALES`,
      tone: 'positive',
      createdAt: Date.now()
    });
    return saveWallet(wallet, meta.source || 'add-crystals');
  }

  function toast(text) {
    let node = byId('jw-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'jw-toast';
      node.className = 'jw-toast';
      document.body.append(node);
    }
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function injectStyles() {
    if (byId('jemmo-wallet-global-style')) return;
    const style = document.createElement('style');
    style.id = 'jemmo-wallet-global-style';
    style.textContent = `
      :root{--jw-gold:#ffd34e;--jw-purple:#bd3cff;--jw-green:#51dfa0;--jw-muted:#b9a9c0}
      .jw-backdrop{position:fixed;inset:0;z-index:2147483000;background:#030004dc;backdrop-filter:blur(6px)}
      .jw-sheet{position:fixed;z-index:2147483001;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,520px);height:min(94svh,820px);padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px));border:1px solid #7a2c92;border-radius:26px 26px 0 0;background:radial-gradient(circle at 76% 0,#4e0862 0,#1b0325 28%,#09000d 72%);color:#fff;box-shadow:0 -24px 70px #000;overflow:auto;overscroll-behavior:contain;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      .jw-sheet[hidden],.jw-backdrop[hidden]{display:none!important}.jw-head{position:sticky;top:-14px;z-index:3;display:flex;align-items:center;gap:10px;margin:-14px -14px 12px;padding:calc(14px + env(safe-area-inset-top,0px)) 14px 12px;background:linear-gradient(180deg,#24052ff8,#17021ff2);border-bottom:1px solid #5d2170;backdrop-filter:blur(16px)}
      .jw-head-copy{min-width:0;flex:1}.jw-head-copy small{display:block;color:var(--jw-gold);font-size:8px;font-weight:1000;letter-spacing:.14em}.jw-head-copy strong{display:block;margin-top:2px;font-size:21px}.jw-head-copy span{display:block;margin-top:2px;color:#bdafc2;font-size:9px}.jw-close{width:40px;height:40px;flex:0 0 40px;border:1px solid #74328a;border-radius:13px;background:#25062e;color:#fff;font-size:25px}
      .jw-test{display:inline-flex;align-items:center;gap:5px;margin-bottom:10px;padding:6px 9px;border:1px solid #9a7024;border-radius:999px;background:#2a1806;color:#ffe292;font-size:8px;font-weight:1000}.jw-balances{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jw-balance{min-height:88px;padding:12px;border:1px solid #653078;border-radius:18px;background:linear-gradient(150deg,#260731,#100116);box-shadow:inset 0 0 24px #bb35ff12}.jw-balance.coins{border-color:#8d6b22;background:linear-gradient(150deg,#3c2808,#171006)}.jw-balance.earnings{grid-column:1/-1;min-height:76px;background:linear-gradient(150deg,#103125,#08150f);border-color:#276b4d}.jw-balance small{display:flex;align-items:center;gap:5px;color:#c9bacd;font-size:8px;font-weight:900}.jw-balance b{display:block;margin-top:7px;font-size:25px;line-height:1}.jw-balance.coins b{color:var(--jw-gold)}.jw-balance.diamonds b{color:#df7bff}.jw-balance.earnings b{color:#62e6a1}.jw-balance em{display:block;margin-top:6px;color:#9f91a5;font-size:8px;font-style:normal}
      .jw-tabs{display:flex;gap:7px;margin:12px -2px 10px;padding:2px;overflow-x:auto;scrollbar-width:none}.jw-tabs::-webkit-scrollbar{display:none}.jw-tab{flex:0 0 auto;min-height:36px;padding:0 12px;border:1px solid #572769;border-radius:999px;background:#14031b;color:#bfaec6;font-size:8px;font-weight:1000}.jw-tab.active{border-color:var(--jw-gold);background:linear-gradient(135deg,#5c3d08,#2a1204);color:#ffe28b;box-shadow:0 0 15px #ffd34e2a}.jw-view{display:grid;gap:10px}.jw-view[hidden]{display:none!important}.jw-card{padding:13px;border:1px solid #542267;border-radius:18px;background:#110117d9}.jw-card h3{margin:0;font-size:14px}.jw-card>p{margin:5px 0 0;color:#ad9eb3;font-size:9px;line-height:1.4}.jw-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.jw-shortcut{min-height:68px;padding:8px 5px;border:1px solid #643078;border-radius:15px;background:#1b0524;color:#fff;font-size:9px;font-weight:950}.jw-shortcut span{display:block;margin-bottom:4px;font-size:22px}.jw-shortcut.gold{border-color:#8b6721;background:#2d1d06;color:#ffe18a}
      .jw-packages{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jw-package{min-height:82px;padding:10px;border:1px solid #7b5b1e;border-radius:17px;background:radial-gradient(circle at 80% 10%,#ffcf4730,transparent 36%),linear-gradient(150deg,#3b2607,#170d03);color:#fff;text-align:left}.jw-package strong{display:block;color:var(--jw-gold);font-size:18px}.jw-package small{display:block;margin-top:5px;color:#d6c298;font-size:8px}.jw-package span{display:inline-block;margin-top:8px;padding:4px 7px;border-radius:999px;background:var(--jw-gold);color:#2b1703;font-size:7px;font-weight:1000}.jw-field{display:grid;gap:6px}.jw-field>span{color:#e6dbe9;font-size:9px;font-weight:900}.jw-field input,.jw-field select{width:100%;min-height:45px;border:1px solid #5c2a6d;border-radius:13px;background:#09000d;color:#fff;padding:0 12px;outline:none}.jw-field input:focus,.jw-field select:focus{border-color:var(--jw-gold);box-shadow:0 0 0 3px #ffd34e1d}.jw-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jw-preview{padding:11px;border:1px dashed #6c377d;border-radius:14px;background:#0b010f;color:#bfaec5;font-size:9px;line-height:1.45}.jw-preview b{color:#ffe17c}.jw-primary{width:100%;min-height:47px;border:0;border-radius:14px;background:linear-gradient(90deg,var(--jw-gold),#d63aff);color:#1c031f;font-weight:1000}.jw-secondary{width:100%;min-height:42px;border:1px solid #673079;border-radius:13px;background:#210529;color:#fff;font-weight:900}.jw-note{padding:10px;border:1px solid #6e5320;border-radius:13px;background:#251706;color:#dbc991;font-size:8px;line-height:1.45}
      .jw-method{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px;border:1px solid #492057;border-radius:14px;background:#0b010f}.jw-method span{min-width:0}.jw-method b{display:block;font-size:10px}.jw-method small{display:block;margin-top:2px;color:#9f91a5;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jw-method button{min-height:32px;padding:0 10px;border:1px solid #6b2c80;border-radius:10px;background:#270730;color:#fff;font-size:8px;font-weight:950}.jw-history{display:grid;gap:8px}.jw-empty{padding:24px 12px;border:1px dashed #50305a;border-radius:16px;color:#8f8095;text-align:center;font-size:9px}.jw-movement{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid #482057;border-radius:14px;background:#0d0112}.jw-movement-icon{width:36px;height:36px;border-radius:12px;background:#2b0736;display:grid;place-items:center;font-size:18px}.jw-movement-copy{min-width:0}.jw-movement-copy b{display:block;font-size:9.5px}.jw-movement-copy small{display:block;margin-top:3px;color:#94869a;font-size:7.5px;line-height:1.3}.jw-movement-amount{text-align:right;font-size:9px;font-weight:1000;white-space:nowrap}.jw-movement-amount.positive{color:#62e6a1}.jw-movement-amount.negative{color:#ff8fa4}.jw-movement-amount.neutral{color:#ffe17b}.jw-rate{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid #51305d;border-radius:13px;background:#0b010f;color:#a898ae;font-size:8px}.jw-rate b{color:#ffe17b}
      .jw-toast{position:fixed;z-index:2147483647;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));transform:translate(-50%,18px);max-width:min(86vw,420px);padding:10px 14px;border:1px solid #8b3aa5;border-radius:14px;background:#19051ff2;color:#fff;font:800 11px/1.35 Inter,system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;transition:.18s}.jw-toast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:380px){.jw-sheet{padding-left:11px;padding-right:11px}.jw-head{margin-left:-11px;margin-right:-11px;padding-left:11px;padding-right:11px}.jw-form-grid{grid-template-columns:1fr}.jw-actions{gap:6px}.jw-shortcut{font-size:8px}}
    `;
    document.head.append(style);
  }

  function walletMarkup() {
    return `
      <div class="jw-backdrop" id="jw-backdrop" hidden></div>
      <section class="jw-sheet" id="jw-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="jw-title">
        <div class="jw-head"><div class="jw-head-copy"><small>ECONOMÍA JEMMO</small><strong id="jw-title">Mi monedero</strong><span>El mismo saldo en Perfil, Inicio, LIVE y Salas</span></div><button class="jw-close" id="jw-close" type="button" aria-label="Cerrar">×</button></div>
        <div class="jw-test">⚠ MODO DE PRUEBAS · SIN COBROS REALES</div>
        <div class="jw-balances">
          <article class="jw-balance coins"><small>🪙 JEMMOS</small><b id="jw-jemmos">0</b><em>Moneda amarilla recargable para regalos e interacción</em></article>
          <article class="jw-balance diamonds"><small>💗 JEMS</small><b id="jw-jems">0</b><em>Ganancias rosadas por regalos y tareas; son retirables</em></article>
          <article class="jw-balance earnings"><small>💎 CRISTALES</small><b id="jw-crystals">0</b><em>Diamantes azules para juegos, ruletas y minijuegos</em></article>
        </div>
        <div class="jw-tabs" role="tablist"><button class="jw-tab active" data-jw-tab="summary">RESUMEN</button><button class="jw-tab" data-jw-tab="recharge">RECARGAR</button><button class="jw-tab" data-jw-tab="exchange">CAMBIAR</button><button class="jw-tab" data-jw-tab="withdraw">RETIRAR</button><button class="jw-tab" data-jw-tab="history">HISTORIAL</button></div>
        <div class="jw-view" data-jw-view="summary">
          <article class="jw-card"><h3>Tres monedas, tres funciones</h3><p>JEMMOS para recargar y regalar; JEMS para recibir ganancias y retirar; CRISTALES para jugar.</p><div class="jw-actions"><button class="jw-shortcut gold" data-jw-go="recharge"><span>🪙</span>Recargar</button><button class="jw-shortcut" data-jw-go="exchange"><span>⇄</span>Cambiar</button><button class="jw-shortcut" data-jw-go="withdraw"><span>↗</span>Retirar JEMS</button></div></article>
          <article class="jw-card"><h3>Últimos movimientos</h3><p>Las recargas, regalos, cambios y retiradas quedan registradas por cuenta.</p><div class="jw-history" id="jw-recent"></div></article>
        </div>
        <div class="jw-view" data-jw-view="recharge" hidden>
          <article class="jw-card"><h3>Recargar JEMMOS de prueba</h3><p>Añade moneda amarilla ficticia para probar regalos e interacción.</p></article>
          <div class="jw-packages"><button class="jw-package" data-jw-recharge="1000"><strong>1.000</strong><small>JEMMOS amarillos</small><span>AÑADIR</span></button><button class="jw-package" data-jw-recharge="5000"><strong>5.000</strong><small>JEMMOS amarillos</small><span>AÑADIR</span></button><button class="jw-package" data-jw-recharge="10000"><strong>10.000</strong><small>JEMMOS amarillos</small><span>AÑADIR</span></button><button class="jw-package" data-jw-recharge="50000"><strong>50.000</strong><small>JEMMOS amarillos</small><span>AÑADIR</span></button></div>
          <p class="jw-note">La recarga es ficticia. Solo aumenta los JEMMOS de esta cuenta para realizar pruebas.</p>
        </div>
        <div class="jw-view" data-jw-view="exchange" hidden>
          <article class="jw-card"><h3>Intercambiar correctamente</h3><p>Los JEMMOS sí se cambian por CRISTALES para jugar. Los JEMS no se crean mediante cambios: se reciben por regalos y tareas.</p></article>
          <label class="jw-field"><span>Tipo de cambio</span><select id="jw-exchange-type"><option value="jemmos-crystals">JEMMOS → CRISTALES</option><option value="crystals-jemmos">CRISTALES → JEMMOS</option><option value="jems-jemmos">JEMS → JEMMOS</option></select></label>
          <label class="jw-field"><span id="jw-exchange-label">Cantidad de JEMMOS</span><input id="jw-exchange-amount" type="number" min="1" inputmode="numeric" placeholder="Escribe la cantidad"></label>
          <div class="jw-preview" id="jw-exchange-preview">Escribe una cantidad para calcular el resultado.</div>
          <button class="jw-primary" id="jw-exchange-confirm" type="button" disabled>CONFIRMAR CAMBIO</button>
          <div class="jw-rate"><span>JEMMOS ↔ CRISTALES</span><b>10 = 1</b></div><div class="jw-rate"><span>JEMS → JEMMOS</span><b>1 = 10</b></div>
        </div>
        <div class="jw-view" data-jw-view="withdraw" hidden>
          <article class="jw-card"><h3>Retirar JEMS de prueba</h3><p>La retirada descuenta directamente las monedas rosadas JEMS. Los CRISTALES no se retiran.</p><div class="jw-method"><span><b id="jw-method-name">Sin configurar</b><small id="jw-method-alias">Añade un método de prueba</small></span><button data-jw-focus-method type="button">EDITAR</button></div></article>
          <div class="jw-form-grid"><label class="jw-field"><span>Método</span><select id="jw-method-type"><option value="">Seleccionar</option><option>Transferencia bancaria</option><option>PayPal</option><option>USDT</option><option>Otro método</option></select></label><label class="jw-field"><span>Alias o referencia</span><input id="jw-method-input" maxlength="60" placeholder="Dato de prueba"></label></div>
          <button class="jw-secondary" id="jw-save-method" type="button">GUARDAR MÉTODO</button>
          <label class="jw-field"><span>Cantidad de JEMS · disponible <b id="jw-withdraw-available">0</b></span><input id="jw-withdraw-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="0"></label>
          <button class="jw-primary" id="jw-withdraw-confirm" type="button">SOLICITAR RETIRADA</button>
          <p class="jw-note">La retirada es ficticia: los JEMS bajan y el movimiento queda guardado, pero no sale dinero real.</p>
        </div>
        <div class="jw-view" data-jw-view="history" hidden><article class="jw-card"><h3>Historial completo</h3><p>Todos los movimientos de esta cuenta.</p></article><div class="jw-history" id="jw-history"></div></div>
      </section>`;
  }


  function ensureUi() {
    if (byId('jw-sheet')) return true;
    injectStyles();
    const wrap = document.createElement('div');
    wrap.id = 'jemmo-wallet-global-root';
    wrap.innerHTML = walletMarkup();
    document.body.append(wrap);
    bindUi();
    render();
    return true;
  }

  function iconFor(type) {
    return ({ recharge: '🪙', gift: '🎁', exchange: '⇄', withdraw: '↗', method: '⚙️', adjustment: '✦', 'gift-received': '💗', crystals: '💎' }[type] || '•');
  }

  function movementNode(item) {
    const row = document.createElement('article');
    row.className = 'jw-movement';
    const date = new Date(Number(item.createdAt) || Date.now()).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    row.innerHTML = `<span class="jw-movement-icon"></span><span class="jw-movement-copy"><b></b><small></small></span><span class="jw-movement-amount"></span>`;
    row.querySelector('.jw-movement-icon').textContent = iconFor(item.type);
    row.querySelector('.jw-movement-copy b').textContent = item.title || 'Movimiento';
    row.querySelector('.jw-movement-copy small').textContent = `${item.detail || ''} · ${date}`;
    const amount = row.querySelector('.jw-movement-amount');
    amount.textContent = item.amount || '';
    amount.classList.add(item.tone || 'neutral');
    return row;
  }

  function renderHistory(target, limit) {
    if (!target) return;
    target.replaceChildren();
    const list = getWallet().history.slice(0, limit || 150);
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'jw-empty';
      empty.textContent = 'Todavía no hay movimientos en este monedero.';
      target.append(empty);
      return;
    }
    list.forEach(item => target.append(movementNode(item)));
  }

  function exchangeCalculation() {
    const type = byId('jw-exchange-type')?.value;
    const requested = Math.floor(Number(byId('jw-exchange-amount')?.value) || 0);
    const wallet = getWallet();
    if (requested <= 0) return { valid: false, message: 'Escribe una cantidad para calcular el resultado.' };
    if (type === 'jemmos-crystals') {
      const output = Math.floor(requested / 10), used = output * 10;
      if (output < 1) return { valid: false, message: 'Se necesitan al menos 10 JEMMOS.' };
      return { valid: wallet.jemmos >= used, input: used, output, type, message: `Recibirás <b>${formatNumber(output)} CRISTALES</b> usando ${formatNumber(used)} JEMMOS.${wallet.jemmos < used ? ' Saldo insuficiente.' : ''}` };
    }
    if (type === 'crystals-jemmos') {
      return { valid: wallet.crystals >= requested, input: requested, output: requested * 10, type, message: `Recibirás <b>${formatNumber(requested * 10)} JEMMOS</b> usando ${formatNumber(requested)} CRISTALES.${wallet.crystals < requested ? ' Saldo insuficiente.' : ''}` };
    }
    return { valid: wallet.jems >= requested, input: requested, output: requested * 10, type, message: `Recibirás <b>${formatNumber(requested * 10)} JEMMOS</b> usando ${formatNumber(requested)} JEMS.${wallet.jems < requested ? ' Saldo insuficiente.' : ''}` };
  }

  function updateExchangePreview() {
    const type = byId('jw-exchange-type')?.value;
    if (!byId('jw-exchange-preview')) return;
    byId('jw-exchange-label').textContent = type === 'jemmos-crystals' ? 'Cantidad de JEMMOS' : type === 'crystals-jemmos' ? 'Cantidad de CRISTALES' : 'Cantidad de JEMS';
    const result = exchangeCalculation();
    byId('jw-exchange-preview').innerHTML = result.message;
    byId('jw-exchange-confirm').disabled = !result.valid;
  }

  function showTab(name = 'summary') {
    if (!ensureUi()) return;
    document.querySelectorAll('[data-jw-tab]').forEach(button => button.classList.toggle('active', button.dataset.jwTab === name));
    document.querySelectorAll('[data-jw-view]').forEach(view => { view.hidden = view.dataset.jwView !== name; });
    if (name === 'history') renderHistory(byId('jw-history'), 150);
    render();
  }

  function render() {
    const wallet = getWallet();
    if (byId('jw-jemmos')) byId('jw-jemmos').textContent = formatNumber(wallet.jemmos);
    if (byId('jw-jems')) byId('jw-jems').textContent = formatNumber(wallet.jems);
    if (byId('jw-crystals')) byId('jw-crystals').textContent = formatNumber(wallet.crystals);
    if (byId('jw-withdraw-available')) byId('jw-withdraw-available').textContent = formatNumber(wallet.jems);
    if (byId('jw-method-name')) byId('jw-method-name').textContent = wallet.methodType || 'Sin configurar';
    if (byId('jw-method-alias')) byId('jw-method-alias').textContent = wallet.methodAlias || 'Añade un método de prueba';
    if (byId('jw-method-type')) byId('jw-method-type').value = wallet.methodType || '';
    if (byId('jw-method-input')) byId('jw-method-input').value = wallet.methodAlias || '';
    renderHistory(byId('jw-recent'), 3);
    renderHistory(byId('jw-history'), 150);
    updateExchangePreview();
    syncVisibleBalances(wallet);
  }

  function open(tab = 'summary') {
    if (!ensureUi()) return;
    const legacySheet = byId('walletSheet');
    if (legacySheet) { legacySheet.setAttribute('aria-hidden','true'); legacySheet.hidden = true; legacySheet.classList.remove('open','active','show'); }
    const legacyBackdrop = byId('walletBackdrop') || document.querySelector('.wallet-backdrop,.coin-backdrop,.sheet-backdrop');
    if (legacyBackdrop) legacyBackdrop.hidden = true;
    const sideMenu = byId('sideMenu');
    if (sideMenu) { sideMenu.classList.remove('open'); sideMenu.setAttribute('aria-hidden','true'); }
    if (byId('menuBackdrop')) byId('menuBackdrop').hidden = true;
    render();
    showTab(tab);
    byId('jw-backdrop').hidden = false;
    byId('jw-sheet').hidden = false;
    document.documentElement.dataset.jwOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!byId('jw-sheet')) return;
    byId('jw-backdrop').hidden = true;
    byId('jw-sheet').hidden = true;
    document.body.style.overflow = document.documentElement.dataset.jwOverflow || '';
  }

  function bindUi() {
    byId('jw-close')?.addEventListener('click', close);
    byId('jw-backdrop')?.addEventListener('click', close);
    document.querySelectorAll('[data-jw-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.jwTab)));
    document.querySelectorAll('[data-jw-go]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.jwGo)));
    document.querySelectorAll('[data-jw-recharge]').forEach(button => button.addEventListener('click', () => {
      const amount = Number(button.dataset.jwRecharge) || 0;
      if (!amount || !confirm(`¿Añadir ${formatNumber(amount)} JEMMOS de prueba a esta cuenta?`)) return;
      addCoins(amount, { title: 'Recarga de prueba', detail: 'JEMMOS acreditados desde el Monedero global', source: 'wallet-panel' });
      render();
      toast('Recarga de prueba añadida.');
    }));
    byId('jw-exchange-type')?.addEventListener('change', updateExchangePreview);
    byId('jw-exchange-amount')?.addEventListener('input', updateExchangePreview);
    byId('jw-exchange-confirm')?.addEventListener('click', () => {
      const result = exchangeCalculation();
      if (!result.valid) return toast('Revisa la cantidad o el saldo.');
      const wallet = getWallet();
      if (result.type === 'jemmos-crystals') {
        wallet.jemmos -= result.input; wallet.crystals += result.output;
        wallet.history.unshift({ id: `W-${Date.now()}`, type: 'exchange', title: 'Cambio a CRISTALES', detail: `${formatNumber(result.input)} JEMMOS → ${formatNumber(result.output)} CRISTALES`, amount: `+${formatNumber(result.output)} CRISTALES`, tone: 'positive', createdAt: Date.now() });
      } else if (result.type === 'crystals-jemmos') {
        wallet.crystals -= result.input; wallet.jemmos += result.output;
        wallet.history.unshift({ id: `W-${Date.now()}`, type: 'exchange', title: 'Cambio a JEMMOS', detail: `${formatNumber(result.input)} CRISTALES → ${formatNumber(result.output)} JEMMOS`, amount: `+${formatNumber(result.output)} JEMMOS`, tone: 'positive', createdAt: Date.now() });
      } else {
        wallet.jems -= result.input; wallet.jemmos += result.output;
        wallet.history.unshift({ id: `W-${Date.now()}`, type: 'exchange', title: 'JEMS cambiados a JEMMOS', detail: `${formatNumber(result.input)} JEMS → ${formatNumber(result.output)} JEMMOS`, amount: `+${formatNumber(result.output)} JEMMOS`, tone: 'positive', createdAt: Date.now() });
      }
      saveWallet(wallet, 'exchange');
      byId('jw-exchange-amount').value = '';
      render();
      toast('Cambio realizado en modo de pruebas.');
    });
    byId('jw-save-method')?.addEventListener('click', () => {
      const type = byId('jw-method-type').value;
      const alias = byId('jw-method-input').value.trim();
      if (!type || alias.length < 2) return toast('Selecciona un método y escribe un dato de prueba.');
      const wallet = getWallet();
      wallet.methodType = type; wallet.methodAlias = alias.slice(0, 60);
      wallet.history.unshift({ id: `W-${Date.now()}`, type: 'method', title: 'Método de cobro actualizado', detail: `${type} · ${wallet.methodAlias}`, amount: 'Guardado', tone: 'neutral', createdAt: Date.now() });
      saveWallet(wallet, 'method');
      render();
      toast('Método guardado para esta cuenta.');
    });
    byId('jw-withdraw-confirm')?.addEventListener('click', () => {
      const amount = Math.max(0, Math.floor(Number(byId('jw-withdraw-amount').value) || 0));
      const wallet = getWallet();
      if (!wallet.methodType || !wallet.methodAlias) return toast('Primero guarda un método de cobro.');
      if (amount < 1) return toast('Escribe la cantidad de JEMS que deseas retirar.');
      if (amount > wallet.jems) return toast('No tienes JEMS suficientes.');
      if (!confirm(`¿Retirar ficticiamente ${formatNumber(amount)} JEMS?`)) return;
      wallet.jems -= amount;
      wallet.history.unshift({ id: `W-${Date.now()}`, type: 'withdraw', title: 'Retirada de JEMS', detail: `${wallet.methodType} · retirada ficticia`, amount: `-${formatNumber(amount)} JEMS`, tone: 'negative', createdAt: Date.now() });
      saveWallet(wallet, 'withdraw');
      byId('jw-withdraw-amount').value = '';
      render();
      toast('Retirada ficticia registrada.');
    });
    document.querySelector('[data-jw-focus-method]')?.addEventListener('click', () => byId('jw-method-type')?.focus());
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function syncLegacyCurrencyCards(wallet) {
    const values = {
      monedas: { label: 'JEMMOS', value: formatNumber(wallet.jemmos) },
      diamantes: { label: 'JEMS', value: formatNumber(wallet.jems) },
      ganancias: { label: 'CRISTALES', value: formatNumber(wallet.crystals) }
    };
    document.querySelectorAll('small,span,b,strong').forEach(labelNode => {
      if (labelNode.closest('#jw-sheet')) return;
      const raw = (labelNode.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const key = Object.keys(values).find(name => raw === name || raw === `${name}:`);
      if (!key) return;
      const card = labelNode.closest('[class*="wallet"],[class*="coin"],[class*="balance"],button,article,li,section,div');
      if (!card) return;
      const numeric = [...card.querySelectorAll('strong,b,span')].find(node => {
        if (node === labelNode || node.contains(labelNode) || labelNode.contains(node)) return false;
        const text = (node.textContent || '').trim();
        return /^[-+]?\d[\d.,\s]*(?:€)?$/.test(text);
      });
      setText(labelNode, values[key].label);
      if (numeric) {
        setText(numeric, values[key].value);
        if (key === 'monedas') numeric.dataset.jemmoJemmos = '';
        if (key === 'diamantes') numeric.dataset.jemmoJems = '';
        if (key === 'ganancias') numeric.dataset.jemmoCrystals = '';
      }
    });
  }

  function syncVisibleBalances(wallet = getWallet()) {
    const jemmos = formatNumber(wallet.jemmos);
    const jems = formatNumber(wallet.jems);
    const crystals = formatNumber(wallet.crystals);
    document.querySelectorAll('[data-wallet="jemmos"] strong,[data-jemmo-coins],[data-jemmo-jemmos]').forEach(node => setText(node, jemmos));
    document.querySelectorAll('[data-wallet="jems"] strong,[data-jemmo-diamonds],[data-jemmo-jems]').forEach(node => setText(node, jems));
    document.querySelectorAll('[data-wallet="cristales"] strong,[data-jemmo-earnings],[data-jemmo-crystals]').forEach(node => setText(node, crystals));
    document.querySelectorAll('[data-wallet="jemmos"] small').forEach(node => setText(node, 'JEMMOS'));
    document.querySelectorAll('[data-wallet="jems"] small').forEach(node => setText(node, 'JEMS'));
    document.querySelectorAll('[data-wallet="cristales"] small').forEach(node => setText(node, 'CRISTALES'));
    syncLegacyCurrencyCards(wallet);

    // Cabecera económica antigua de Inicio: conserva los iconos y corrige nombres/saldos.
    document.querySelectorAll('[data-jemmo-coins]').forEach(node => {
      const card = node.closest('article,button,div');
      const label = card?.querySelector('small,span');
      if (label && /monedas|jemmos/i.test(label.textContent || '')) setText(label, 'JEMMOS');
    });
    document.querySelectorAll('[data-jemmo-diamonds]').forEach(node => {
      const card = node.closest('article,button,div');
      const label = card?.querySelector('small,span');
      if (label && /diamantes|jems/i.test(label.textContent || '')) setText(label, 'JEMS');
    });
    document.querySelectorAll('[data-jemmo-earnings]').forEach(node => {
      const card = node.closest('article,button,div');
      const label = card?.querySelector('small,span');
      if (label && /ganancias|cristales/i.test(label.textContent || '')) setText(label, 'CRISTALES');
    });

    // Corrige también el panel antiguo “Centro de monedas” de Inicio.
    const legacy = byId('walletSheet');
    if (legacy) {
      const gold = legacy.querySelector('.wallet-detail.gold strong');
      const pink = legacy.querySelector('.wallet-detail.pink strong');
      const blue = legacy.querySelector('.wallet-detail.blue strong');
      setText(gold, `JEMMOS · ${jemmos}`);
      setText(pink, `JEMS · ${jems}`);
      setText(blue, `CRISTALES · ${crystals}`);
      setText(legacy.querySelector('.wallet-detail.gold small'), 'Moneda amarilla recargable para regalos e interacción.');
      setText(legacy.querySelector('.wallet-detail.pink small'), 'Ganancias rosadas por regalos y tareas. Se pueden retirar.');
      setText(legacy.querySelector('.wallet-detail.blue small'), 'Moneda azul para juegos, ruletas y minijuegos.');
    }

    const giftBalance = byId('giftBalance');
    if (giftBalance && document.body.dataset.jemmoWalletNativeGifts !== 'true') {
      const current = giftBalance.textContent || '';
      const value = /saldo|jemmos/i.test(current) ? `Saldo: ${jemmos} JEMMOS` : jemmos;
      setText(giftBalance, value);
    }
  }

  function shouldOpenWallet(element) {
    if (!element || element.closest('#jw-sheet')) return false;
    if (element.matches('[data-open-wallet],#walletPlus,[data-wallet],[data-action="wallet"]')) return true;
    const label = element.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
    return label.includes('monedero') || label.includes('recargar') || label.includes('intercambiar') || label.includes('cambiar') || label.includes('retirar') || label.includes('historial');
  }

  function bindOpeners(root = document) {
    root.querySelectorAll?.('button,a,[data-open-wallet],[data-wallet],[data-action="wallet"]').forEach(element => {
      if (element.dataset.jwBound === '1' || !shouldOpenWallet(element)) return;
      element.dataset.jwBound = '1';
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const label = element.textContent?.toLowerCase() || '';
        const tab = label.includes('recarg') ? 'recharge' : label.includes('intercamb') || label.includes('cambiar') ? 'exchange' : label.includes('retir') ? 'withdraw' : label.includes('historial') ? 'history' : 'summary';
        open(tab);
      }, true);
    });
  }

  const liveGiftPrices = { rose: 10, fish: 50, crown: 250, rocket: 500, diamond: 900, castle: 1500 };

  function numericText(value) {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    return Number(digits) || 0;
  }

  function giftPrice(button) {
    const direct = Number(button.dataset.cost || button.dataset.price);
    if (direct > 0) return direct;
    const mapped = Number(liveGiftPrices[button.dataset.gift]);
    if (mapped > 0) return mapped;
    const text = button.textContent || '';
    const match = text.replace(/\./g, '').match(/(\d+)\s*(?:JEMMOS|monedas?)?/i);
    return match ? Number(match[1]) : 0;
  }

  function giftName(button) {
    const label = button.querySelector('b')?.textContent?.trim();
    return label || button.dataset.gift || 'Regalo';
  }

  function giftIcon(button) {
    const icon = button.querySelector('span')?.textContent?.trim();
    const raw = String(button.dataset.gift || '');
    return icon || (/[^a-z0-9_-]/i.test(raw) ? raw : '🎁');
  }

  function closeGiftPanels() {
    ['giftSheet', 'giftsSheet'].forEach(id => {
      const node = byId(id);
      if (node) {
        node.hidden = true;
      }
    });
    ['liveModalBackdrop', 'liveBackdrop'].forEach(id => {
      const node = byId(id);
      if (node) node.hidden = true;
    });
  }

  function updateLiveGiftVisuals(button, price) {
    const name = giftName(button);
    const icon = giftIcon(button);
    const giftCount = byId('giftCount');
    const giftTotal = byId('giftTotal');
    if (giftCount) setText(giftCount, `🎁 ${formatNumber(numericText(giftCount.textContent) + price)}`);
    if (giftTotal) setText(giftTotal, formatNumber(numericText(giftTotal.textContent) + price));

    const burst = byId('giftBurst');
    if (burst) {
      setText(byId('giftBurstIcon'), icon);
      setText(byId('giftBurstText'), `${name} enviado · ${formatNumber(price)} JEMMOS`);
      burst.hidden = false;
      burst.style.animation = 'none';
      void burst.offsetWidth;
      burst.style.animation = '';
      clearTimeout(updateLiveGiftVisuals.timer);
      updateLiveGiftVisuals.timer = setTimeout(() => { burst.hidden = true; }, 1800);
    }

    const chat = byId('liveChat');
    if (chat) {
      const line = document.createElement('div');
      line.className = chat.querySelector('.jl-chat-line') ? 'jl-chat-line' : 'jl-chat-line';
      line.textContent = `Tú enviaste ${icon} ${name} · ${formatNumber(price)} puntos`;
      chat.append(line);
      while (chat.children.length > 6) chat.firstElementChild?.remove();
      chat.scrollTop = chat.scrollHeight;
    }

    const scoreA = byId('scoreA');
    const scoreB = byId('scoreB');
    if (scoreA) {
      const nextA = numericText(scoreA.textContent) + price;
      setText(scoreA, formatNumber(nextA));
      const currentB = numericText(scoreB?.textContent);
      const total = Math.max(1, nextA + currentB);
      const percent = Math.round(nextA / total * 100);
      if (byId('barA')) byId('barA').style.width = `${percent}%`;
      if (byId('barB')) byId('barB').style.width = `${100 - percent}%`;
    }
    closeGiftPanels();
  }

  function installLiveGiftBridge() {
    if (document.body.dataset.jemmoWalletNativeGifts === 'true') return;
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-gift]');
      if (!button || button.closest('#jw-sheet,#walletSheet')) return;
      const price = giftPrice(button);
      if (!price) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const result = spendCoins(price, {
        title: 'Regalo enviado en LIVE',
        detail: `${giftIcon(button)} ${giftName(button)}`,
        source: 'live-gift'
      });
      if (!result.ok) {
        toast(`Saldo insuficiente. Faltan ${formatNumber(result.missing)} JEMMOS.`);
        open('recharge');
        return;
      }
      updateLiveGiftVisuals(button, price);
      syncVisibleBalances(result.wallet);
      toast(`${giftName(button)} enviado.`);
    }, true);
  }

  function boot() {
    injectStyles();
    syncVisibleBalances();
    bindOpeners();
    installLiveGiftBridge();
    const observer = new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(node => { if (node.nodeType === 1) bindOpeners(node); });
      syncVisibleBalances();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('storage', event => { if (event.key === storageKey()) emit(getWallet(), 'storage'); });
    window.addEventListener('jemmo-wallet-change', () => render());
    window.addEventListener('pageshow', () => { syncVisibleBalances(); render(); });
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && byId('jw-sheet') && !byId('jw-sheet').hidden) close(); });
  }

  window.JemmoWallet = Object.freeze({
    version: VERSION,
    key: storageKey,
    get: getWallet,
    save: saveWallet,
    addCoins,
    spendCoins,
    addJems,
    addDiamonds: addJems,
    addCrystals,
    addEarnings: addJems,
    record: movement,
    open,
    close,
    showTab,
    render,
    formatNumber,
    formatMoney
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
