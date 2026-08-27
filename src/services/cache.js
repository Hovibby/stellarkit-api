const NodeCache = require("node-cache");

class CacheService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 5, checkperiod: 10 });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    if (ttl !== undefined) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  del(key) {
    this.cache.del(key);
  }

  flush() {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }
}

const cacheService = new CacheService();
module.exports = cacheService;
