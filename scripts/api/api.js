import { API_URL, TMDB_API_KEY } from '../core/config.js';
import { normalizeType, wait } from '../utils/utils.js';
import { getCached, setCached } from './cache.js';

const buildUrl = (path, params = {}) => {
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const fetchWithRetry = async (url, options = {}, retries = 3, attempt = 0) => {
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (attempt >= retries - 1) {
      throw new Error(`Request failed ${response.status}`);
    }
  } catch (error) {
    if (attempt >= retries - 1) {
      throw error;
    }
  }

  const delay = Math.min(1000 * 2 ** attempt, 8000);
  await wait(delay);
  return fetchWithRetry(url, options, retries, attempt + 1);
};

export const fetchTMDB = async (path, page = 1, query = '') => {
  const params = { page, query: query || undefined };
  const cached = getCached(path, params);
  if (cached) return cached;

  const response = await fetchWithRetry(buildUrl(path, params));
  const data = await response.json();

  let results = data.results || [];
  if (path.includes('/trending/')) {
    results = results.filter((item) => item.media_type === 'movie' || item.media_type === 'tv');
  }

  const result = {
    results: results.map((item) => ({
      ...item,
      media_type: item.media_type || 'movie'
    })),
    totalPages: data.total_pages || 1
  };

  setCached(path, params, result);
  return result;
};

export const fetchMediaDetails = async (type, id) => {
  const path = `/${normalizeType(type)}/${id}`;
  const params = { append_to_response: 'release_dates,content_ratings' };
  const cached = getCached(path, params);
  if (cached) return cached;

  const response = await fetchWithRetry(buildUrl(path, params));
  const data = await response.json();
  setCached(path, params, data);
  return data;
};

export const fetchMediaCredits = async (type, id) => {
  const path = `/${normalizeType(type)}/${id}/credits`;
  const cached = getCached(path);
  if (cached) return cached;

  const response = await fetchWithRetry(buildUrl(path));
  const data = await response.json();
  setCached(path, {}, data);
  return data;
};

export const fetchMediaVideos = async (type, id) => {
  try {
    const response = await fetchWithRetry(buildUrl(`/${normalizeType(type)}/${id}/videos`), {}, 2);
    const data = await response.json();
    if (data.results?.length) {
      const match = data.results.find(
        (video) =>
          video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
      );
      return match ? match.key : null;
    }
  } catch (error) {
    console.warn('Trailer request failed', error);
  }

  return null;
};

