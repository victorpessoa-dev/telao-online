const createStorage = () => {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
};

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: createStorage(),
  });
}

// Polyfill URL.createObjectURL and URL.revokeObjectURL for test environment
// if they are not already available (e.g., jsdom doesn't fully implement them)
if (typeof globalThis.URL.createObjectURL !== "function") {
  globalThis.URL = class URL {
    static _urls = new Map();
    static _revoked = new Set();

    constructor(_url, _options) {
      this._url = _url;
      this._options = _options;
    }

    static createObjectURL(blob) {
      const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const url = `blob:${uuid}`;
      this._urls.set(url, blob);
      return url;
    }

    static revokeObjectURL(url) {
      this._revoked.add(url);
      this._urls.delete(url);
    }
  };
}
