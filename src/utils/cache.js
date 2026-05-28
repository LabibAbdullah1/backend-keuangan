import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// 1. DRIVER 1: IN-MEMORY CACHE (Graceful Fallback)
// ============================================================
class InMemoryCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlInSeconds = 300) {
    const expiresAt = Date.now() + ttlInSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    return true;
  }

  get(key) {
    const cachedItem = this.cache.get(key);
    if (!cachedItem) return null;
    if (Date.now() > cachedItem.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cachedItem.value;
  }

  del(key) {
    return this.cache.delete(key);
  }

  deleteByPrefix(prefixPattern) {
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefixPattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  clear() {
    this.cache.clear();
    return true;
  }
}

// ============================================================
// 2. BOOTSTRAP DRIVERS & REDIS INITIALIZATION
// ============================================================
const localCache = new InMemoryCache();
let redisClient = null;
let useRedis = false;

const redisEnabled = process.env.REDIS_ENABLED === 'true';

if (redisEnabled) {
  try {
    const socketPath = process.env.REDIS_SOCKET_PATH;
    const redisConfig = {
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true, // Jangan memblokir startup Express
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Cache Engine] Gagal tersambung ke Redis cPanel setelah 3 percobaan. Menggunakan fallback In-Memory Cache.');
          return null; // Hentikan percobaan rekoneksi
        }
        return Math.min(times * 150, 2000);
      }
    };

    // Jika REDIS_SOCKET_PATH ditentukan di .env, sambungkan lewat Unix Socket (.sock)
    if (socketPath) {
      redisConfig.path = socketPath;
      console.log(`[Cache Engine] Menyiapkan inisialisasi Redis via Unix Socket: ${socketPath}`);
    } else {
      redisConfig.host = process.env.REDIS_HOST || '127.0.0.1';
      redisConfig.port = parseInt(process.env.REDIS_PORT || '6379', 10);
      console.log(`[Cache Engine] Menyiapkan inisialisasi Redis via TCP: ${redisConfig.host}:${redisConfig.port}`);
    }

    redisClient = new Redis(redisConfig);

    // Lakukan koneksi asinkronus awal secara aman
    redisClient.connect()
      .then(() => {
        useRedis = true;
        console.log('============================================================');
        if (socketPath) {
          console.log(`[Cache Engine] Terkoneksi aman ke Redis via Unix Socket: ${socketPath}`);
        } else {
          console.log(`[Cache Engine] Terkoneksi aman ke Redis via TCP: ${redisConfig.host}:${redisConfig.port}`);
        }
        console.log('[Cache Engine] Caching berkinerja tinggi aktif!');
        console.log('============================================================');
      })
      .catch((err) => {
        useRedis = false;
        console.warn('[Cache Engine Warning] Gagal koneksi awal ke Redis. Beralih ke In-Memory Cache:', err.message);
      });

    // Dengarkan event error untuk mencegah uncaught exception crash
    redisClient.on('error', (err) => {
      if (useRedis) {
        console.warn('[Cache Engine Error] Redis terputus mendadak. Mengaktifkan fallback In-Memory Cache.');
        useRedis = false;
      }
    });

  } catch (error) {
    console.error('[Cache Engine Error] Gagal menginisialisasi driver Redis:', error.message);
    useRedis = false;
  }
} else {
  console.log('[Cache Engine] Redis dinonaktifkan di .env. Caching menggunakan In-Memory Cache.');
}

// ============================================================
// 3. MASTER INTERFACE (Singleton wrapper)
// ============================================================
const cacheEngine = {
  /**
   * Mengambil data dari cache
   */
  async get(key) {
    if (useRedis && redisClient) {
      try {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        return null;
      } catch (err) {
        console.warn('[Cache Engine] Gagal membaca Redis. Membaca dari fallback In-Memory.');
        return localCache.get(key);
      }
    }
    return localCache.get(key);
  },

  /**
   * Menyimpan data ke dalam cache
   */
  async set(key, value, ttlInSeconds = 300) {
    if (useRedis && redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlInSeconds);
        return true;
      } catch (err) {
        console.warn('[Cache Engine] Gagal menulis ke Redis. Menulis ke fallback In-Memory.');
        return localCache.set(key, value, ttlInSeconds);
      }
    }
    return localCache.set(key, value, ttlInSeconds);
  },

  /**
   * Menghapus cache berdasarkan key tertentu
   */
  async del(key) {
    if (useRedis && redisClient) {
      try {
        await redisClient.del(key);
        return true;
      } catch (err) {
        return localCache.del(key);
      }
    }
    return localCache.del(key);
  },

  /**
   * Menghapus sekelompok cache yang memiliki awalan kunci tertentu
   */
  async deleteByPrefix(prefixPattern) {
    if (useRedis && redisClient) {
      try {
        const keys = await redisClient.keys(`${prefixPattern}*`);
        if (keys && keys.length > 0) {
          await redisClient.del(keys);
        }
        return keys.length;
      } catch (err) {
        console.warn('[Cache Engine] Gagal menghapus kunci Redis berdasarkan pola. Menghapus dari In-Memory.');
        return localCache.deleteByPrefix(prefixPattern);
      }
    }
    return localCache.deleteByPrefix(prefixPattern);
  },

  /**
   * Mengosongkan seluruh cache database
   */
  async clear() {
    if (useRedis && redisClient) {
      try {
        await redisClient.flushdb();
        console.log('[Cache Engine] Database Redis berhasil dikosongkan.');
        return true;
      } catch (err) {
        return localCache.clear();
      }
    }
    return localCache.clear();
  }
};

export default cacheEngine;
