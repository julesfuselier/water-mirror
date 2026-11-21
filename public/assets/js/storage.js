// localStorage wrapper that never throws (private mode, disabled storage...).

export const storage = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  },
  getJSON(key, fallback = null) {
    try {
      return JSON.parse(this.get(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  },
};
