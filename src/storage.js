// Persistência simples em arquivos JSON dentro de ./data
const fs = require('fs');
const path = require('path');
const defaultStores = require('./defaultStores');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
fs.mkdirSync(PROFILES_DIR, { recursive: true });

const defaults = {
  stores: defaultStores,
  list: [],
  settings: { headless: true, maxResults: 8, minMatch: 0.6, delayMs: 1200 },
  sessions: {}, // { storeId: { connectedAt } }
  results: {}, // { itemId: { storeId: { candidates, selected, manualPrice, error, at } } }
};

function file(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch {
    return structuredClone(defaults[name]);
  }
}

function write(name, value) {
  fs.writeFileSync(file(name), JSON.stringify(value, null, 2));
  return value;
}

function profileDir(storeId) {
  return path.join(PROFILES_DIR, storeId.replace(/[^a-z0-9_-]/gi, '_'));
}

module.exports = { read, write, profileDir, DATA_DIR };
