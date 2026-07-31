/* ────────────────────────────────────────────────────────────
   Job storage.

   Photos make a job too big for key/value preferences, so on the
   phone each job is written as its own JSON file in app storage,
   and in the browser it goes to IndexedDB. Same four functions
   either way. Everything is local — nothing leaves the device.
   ──────────────────────────────────────────────────────────── */

import { isNative } from './native.js';

const DIR = 'jobs';
const DB_NAME = 'chimney-inspect';
const STORE = 'jobs';

/* ── IndexedDB (browser) ────────────────────────────────── */

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRun(mode, fn) {
  return idb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

/* ── Public API ─────────────────────────────────────────── */

export async function saveJob(job) {
  job.updatedAt = Date.now();
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: `${DIR}/${job.id}.json`,
      data: JSON.stringify(job),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return job;
  }
  await idbRun('readwrite', (s) => s.put(job));
  return job;
}

export async function getJob(id) {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    try {
      const f = await Filesystem.readFile({
        path: `${DIR}/${id}.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(f.data);
    } catch (e) {
      return null;
    }
  }
  return (await idbRun('readonly', (s) => s.get(id))) || null;
}

export async function listJobs() {
  let jobs = [];
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    try {
      const dir = await Filesystem.readdir({ path: DIR, directory: Directory.Data });
      const names = dir.files.map((f) => (typeof f === 'string' ? f : f.name)).filter((n) => n.endsWith('.json'));
      for (const n of names) {
        try {
          const f = await Filesystem.readFile({
            path: `${DIR}/${n}`,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          });
          jobs.push(JSON.parse(f.data));
        } catch (e) {
          /* skip an unreadable job rather than losing the whole list */
        }
      }
    } catch (e) {
      jobs = [];
    }
  } else {
    jobs = (await idbRun('readonly', (s) => s.getAll())) || [];
  }
  return jobs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function deleteJob(id) {
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    try {
      await Filesystem.deleteFile({ path: `${DIR}/${id}.json`, directory: Directory.Data });
    } catch (e) {
      /* already gone */
    }
    return;
  }
  await idbRun('readwrite', (s) => s.delete(id));
}

/* ── Company settings (small — plain localStorage is fine) ── */

const SETTINGS_KEY = 'aiopro-settings';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaultSettings();
  } catch (e) {
    return defaultSettings();
  }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  return s;
}

function defaultSettings() {
  return {
    company: 'AIO Pro Chimney',
    phone: '',
    email: '',
    address: 'Greater St. Louis, MO',
    license: '',
    logo: null,
  };
}

export function newJob(templateId) {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    templateId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    customer: { name: '', address: '', phone: '' },
    results: {},
    quote: [],
    summary: '',
    done: false,
  };
}
