export const TMDB_API_KEY = '37ec0b0f9f14409ef6f559739272b5f1';
export const API_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
export const DEBOUNCE_DELAY = 300;
export const CAROUSEL_INTERVAL_MS = 7000;

export const DISCOVERY_CONFIG = {
  home: { title: 'Home', endpoint: null, type: null },
  now_playing: { title: 'Now Playing Movies', endpoint: '/movie/now_playing', type: 'movie' },
  trending_weekly: { title: 'Trending This Week', endpoint: '/trending/all/week', type: 'multi' },
  top_rated: { title: 'Top Rated Movies', endpoint: '/movie/top_rated', type: 'movie' }
};

