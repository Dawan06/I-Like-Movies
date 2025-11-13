/**
 * API response caching with sessionStorage and TTL
 */

const CACHE_PREFIX = 'tmdb_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (endpoint, params = {}) => {
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return `${CACHE_PREFIX}${endpoint}${paramString ? `?${paramString}` : ''}`;
};

const isExpired = (cached) => {
  if (!cached || !cached.timestamp) return true;
  return Date.now() - cached.timestamp > CACHE_TTL;
};

export const getCached = (endpoint, params = {}) => {
  try {
    const key = getCacheKey(endpoint, params);
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (isExpired(parsed)) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
};

export const setCached = (endpoint, params = {}, data) => {
  try {
    const key = getCacheKey(endpoint, params);
    const cached = {
      data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
};

export const clearCache = () => {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
};

