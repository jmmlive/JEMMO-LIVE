/* =========================================================
   JEMMO LIVE · ALMACENAMIENTO DURADERO DE PREPARACIÓN
   Portada, título y descripción por usuario (LIVE y Salas)
   ========================================================= */
(() => {
  'use strict';
  if (window.JemmoPrepStorage?.version) return;

  const VERSION = '1.0.0';
  const DB_NAME = 'jemmo_live_preparation_v1';
  const DB_VERSION = 1;
  const STORE = 'drafts';
  const PREFIX = 'jemmo_prep_draft_v1:';
  const memory = new Map();
  let dbPromise = null;

  const safeParse = raw => {
    try {
      const parsed = JSON.parse(raw || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const safeGet = (storage, key) => {
    try { return storage.getItem(key); } catch { return null; }
  };

  const safeSet = (storage, key, value) => {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('indexeddb-unavailable'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('indexeddb-open-failed'));
    });
    return dbPromise;
  }

  async function idbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('indexeddb-read-failed'));
    });
  }

  async function idbPut(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.oncomplete = () => resolve(record);
      transaction.onerror = () => reject(transaction.error || new Error('indexeddb-write-failed'));
      transaction.onabort = () => reject(transaction.error || new Error('indexeddb-write-aborted'));
      transaction.objectStore(STORE).put(record);
    });
  }

  const normalizeRecord = (key, value, fallbackUpdatedAt = 0) => {
    if (!value || typeof value !== 'object') return null;
    if ('data' in value && value.data && typeof value.data === 'object') {
      return {
        key,
        data: value.data,
        updatedAt: Math.max(0, Number(value.updatedAt) || fallbackUpdatedAt)
      };
    }
    return {
      key,
      data: value,
      updatedAt: Math.max(0, Number(value.updatedAt) || fallbackUpdatedAt)
    };
  };

  function readStorageRecord(storage, key) {
    return normalizeRecord(key, safeParse(safeGet(storage, PREFIX + key)));
  }

  function readLegacyRecord(key, legacyKeys = []) {
    for (const legacyKey of legacyKeys) {
      const local = normalizeRecord(key, safeParse(safeGet(localStorage, legacyKey)), 0);
      if (local) return local;
      const session = normalizeRecord(key, safeParse(safeGet(sessionStorage, legacyKey)), 0);
      if (session) return session;
    }
    return null;
  }

  async function load(key, legacyKeys = []) {
    key = String(key || '').trim();
    if (!key) return null;
    const candidates = [
      memory.get(key) || null,
      readStorageRecord(localStorage, key),
      readStorageRecord(sessionStorage, key),
      readLegacyRecord(key, legacyKeys)
    ].filter(Boolean);
    try {
      const durable = normalizeRecord(key, await idbGet(key));
      if (durable) candidates.push(durable);
    } catch (error) {
      console.warn('JEMMO preparación: IndexedDB no disponible para lectura.', error);
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    const latest = candidates[0];
    memory.set(key, latest);
    const serialized = JSON.stringify(latest);
    safeSet(sessionStorage, PREFIX + key, serialized);
    safeSet(localStorage, PREFIX + key, serialized);
    idbPut(latest).catch(() => {});
    return typeof structuredClone === 'function' ? structuredClone(latest.data) : JSON.parse(JSON.stringify(latest.data));
  }

  function save(key, data) {
    key = String(key || '').trim();
    if (!key || !data || typeof data !== 'object') return Promise.resolve({ ok: false, reason: 'invalid' });
    const record = {
      key,
      data: JSON.parse(JSON.stringify(data)),
      updatedAt: Date.now()
    };
    memory.set(key, record);
    const serialized = JSON.stringify(record);
    const sessionSaved = safeSet(sessionStorage, PREFIX + key, serialized);
    const localSaved = safeSet(localStorage, PREFIX + key, serialized);
    return idbPut(record)
      .then(() => ({ ok: true, durable: true, localSaved, sessionSaved, updatedAt: record.updatedAt }))
      .catch(error => {
        console.warn('JEMMO preparación: guardado duradero no disponible.', error);
        return { ok: localSaved || sessionSaved, durable: false, localSaved, sessionSaved, updatedAt: record.updatedAt };
      });
  }

  window.JemmoPrepStorage = Object.freeze({ version: VERSION, load, save });
})();
