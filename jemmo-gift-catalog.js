/* JEMMO LIVE V1 · CATÁLOGO UNIVERSAL DE REGALOS · PRUEBA 61
   Unifica precios y limita cada regalo por destinatario a 5.000.000 JEMMOS.
*/
(() => {
  'use strict';
  if (window.JemmoGiftCatalog?.version === 61) return;

  const MAX_PER_RECIPIENT = 5_000_000;
  const CATALOG = Object.freeze([
    { id:'rosa-jemmo', icon:'🌹', name:'Rosa JEMMO', cost:10, tier:'BÁSICO', animationKey:'rose' },
    { id:'estrella-jemmo', icon:'⭐', name:'Estrella JEMMO', cost:50, tier:'BÁSICO', animationKey:'star' },
    { id:'corona-real', icon:'👑', name:'Corona Real', cost:200, tier:'BÁSICO', animationKey:'crown' },
    { id:'leon-de-oro', icon:'🦁', name:'León de Oro', cost:1_000, tier:'DESTACADO', animationKey:'lion' },
    { id:'chicharro-neon', icon:'🐟', name:'Chicharro Neón', cost:5_000, tier:'DESTACADO', animationKey:'fish' },
    { id:'fuegos-jemmo', icon:'🎆', name:'Fuegos JEMMO', cost:10_000, tier:'DESTACADO', animationKey:'fireworks' },
    { id:'dragon-violeta', icon:'🐉', name:'Dragón Violeta', cost:25_000, tier:'PREMIUM', animationKey:'dragon' },
    { id:'corona-imperial', icon:'🏆', name:'Corona Imperial', cost:50_000, tier:'PREMIUM', animationKey:'imperial-crown' },
    { id:'diamante-jemmo', icon:'💎', name:'Diamante JEMMO', cost:100_000, tier:'PREMIUM', animationKey:'diamond' },
    { id:'universo-jemmo', icon:'🌌', name:'Universo JEMMO', cost:200_000, tier:'GRANDE', animationKey:'universe' },
    { id:'yate-dorado', icon:'🛥️', name:'Yate Dorado', cost:500_000, tier:'GRANDE', animationKey:'yacht' },
    { id:'palacio-jemmo', icon:'🏰', name:'Palacio JEMMO', cost:1_000_000, tier:'ÉPICO', animationKey:'palace' },
    { id:'planeta-jemmo', icon:'🪐', name:'Planeta JEMMO', cost:2_500_000, tier:'ÉPICO', animationKey:'planet' },
    { id:'imperio-jemmo', icon:'✨', name:'Imperio JEMMO', cost:5_000_000, tier:'LEGENDARIO', animationKey:'empire' }
  ].map(item => Object.freeze(item)));

  function baseQuantities(cost) {
    const value = Math.max(0, Number(cost) || 0);
    if (value <= 50_000) return [1, 10, 20, 100];
    if (value <= 250_000) return [1, 5, 10, 20];
    if (value <= 500_000) return [1, 2, 5, 10];
    if (value <= 1_000_000) return [1, 2, 3, 5];
    if (value <= 2_500_000) return [1, 2];
    return [1];
  }

  function quantitiesFor(cost) {
    const value = Math.max(0, Number(cost) || 0);
    return Object.freeze(baseQuantities(value).filter(quantity => value * quantity <= MAX_PER_RECIPIENT));
  }

  function normalizeQuantity(cost, quantity) {
    const allowed = quantitiesFor(cost);
    const requested = Math.max(1, Math.floor(Number(quantity) || 1));
    return allowed.includes(requested) ? requested : 1;
  }

  function validate(cost, quantity) {
    const unit = Math.max(0, Math.floor(Number(cost) || 0));
    const count = Math.max(1, Math.floor(Number(quantity) || 1));
    const total = unit * count;
    const allowed = quantitiesFor(unit);
    return Object.freeze({
      ok: unit > 0 && allowed.includes(count) && total <= MAX_PER_RECIPIENT,
      unit,
      quantity: count,
      total,
      max: MAX_PER_RECIPIENT,
      allowed
    });
  }

  function getById(id) {
    return CATALOG.find(item => item.id === String(id || '')) || null;
  }

  function format(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('es-ES');
  }

  window.JemmoGiftCatalog = Object.freeze({
    version: 61,
    maxPerRecipient: MAX_PER_RECIPIENT,
    catalog: CATALOG,
    quantitiesFor,
    normalizeQuantity,
    validate,
    getById,
    format
  });

  try {
    window.dispatchEvent(new CustomEvent('jemmo-gift-catalog-ready', { detail: { version: 61 } }));
  } catch {}
})();
